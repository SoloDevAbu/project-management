import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = await requireAuth();

        const { searchParams } = new URL(request.url);
        const sortBy = searchParams.get('sortBy');
        const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' as const : 'desc' as const;

        // Get all org memberships for the user (to know their role per org)
        const memberships = await prisma.orgMember.findMany({
            where: { userId: user.id },
            select: {
                orgId: true,
                role: true,
            },
        });

        const orgIds = memberships.map((m) => m.orgId);
        const roleMap = Object.fromEntries(
            memberships.map((m) => [m.orgId, m.role])
        );

        // Fetch all pending tasks across all orgs the user belongs to
        const tasks = await prisma.task.findMany({
            where: {
                project: {
                    orgId: { in: orgIds },
                },
                status: {
                    notIn: ['DONE', 'ARCHIVED'],
                },
            },
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
            orderBy:
                sortBy === 'priority'
                    ? { priority: sortOrder }
                    : sortBy === 'deadline'
                        ? [
                            { deadlineDt: sortOrder },
                            { createdAt: 'desc' },
                        ]
                        : { createdAt: sortOrder },
        });

        // Attach user's role per org to each task
        const tasksWithRole = tasks.map((task) => ({
            ...task,
            userRole: roleMap[task.project.orgId] || 'MEMBER',
        }));

        return NextResponse.json({ tasks: tasksWithRole });
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
