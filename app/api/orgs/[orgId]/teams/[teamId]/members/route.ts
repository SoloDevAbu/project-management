import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess, requireOrgRole } from '@/lib/auth';

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.string().optional(),
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
    });

    if (!team || team.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const where: any = {
      teamId,
    };

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.user = { name: sortOrder };
    } else if (sortBy === 'role') {
      orderBy.role = sortOrder;
    } else {
      orderBy.joinedAt = 'desc';
    }

    const [members, total] = await Promise.all([
      prisma.teamMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.teamMember.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      members,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
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
      { error: 'Failed to fetch team members' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string; teamId: string }> }
) {
  try {
    const { orgId, teamId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const body = await request.json();
    const data = addMemberSchema.parse(body);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const orgMember = await prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: data.userId,
        },
      },
    });

    if (!orgMember) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 400 }
      );
    }

    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: data.userId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this team' },
        { status: 409 }
      );
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        userId: data.userId,
        role: data.role || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ member }, { status: 201 });
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
      { error: 'Failed to add team member' },
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.orgId !== orgId) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const member = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Team member not found' },
        { status: 404 }
      );
    }

    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId,
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
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
