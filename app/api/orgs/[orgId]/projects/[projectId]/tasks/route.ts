import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess } from '@/lib/auth';
import type { Prisma } from '@/app/generated/prisma/client';

const createTaskSchema = z.object({
  parentId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE', 'ARCHIVED']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).optional(),
  assigneeUserId: z.string().uuid().optional(),
  reviewerUserId: z.string().uuid().optional(),
  // Allow any non-empty string; we convert to Date and let the DB enforce validity.
  assignmentDt: z.string().optional(),
  startDt: z.string().optional(),
  endDt: z.string().optional(),
  deadlineDt: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const { searchParams } = new URL(request.url);
    const parentTaskId = searchParams.get('parentTaskId');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { orgId: true },
    });

    if (!project || project.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const where: Prisma.TaskWhereInput = {
      projectId,
    };

    if (parentTaskId) {
      where.parentId = parentTaskId;
    } else if (parentTaskId === '') {
      where.parentId = null;
    }

    if (status) {
      where.status = status as Prisma.TaskWhereInput['status'];
    }

    if (assigneeId) {
      where.assigneeUserId = assigneeId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
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
        _count: {
          select: {
            children: true,
            dependencies: true,
            blockingTasks: true,
          },
        },
      },
      orderBy: [
        { priority: 'asc' },
        { deadlineDt: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const body = await request.json();
    const data = createTaskSchema.parse(body);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { orgId: true },
    });

    if (!project || project.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (data.parentId) {
      const parent = await prisma.task.findUnique({
        where: { id: data.parentId },
        select: { projectId: true },
      });

      if (!parent || parent.projectId !== projectId) {
        return NextResponse.json(
          { error: 'Invalid parent task' },
          { status: 400 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        projectId,
        parentId: data.parentId,
        title: data.title,
        description: data.description,
        type: data.type || 'TASK',
        status: data.status || 'BACKLOG',
        priority: data.priority || 'P4',
        assigneeUserId: data.assigneeUserId,
        reviewerUserId: data.reviewerUserId,
        assignmentDt: data.assignmentDt ? new Date(data.assignmentDt) : null,
        startDt: data.startDt ? new Date(data.startDt) : null,
        endDt: data.endDt ? new Date(data.endDt) : null,
        deadlineDt: data.deadlineDt ? new Date(data.deadlineDt) : null,
        createdBy: user.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
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
    });

    return NextResponse.json({ task }, { status: 201 });
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
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
