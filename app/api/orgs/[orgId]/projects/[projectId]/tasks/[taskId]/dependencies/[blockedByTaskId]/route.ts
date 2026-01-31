import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string; blockedByTaskId: string }> }
) {
  try {
    const { orgId, projectId, taskId, blockedByTaskId } = await params;
    const user = await requireAuth();
    const member = await requireProjectAccess(orgId, projectId, user.id);

    if (member.role === 'MEMBER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { orgId: true } } },
    });

    if (!task || task.project.orgId !== orgId || task.projectId !== projectId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await prisma.taskDependency.delete({
      where: {
        taskId_blockedByTaskId: { taskId, blockedByTaskId },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Access denied' || error.message === 'Project not found') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Failed to remove dependency' }, { status: 500 });
  }
}
