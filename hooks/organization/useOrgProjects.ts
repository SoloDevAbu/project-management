import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { OrgProject } from './types';

export function useOrganizationProjects(orgId: string | null) {
  return useQuery({
    queryKey: ['organizations', orgId, 'projects'],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await api.get<{ projects: OrgProject[] }>(`/orgs/${orgId}/projects`);
      return data.projects;
    },
    enabled: !!orgId,
  });
}
