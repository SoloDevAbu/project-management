import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ProjectTeam } from './types';

export function useProjectTeams(orgId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: ['projects', orgId, projectId, 'teams'],
    queryFn: async () => {
      if (!orgId || !projectId) return [];
      const { data } = await api.get<{ teams: ProjectTeam[] }>(
        `/orgs/${orgId}/projects/${projectId}/teams`
      );
      return data.teams;
    },
    enabled: !!orgId && !!projectId,
  });
}

export function useAssignTeamToProject(orgId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { data } = await api.post<{ team: ProjectTeam }>(
        `/orgs/${orgId}/projects/${projectId}/teams`,
        { teamId }
      );
      return data.team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId, projectId, 'teams'] });
      queryClient.invalidateQueries({ queryKey: ['projects', orgId, projectId] });
    },
  });
}

export function useRemoveTeamFromProject(orgId: string, projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      await api.delete(`/orgs/${orgId}/projects/${projectId}/teams?teamId=${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', orgId, projectId, 'teams'] });
      queryClient.invalidateQueries({ queryKey: ['projects', orgId, projectId] });
    },
  });
}
