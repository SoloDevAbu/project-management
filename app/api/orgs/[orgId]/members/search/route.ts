import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess } from '@/lib/auth';

const searchUserSchema = z.object({
  email: z.string().email(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const body = await request.json();
    const data = searchUserSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ user: null, exists: false });
    }

    const existingMember = await prisma.orgMember.findUnique({
      where: {
        orgId_userId: {
          orgId,
          userId: targetUser.id,
        },
      },
    });

    return NextResponse.json({
      user: targetUser,
      exists: true,
      isMember: !!existingMember,
      memberRole: existingMember?.role || null,
    });
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
      { error: 'Failed to search user' },
      { status: 500 }
    );
  }
}
