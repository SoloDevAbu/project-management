import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Project {
  id: string;
  orgId: string;
  parentId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  startDate?: string | null;
  deadline?: string | null;
  costToDate: number;
  budgetTotal?: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    name: string;
    code: string;
  };
  _count?: {
    children: number;
    tasks: number;
    teamLinks: number;
    userLinks: number;
  };
}

export interface CreateProjectInput {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  status?: string;
  startDate?: string;
  deadline?: string;
  budgetTotal?: number;
  currency?: string;
}

export function useProjects(orgId: string | null, parentId?: string | null) {
  return useQuery({
    queryKey: ['projects', orgId, parentId],
    queryFn: async () => {
      if (!orgId) return [];
      const params = new URLSearchParams();
      if (parentId) params.set('parent', parentId);
      const { data } = await api.get<{ projects: Project[] }>(
        `/orgs/${orgId}/projects?${params.toString()}`
      );
      return data.projects;
    },
    enabled: !!orgId,
  });
}

export function useProject(orgId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: ['projects', orgId, projectId],
    queryFn: async () => {
      if (!orgId || !projectId) return null;
      const { data } = await api.get<{ project: Project }>(
        `/orgs/${orgId}/projects/${projectId}`
      );
      return data.project;
    },
    enabled: !!orgId && !!projectId,
  });
}

export function useCreateProject(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data } = await api.post<{ project: Project }>(
        `/orgs/${orgId}/projects`,
        input
      );
      return data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId] });
    },
  });
}

export function useUpdateProject(orgId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CreateProjectInput>) => {
      const { data } = await api.patch<{ project: Project }>(
        `/orgs/${orgId}/projects/${projectId}`,
        input
      );
      return data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] });
      queryClient.invalidateQueries({ queryKey: ['projects', orgId, projectId] });
    },
  });
}

export function useDeleteProject(orgId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/orgs/${orgId}/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId] });
    },
  });
}
