import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Task {
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
  budgetAmount?: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    code: string;
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
  _count?: {
    children: number;
    dependencies: number;
    blockingTasks: number;
  };
}

export interface CreateTaskInput {
  projectId: string;
  parentId?: string;
  title: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  assigneeUserId?: string;
  reviewerUserId?: string;
  assignmentDt?: string;
  startDt?: string;
  endDt?: string;
  deadlineDt?: string;
  budgetAmount?: number;
  currency?: string;
}

export function useTasks(
  orgId: string | null,
  filters?: {
    projectId?: string;
    parentTaskId?: string | null;
    status?: string;
    assigneeId?: string;
  }
) {
  return useQuery({
    queryKey: ['tasks', orgId, filters],
    queryFn: async () => {
      if (!orgId) return [];
      const params = new URLSearchParams();
      if (filters?.projectId) params.set('projectId', filters.projectId);
      if (filters?.parentTaskId !== undefined) {
        params.set('parentTaskId', filters.parentTaskId || '');
      }
      if (filters?.status) params.set('status', filters.status);
      if (filters?.assigneeId) params.set('assigneeId', filters.assigneeId);

      const { data } = await api.get<{ tasks: Task[] }>(
        `/orgs/${orgId}/tasks?${params.toString()}`
      );
      return data.tasks;
    },
    enabled: !!orgId,
  });
}

export function useTask(orgId: string | null, taskId: string | null) {
  return useQuery({
    queryKey: ['tasks', orgId, taskId],
    queryFn: async () => {
      if (!orgId || !taskId) return null;
      const { data } = await api.get<{ task: Task }>(
        `/orgs/${orgId}/tasks/${taskId}`
      );
      return data.task;
    },
    enabled: !!orgId && !!taskId,
  });
}

export function useCreateTask(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data } = await api.post<{ task: Task }>(
        `/orgs/${orgId}/tasks`,
        input
      );
      return data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', orgId] });
    },
  });
}

export function useUpdateTask(orgId: string, taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CreateTaskInput & { assigneeUserId?: string | null; reviewerUserId?: string | null }>) => {
      const { data } = await api.patch<{ task: Task }>(
        `/orgs/${orgId}/tasks/${taskId}`,
        input
      );
      return data.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', orgId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', orgId, taskId] });
    },
  });
}

