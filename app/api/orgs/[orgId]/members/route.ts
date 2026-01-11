import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess, requireOrgRole } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN', 'MAINTAINER']);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const [members, total] = await Promise.all([
      prisma.orgMember.findMany({
        where: { orgId },
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
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.orgMember.count({
        where: { orgId },
      }),
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
      if (error.message === 'Insufficient permissions') {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
