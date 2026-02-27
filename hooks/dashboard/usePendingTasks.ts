import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface PendingTask {
    id: string;
    projectId: string;
    parentId?: string | null;
    title: string;
    description?: string | null;
    type: string;
    status: string;
    priority: string;
    assigneeUserId?: string | null;
    reviewerUserId?: string | null;
    assignmentDt?: string | null;
    startDt?: string | null;
    endDt?: string | null;
    deadlineDt?: string | null;
    createdAt: string;
    updatedAt: string;
    userRole: string;
    project: {
        id: string;
        name: string;
        code: string;
        orgId: string;
        org: {
            id: string;
            name: string;
        };
    };
    assignee?: {
        id: string;
        email: string;
        name?: string | null;
    };
    reviewer?: {
        id: string;
        email: string;
        name?: string | null;
    };
}

export function usePendingTasks(filters?: {
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}) {
    return useQuery({
        queryKey: ['pending-tasks', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filters?.sortBy) params.set('sortBy', filters.sortBy);
            if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);

            const { data } = await api.get<{ tasks: PendingTask[] }>(
                `/pending-tasks?${params.toString()}`
            );
            return data.tasks;
        },
    });
}
