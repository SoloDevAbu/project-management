import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, requireOrgAccess } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string; projectId: string }> }
) {
  try {
    const { orgId, projectId } = await params;
    const user = await requireAuth();
    await requireOrgAccess(orgId, user.id);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 10;
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'timestamp';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const action = searchParams.get('action');
    const actorId = searchParams.get('actorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {
      orgId: orgId || null,
      entityType: 'Project',
      entityId: projectId,
    };

    if (action) {
      whereClause.action = action;
    }

    if (actorId) {
      whereClause.actorUserId = actorId;
    }

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) {
        whereClause.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.timestamp.lte = new Date(endDate);
      }
    }

    if (search) {
      whereClause.actor = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const orderByClause: any = {};
    if (sortBy === 'timestamp') {
      orderByClause.timestamp = sortOrder;
    } else if (sortBy === 'actor') {
      orderByClause.actor = { name: sortOrder };
    } else if (sortBy === 'action') {
      orderByClause.action = sortOrder;
    } else {
      orderByClause.timestamp = 'desc';
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: orderByClause,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      auditLogs,
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
      if (error.message === 'Access denied' || error.message === 'Insufficient permissions') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
