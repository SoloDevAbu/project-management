import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

const createOrgSchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();

    const orgs = await prisma.orgMember.findMany({
      where: { userId: user.id },
      include: {
        org: {
          include: {
            members: {
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
          },
        },
      },
    });

    return NextResponse.json({ orgs: orgs.map((om) => om.org) });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const data = createOrgSchema.parse(body);

    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name: data.name,
          legalName: data.legalName,
          country: data.country,
          address: data.address,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          createdBy: user.id,
        },
      });

      await tx.orgMember.create({
        data: {
          orgId: newOrg.id,
          userId: user.id,
          role: 'ADMIN',
        },
      });

      return newOrg;
    });

    return NextResponse.json({ org }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}

