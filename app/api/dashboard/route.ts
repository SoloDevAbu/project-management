import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
    try {
        const user = await requireAuth();

        // Get all orgs the user belongs to with their role
        const memberships = await prisma.orgMember.findMany({
            where: { userId: user.id },
            include: {
                org: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        _count: {
                            select: {
                                members: true,
                                projects: true,
                            },
                        },
                    },
                },
            },
        });

        // For each org, count pending tasks (not DONE, not ARCHIVED) across all projects
        const orgStats = await Promise.all(
            memberships.map(async (membership) => {
                const pendingTaskCount = await prisma.task.count({
                    where: {
                        project: {
                            orgId: membership.orgId,
                        },
                        status: {
                            notIn: ['DONE', 'ARCHIVED'],
                        },
                    },
                });

                return {
                    orgId: membership.org.id,
                    orgName: membership.org.name,
                    orgStatus: membership.org.status,
                    userRole: membership.role,
                    memberCount: membership.org._count.members,
                    projectCount: membership.org._count.projects,
                    pendingTaskCount,
                };
            })
        );

        const totalOrganizations = memberships.length;
        const totalPendingTasks = orgStats.reduce(
            (sum, org) => sum + org.pendingTaskCount,
            0
        );

        return NextResponse.json({
            totalOrganizations,
            totalPendingTasks,
            organizations: orgStats,
        });
    } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}
