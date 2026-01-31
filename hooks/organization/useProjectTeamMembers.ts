import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ProjectTeamMember } from './types';

export function useProjectTeamMembers(orgId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: ['organizations', orgId, 'projects', projectId, 'team-members'],
    queryFn: async () => {
      if (!orgId || !projectId) return null;
      const { data } = await api.get<{ members: ProjectTeamMember[] }>(
        `/orgs/${orgId}/projects/${projectId}/team-members`
      );
      return data;
    },
    enabled: !!orgId && !!projectId,
  });
}
