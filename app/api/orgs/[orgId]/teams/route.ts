import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const teams = await prisma.team.findMany({
      where: { orgId },
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
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ teams });
  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}
