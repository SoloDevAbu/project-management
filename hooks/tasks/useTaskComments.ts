import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface TaskComment {
    id: string;
    taskId: string;
    userId: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        email: string;
        name: string | null;
    };
}

interface CommentsPage {
    comments: TaskComment[];
    nextCursor: string | null;
}

export function useTaskComments(
    orgId: string | null,
    projectId: string | null,
    taskId: string | null
) {
    return useInfiniteQuery({
        queryKey: ['taskComments', orgId, projectId, taskId],
        queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
            if (!orgId || !projectId || !taskId)
                return { comments: [], nextCursor: null } as CommentsPage;
            const params = new URLSearchParams({ limit: '10' });
            if (pageParam) params.set('cursor', pageParam);
            const { data } = await api.get<CommentsPage>(
                `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/comments?${params.toString()}`
            );
            return data;
        },
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        enabled: !!orgId && !!projectId && !!taskId,
        refetchInterval: 10000,
    });
}

export function useAddTaskComment(
    orgId: string,
    projectId: string,
    taskId: string
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (content: string) => {
            const { data } = await api.post<{ comment: TaskComment }>(
                `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/comments`,
                { content }
            );
            return data.comment;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['taskComments', orgId, projectId, taskId],
            });
        },
    });
}

export function useDeleteTaskComment(
    orgId: string,
    projectId: string,
    taskId: string
) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (commentId: string) => {
            await api.delete(
                `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`
            );
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['taskComments', orgId, projectId, taskId],
            });
        },
    });
}
