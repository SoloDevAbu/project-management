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
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {
      orgId,
      projectId,
    };

    if (userId) {
      whereClause.userId = userId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    if (search) {
      whereClause.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const orderByClause: any = {};
    if (sortBy === 'date') {
      orderByClause.createdAt = sortOrder;
    } else if (sortBy === 'duration') {
      orderByClause.totalDurationMin = sortOrder;
    } else if (sortBy === 'user') {
      orderByClause.user = { name: sortOrder };
    } else {
      orderByClause.createdAt = 'desc';
    }

    const [workLogs, total] = await Promise.all([
      prisma.workLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
            },
          },
          task: {
            select: {
              id: true,
              title: true,
            },
          },
          segments: {
            orderBy: {
              startDt: 'asc',
            },
          },
        },
        skip,
        take: limit,
        orderBy: orderByClause,
      }),
      prisma.workLog.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      workLogs,
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
    return NextResponse.json({ error: 'Failed to fetch work logs' }, { status: 500 });
  }
}
