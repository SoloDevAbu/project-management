import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string; commentId: string }> }
) {
    try {
        const { orgId, projectId, taskId, commentId } = await params;
        const user = await requireAuth();
        const member = await requireProjectAccess(orgId, projectId, user.id);

        const comment = await prisma.taskComment.findUnique({
            where: { id: commentId },
            include: {
                task: {
                    include: { project: { select: { orgId: true } } },
                },
            },
        });

        if (
            !comment ||
            comment.task.project.orgId !== orgId ||
            comment.task.projectId !== projectId ||
            comment.taskId !== taskId
        ) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        // Only the comment author or an admin/maintainer can delete
        if (comment.userId !== user.id && member.role === 'MEMBER') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        await prisma.taskComment.delete({ where: { id: commentId } });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'Access denied' || error.message === 'Project not found') {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }
        }
        return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }
}
