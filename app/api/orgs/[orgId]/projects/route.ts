import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess } from '@/lib/auth';

const createProjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  parentId: z.string().uuid().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  budgetTotal: z.number().optional(),
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
    const parentId = searchParams.get('parent');

    const projects = await prisma.project.findMany({
      where: {
        orgId,
        parentId: parentId || null,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            children: true,
            tasks: true,
            teamLinks: true,
            userLinks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch projects' },
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
    const data = createProjectSchema.parse(body);

    const existingProject = await prisma.project.findFirst({
      where: {
        orgId,
        code: data.code,
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: 'Project with this code already exists' },
        { status: 400 }
      );
    }

    if (data.parentId) {
      const parent = await prisma.project.findUnique({
        where: { id: data.parentId },
      });

      if (!parent || parent.orgId !== orgId) {
        return NextResponse.json(
          { error: 'Invalid parent project' },
          { status: 400 }
        );
      }
    }

    const project = await prisma.project.create({
      data: {
        orgId,
        name: data.name,
        code: data.code,
        description: data.description,
        parentId: data.parentId,
        status: data.status || 'PLANNED',
        startDate: data.startDate ? new Date(data.startDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        budgetTotal: data.budgetTotal ? data.budgetTotal : null,
        currency: data.currency,
        createdBy: user.id,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return NextResponse.json({ project }, { status: 201 });
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
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}

