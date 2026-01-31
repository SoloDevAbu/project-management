import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';

const schema = z.object({
  blockedByTaskId: z.string().uuid(),
});

export async function POST(
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
    const { blockedByTaskId } = schema.parse(body);

    if (blockedByTaskId === taskId) {
      return NextResponse.json(
        { error: 'Task cannot block itself' },
        { status: 400 }
      );
    }

    const blockingTask = await prisma.task.findUnique({
      where: { id: blockedByTaskId },
      include: { project: { select: { orgId: true } } },
    });

    if (!blockingTask || blockingTask.project.orgId !== orgId || blockingTask.projectId !== projectId) {
      return NextResponse.json({ error: 'Blocking task not found in this project' }, { status: 400 });
    }

    await prisma.taskDependency.create({
      data: { taskId, blockedByTaskId },
    });

    const dependency = await prisma.taskDependency.findUnique({
      where: { taskId_blockedByTaskId: { taskId, blockedByTaskId } },
      include: {
        blockedByTask: { select: { id: true, title: true, status: true } },
      },
    });

    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === 'Access denied' || error.message === 'Project not found') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Failed to add dependency' }, { status: 500 });
  }
}
