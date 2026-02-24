import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess, requireProjectAccess } from '@/lib/auth';

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE', 'ARCHIVED']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).optional(),
  assignmentDt: z.string().datetime().optional().nullable(),
  startDt: z.string().datetime().optional().nullable(),
  endDt: z.string().datetime().optional().nullable(),
  deadlineDt: z.string().datetime().optional().nullable(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string }> }
) {
  try {
    const { orgId, projectId, taskId } = await params;
    const user = await requireAuth();
    await requireProjectAccess(orgId, projectId, user.id);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            orgId: true,
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
          },
        },
        children: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
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
        dependencies: {
          include: {
            blockedByTask: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        assigneeTransfers: {
          orderBy: {
            timestamp: 'desc',
          },
        },
        reviewerTransfers: {
          orderBy: {
            timestamp: 'desc',
          },
        },
        tags: true,
        workLogs: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            segments: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    if (task.project.orgId !== orgId || task.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

const MEMBER_EDITABLE_KEYS = ['status', 'startDt', 'endDt', 'deadlineDt'] as const;

function toDateOrNull(v: string | null | undefined): Date | null {
  return v ? new Date(v) : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string }> }
) {
  try {
    const { orgId, projectId, taskId } = await params;
    const user = await requireAuth();
    const member = await requireProjectAccess(orgId, projectId, user.id);

    const body = await request.json();
    const data = updateTaskSchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { orgId: true } } },
    });

    if (!task || task.project.orgId !== orgId || task.projectId !== projectId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const isMember = member.role === 'MEMBER';
    if (isMember) {
      const canEdit = task.assigneeUserId === user.id || task.reviewerUserId === user.id;
      if (!canEdit) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (isMember) {
      for (const key of MEMBER_EDITABLE_KEYS) {
        const v = data[key];
        if (v !== undefined) {
          updateData[key] = key.endsWith('Dt') ? toDateOrNull(v) : v;
        }
      }
    } else {
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.assignmentDt !== undefined) updateData.assignmentDt = toDateOrNull(data.assignmentDt);
      if (data.startDt !== undefined) updateData.startDt = toDateOrNull(data.startDt);
      if (data.endDt !== undefined) updateData.endDt = toDateOrNull(data.endDt);
      if (data.deadlineDt !== undefined) updateData.deadlineDt = toDateOrNull(data.deadlineDt);
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData as Parameters<typeof prisma.task.update>[0]['data'],
    });

    // Auto-create WorkLog if status changed to DONE
    if (updateData.status === 'DONE' && task.status !== 'DONE') {
      const now = new Date();
      let durationMin = 1;
      let startDtForLog = now;

      if (updated.startDt) {
        const diffMs = now.getTime() - updated.startDt.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins > 0) {
          durationMin = diffMins;
          startDtForLog = updated.startDt;
        }
      } else {
        startDtForLog = new Date(now.getTime() - 60000); // 1 minute ago
      }

      await prisma.workLog.create({
        data: {
          orgId,
          userId: user.id,
          createdBy: user.id,
          projectId,
          taskId,
          totalDurationMin: durationMin,
          segments: {
            create: [
              {
                startDt: startDtForLog,
                endDt: now,
                durationMin: durationMin,
                comment: 'Autogenerated upon task completion',
              },
            ],
          },
        },
      });
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Access denied') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      if (error.message === 'Project not found') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
