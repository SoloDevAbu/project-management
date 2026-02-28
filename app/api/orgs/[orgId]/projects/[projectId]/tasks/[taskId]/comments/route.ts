import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireAuth, requireProjectAccess } from '@/lib/auth';

const createCommentSchema = z.object({
    content: z.string().min(1, 'Comment cannot be empty'),
});

export async function GET(
    request: Request,
    { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string }> }
) {
    try {
        const { orgId, projectId, taskId } = await params;
        const user = await requireAuth();
        await requireProjectAccess(orgId, projectId, user.id);

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { project: { select: { orgId: true } } },
        });

        if (!task || task.project.orgId !== orgId || task.projectId !== projectId) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const comments = await prisma.taskComment.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({ comments });
    } catch (error) {
        if (error instanceof Error && error.message === 'Access denied') {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ orgId: string; projectId: string; taskId: string }> }
) {
    try {
        const { orgId, projectId, taskId } = await params;
        const user = await requireAuth();
        await requireProjectAccess(orgId, projectId, user.id);

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { project: { select: { orgId: true } } },
        });

        if (!task || task.project.orgId !== orgId || task.projectId !== projectId) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        const body = await request.json();
        const { content } = createCommentSchema.parse(body);

        const comment = await prisma.taskComment.create({
            data: {
                taskId,
                userId: user.id,
                content,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({ comment }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
        }
        if (error instanceof Error) {
            if (error.message === 'Access denied' || error.message === 'Project not found') {
                return NextResponse.json({ error: error.message }, { status: 403 });
            }
        }
        return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }
}
