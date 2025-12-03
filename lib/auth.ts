import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
  });
}

export async function getOrgMember(orgId: string, userId: string) {
  return prisma.orgMember.findUnique({
    where: {
      orgId_userId: {
        orgId,
        userId,
      },
    },
  });
}

export async function requireAuth() {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function requireOrgAccess(orgId: string, userId: string) {
  const member = await getOrgMember(orgId, userId);
  
  if (!member) {
    throw new Error('Access denied');
  }

  return member;
}

export async function requireOrgRole(
  orgId: string,
  userId: string,
  roles: Array<'ADMIN' | 'MAINTAINER' | 'MEMBER'>
) {
  const member = await requireOrgAccess(orgId, userId);
  
  if (!roles.includes(member.role)) {
    throw new Error('Insufficient permissions');
  }

  return member;
}

