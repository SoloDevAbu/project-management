import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess, requireOrgRole } from '@/lib/auth';

const updateTeamSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  try {
    const { orgId, teamId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            projectLinks: true,
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    if (team.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ team });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Access denied') {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  try {
    const { orgId, teamId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const body = await request.json();
    const data = updateTeamSchema.parse(body);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    if (data.name && data.name !== team.name) {
      const existingTeam = await prisma.team.findUnique({
        where: {
          orgId_name: {
            orgId,
            name: data.name,
          },
        },
      });

      if (existingTeam) {
        return NextResponse.json(
          { error: 'Team name already exists in this organization' },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        description: data.description,
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
            projectLinks: true,
          },
        },
      },
    });

    return NextResponse.json({ team: updated });
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
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  try {
    const { orgId, teamId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    await prisma.team.delete({
      where: { id: teamId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
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
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
