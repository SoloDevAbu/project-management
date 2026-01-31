import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';

const schema = z.object({
  assigneeUserId: z.string().uuid().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string }> }
) {
  try {
    const { orgId, projectId, taskId } = await params;
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

    const body = await request.json();
    const { assigneeUserId } = schema.parse(body);

    if (assigneeUserId === task.assigneeUserId) {
      const current = await prisma.task.findUnique({
        where: { id: taskId },
        include: { assignee: { select: { id: true, email: true, name: true } } },
      });
      return NextResponse.json({ task: current });
    }

    await prisma.taskAssigneeTransfer.create({
      data: {
        taskId,
        fromUserId: task.assigneeUserId,
        toUserId: assigneeUserId,
        changedBy: user.id,
      },
    });

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { assigneeUserId },
      include: {
        assignee: { select: { id: true, email: true, name: true } },
        project: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error && (error.message === 'Access denied' || error.message === 'Project not found')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update assignee' }, { status: 500 });
  }
}
