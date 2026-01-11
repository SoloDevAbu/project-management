import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgRole } from '@/lib/auth';

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['MAINTAINER', 'MEMBER']),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const user = await requireAuth();
    await requireOrgRole(orgId, user.id, ['ADMIN']);

    const body = await request.json();
    const data = inviteMemberSchema.parse(body);

    const targetUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (targetUser) {
      const existingMember = await prisma.orgMember.findUnique({
        where: {
          orgId_userId: {
            orgId,
            userId: targetUser.id,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 409 }
        );
      }

      const member = await prisma.orgMember.create({
        data: {
          orgId,
          userId: targetUser.id,
          role: data.role,
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

      return NextResponse.json({ member, added: true }, { status: 201 });
    }

    const existingInvite = await prisma.orgInvite.findFirst({
      where: {
        orgId,
        email: data.email,
        status: 'PENDING',
      },
    });

    if (existingInvite) {
      const now = new Date();
      if (existingInvite.expiresAt > now) {
        return NextResponse.json(
          { error: 'An invite is already pending for this email' },
          { status: 409 }
        );
      }
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 2);

    const invite = await prisma.orgInvite.create({
      data: {
        orgId,
        email: data.email,
        role: data.role,
        token,
        expiresAt,
        invitedBy: user.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ invite, added: false }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      if (error.message === 'Access denied' || error.message === 'Insufficient permissions') {
        return NextResponse.json(
          { error: 'Only admins can invite members' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to invite member' },
      { status: 500 }
    );
  }
}
