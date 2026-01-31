import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { OrgTeam, CreateTeamInput } from './types';

export function useOrganizationTeams(orgId: string | null) {
  return useQuery({
    queryKey: ['organizations', orgId, 'teams'],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await api.get<{ teams: OrgTeam[] }>(`/orgs/${orgId}/teams`);
      return data.teams;
    },
    enabled: !!orgId,
  });
}

export function useCreateTeam(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTeamInput) => {
      const { data } = await api.post<{ team: OrgTeam }>(`/orgs/${orgId}/teams`, input);
      return data.team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'teams'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId] });
    },
  });
}
