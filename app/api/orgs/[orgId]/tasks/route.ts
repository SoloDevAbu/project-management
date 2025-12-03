import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess } from '@/lib/auth';

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE', 'ARCHIVED']).optional(),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).optional(),
  assigneeUserId: z.string().uuid().optional(),
  reviewerUserId: z.string().uuid().optional(),
  assignmentDt: z.string().datetime().optional(),
  startDt: z.string().datetime().optional(),
  endDt: z.string().datetime().optional(),
  deadlineDt: z.string().datetime().optional(),
  budgetAmount: z.number().optional(),
  currency: z.string().default('USD'),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const parentTaskId = searchParams.get('parentTaskId');
    const status = searchParams.get('status');
    const assigneeId = searchParams.get('assigneeId');

    const where: {
      project: { orgId: string };
      projectId?: string;
      parentId?: string | null;
      status?: string;
      assigneeUserId?: string;
    } = {
      project: { orgId },
    };

    if (projectId) where.projectId = projectId;
    if (parentTaskId) where.parentId = parentTaskId;
    else if (parentTaskId === null) where.parentId = null;
    if (status) where.status = status;
    if (assigneeId) where.assigneeUserId = assigneeId;

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
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const body = await request.json();
    const data = createTaskSchema.parse(body);

    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
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
      });

      if (!parent || parent.projectId !== data.projectId) {
        return NextResponse.json(
          { error: 'Invalid parent task' },
          { status: 400 }
        );
      }
    }

    const task = await prisma.task.create({
      data: {
        projectId: data.projectId,
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
        budgetAmount: data.budgetAmount,
        currency: data.currency,
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
        { error: 'Invalid input', details: error.errors },
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

