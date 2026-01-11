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
  startDate: z.string().optional(),
  deadline: z.string().optional(),
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

    const projects = await prisma.project.findMany({
      where: {
        orgId,
        parentId: null,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
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

    const existingProject = await prisma.project.findUnique({
      where: {
        orgId_code: {
          orgId,
          code: data.code,
        },
      },
    });

    if (existingProject) {
      return NextResponse.json(
        { error: 'Project code already exists in this organization' },
        { status: 409 }
      );
    }

    const project = await prisma.project.create({
      data: {
        orgId,
        parentId: data.parentId,
        name: data.name,
        code: data.code,
        description: data.description,
        status: data.status || 'PLANNED',
        startDate: data.startDate ? new Date(data.startDate) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        budgetTotal: data.budgetTotal,
        currency: data.currency || 'USD',
        createdBy: user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
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
