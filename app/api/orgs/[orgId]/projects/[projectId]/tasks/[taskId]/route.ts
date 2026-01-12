import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess } from '@/lib/auth';

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE', 'ARCHIVED']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).optional(),
  assigneeUserId: z.string().uuid().optional().nullable(),
  reviewerUserId: z.string().uuid().optional().nullable(),
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
    await requireOrgAccess(orgId, user.id);

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string }> }
) {
  try {
    const { orgId, projectId, taskId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const body = await request.json();
    const data = updateTaskSchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: {
            orgId: true,
          },
        },
      },
    });

    if (!task || task.project.orgId !== orgId || task.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const updateData: {
      title?: string;
      description?: string;
      type?: string;
      status?: string;
      priority?: string;
      assigneeUserId?: string | null;
      reviewerUserId?: string | null;
      assignmentDt?: Date | null;
      startDt?: Date | null;
      endDt?: Date | null;
      deadlineDt?: Date | null;
    } = {};

    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type) updateData.type = data.type;
    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;

    if (data.assigneeUserId !== undefined) {
      const oldAssignee = task.assigneeUserId;
      updateData.assigneeUserId = data.assigneeUserId;
      
      if (oldAssignee !== data.assigneeUserId) {
        await prisma.taskAssigneeTransfer.create({
          data: {
            taskId,
            fromUserId: oldAssignee,
            toUserId: data.assigneeUserId,
            changedBy: user.id,
          },
        });
      }
    }

    if (data.reviewerUserId !== undefined) {
      const oldReviewer = task.reviewerUserId;
      updateData.reviewerUserId = data.reviewerUserId;
      
      if (oldReviewer !== data.reviewerUserId) {
        await prisma.taskReviewerTransfer.create({
          data: {
            taskId,
            fromUserId: oldReviewer,
            toUserId: data.reviewerUserId,
            changedBy: user.id,
          },
        });
      }
    }

    if (data.assignmentDt !== undefined) {
      updateData.assignmentDt = data.assignmentDt ? new Date(data.assignmentDt) : null;
    }
    if (data.startDt !== undefined) {
      updateData.startDt = data.startDt ? new Date(data.startDt) : null;
    }
    if (data.endDt !== undefined) {
      updateData.endDt = data.endDt ? new Date(data.endDt) : null;
    }
    if (data.deadlineDt !== undefined) {
      updateData.deadlineDt = data.deadlineDt ? new Date(data.deadlineDt) : null;
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json({ task: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}
