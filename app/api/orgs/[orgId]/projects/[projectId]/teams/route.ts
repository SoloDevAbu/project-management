import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess, requireOrgRole } from '@/lib/auth';

const assignTeamSchema = z.object({
  teamId: z.string().uuid(),
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
      select: { orgId: true },
    });

    if (!project || project.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const teamLinks = await prisma.projectTeamLink.findMany({
      where: { projectId },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            createdAt: true,
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
      orderBy: {
        team: {
          name: 'asc',
        },
      },
    });

    return NextResponse.json({
      teams: teamLinks.map((link) => link.team),
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch project teams' },
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
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

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

    const body = await request.json();
    const data = assignTeamSchema.parse(body);

    const team = await prisma.team.findUnique({
      where: { id: data.teamId },
      select: { orgId: true },
    });

    if (!team || team.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const existingLink = await prisma.projectTeamLink.findUnique({
      where: {
        projectId_teamId: {
          projectId,
          teamId: data.teamId,
        },
      },
    });

    if (existingLink) {
      return NextResponse.json(
        { error: 'Team is already assigned to this project' },
        { status: 409 }
      );
    }

    await prisma.projectTeamLink.create({
      data: {
        projectId,
        teamId: data.teamId,
      },
    });

    const updatedTeam = await prisma.team.findUnique({
      where: { id: data.teamId },
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return NextResponse.json({ team: updatedTeam }, { status: 201 });
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
      { error: 'Failed to assign team to project' },
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

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: 'Team ID is required' },
        { status: 400 }
      );
    }

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

    const teamLink = await prisma.projectTeamLink.findUnique({
      where: {
        projectId_teamId: {
          projectId,
          teamId,
        },
      },
    });

    if (!teamLink) {
      return NextResponse.json(
        { error: 'Team is not assigned to this project' },
        { status: 404 }
      );
    }

    await prisma.projectTeamLink.delete({
      where: {
        projectId_teamId: {
          projectId,
          teamId,
        },
      },
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
      { error: 'Failed to remove team from project' },
      { status: 500 }
    );
  }
}
