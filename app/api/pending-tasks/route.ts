import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import type { Prisma } from '@/app/generated/prisma/client';

export async function GET(request: Request) {
    try {
        const user = await requireAuth();

        const { searchParams } = new URL(request.url);
        const sortBy = searchParams.get('sortBy');
        const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' as const : 'desc' as const;
        const page = Math.max(1, Number(searchParams.get('page')) || 1);
        const limit = Math.min(Math.max(1, Number(searchParams.get('limit')) || 10), 50);
        const skip = (page - 1) * limit;

        // Get all org memberships for the user (to know their role per org)
        const memberships = await prisma.orgMember.findMany({
            where: { userId: user.id },
            select: {
                orgId: true,
                role: true,
            },
        });

        const roleMap = Object.fromEntries(
            memberships.map((m) => [m.orgId, m.role])
        );

        // Separate org IDs by role
        const adminOrgIds = memberships
            .filter((m) => m.role === 'ADMIN' || m.role === 'MAINTAINER')
            .map((m) => m.orgId);
        const memberOrgIds = memberships
            .filter((m) => m.role === 'MEMBER')
            .map((m) => m.orgId);

        // Build OR conditions:
        // - Admin/Maintainer orgs: see ALL pending tasks
        // - Member orgs: see only tasks assigned to them
        const orConditions: Prisma.TaskWhereInput[] = [];

        if (adminOrgIds.length > 0) {
            orConditions.push({
                project: { orgId: { in: adminOrgIds } },
            });
        }

        if (memberOrgIds.length > 0) {
            orConditions.push({
                project: { orgId: { in: memberOrgIds } },
                assigneeUserId: user.id,
            });
        }

        if (orConditions.length === 0) {
            return NextResponse.json({ tasks: [], total: 0, page: 1, totalPages: 0 });
        }

        const where: Prisma.TaskWhereInput = {
            OR: orConditions,
            status: {
                notIn: ['DONE', 'ARCHIVED'],
            },
        };

        const orderBy: Prisma.TaskOrderByWithRelationInput | Prisma.TaskOrderByWithRelationInput[] =
            sortBy === 'priority'
                ? { priority: sortOrder }
                : sortBy === 'deadline'
                    ? [
                        { deadlineDt: sortOrder },
                        { createdAt: 'desc' },
                    ]
                    : { createdAt: sortOrder };

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where,
                include: {
                    project: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            orgId: true,
                            org: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    assignee: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                    reviewer: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
                orderBy,
                skip,
                take: limit,
            }),
            prisma.task.count({ where }),
        ]);

        const totalPages = Math.ceil(total / limit);

        // Attach user's role per org to each task
        const tasksWithRole = tasks.map((task) => ({
            ...task,
            userRole: roleMap[task.project.orgId] || 'MEMBER',
        }));

        return NextResponse.json({ tasks: tasksWithRole, total, page, totalPages });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch pending tasks' },
            { status: 500 }
        );
    }
}
