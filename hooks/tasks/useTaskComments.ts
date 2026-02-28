import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useTaskComments(
    orgId: string | null,
    projectId: string | null,
    taskId: string | null
) {
    return useQuery({
        queryKey: ['taskComments', orgId, projectId, taskId],
        queryFn: async () => {
            if (!orgId || !projectId || !taskId) return [];
            const { data } = await api.get<{ comments: TaskComment[] }>(
                `/orgs/${orgId}/projects/${projectId}/tasks/${taskId}/comments`
            );
            return data.comments;
        },
        enabled: !!orgId && !!projectId && !!taskId,
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
