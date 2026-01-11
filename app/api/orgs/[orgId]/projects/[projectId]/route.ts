import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess, requireOrgRole } from '@/lib/auth';

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  currency: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
            deadline: true,
          },
        },
        tasks: {
          include: {
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
        },
        teamLinks: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        userLinks: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            children: true,
            tasks: true,
            workLogs: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const body = await request.json();
    const data = updateProjectSchema.parse(body);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const updateData: {
      name?: string;
      code?: string;
      description?: string;
      status?: 'PLANNED' | 'IN_PROGRESS' | 'HOLD' | 'COMPLETED' | 'CANCELLED';
      startDate?: Date | null;
      deadline?: Date | null;
      currency?: string;
    } = {};

    if (data.name) updateData.name = data.name;
    if (data.code) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.deadline) updateData.deadline = new Date(data.deadline);
    if (data.currency) updateData.currency = data.currency;

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    return NextResponse.json({ project: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Access denied') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
      if (error.message === 'Insufficient permissions') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { orgId: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ message: 'Project deleted successfully' }, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Access denied' || error.message === 'Insufficient permissions') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}
