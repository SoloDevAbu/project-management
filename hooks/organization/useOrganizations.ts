import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { Organization, CreateOrganizationInput } from './types';

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data } = await api.get<{ orgs: Organization[] }>('/orgs');
      return data.orgs;
    },
  });
}

export function useOrganization(orgId: string | null) {
  return useQuery({
    queryKey: ['organizations', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await api.get<{ org: Organization }>(`/orgs/${orgId}`);
      return data.org;
    },
    enabled: !!orgId,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrganizationInput) => {
      const { data } = await api.post<{ org: Organization }>('/orgs', input);
      return data.org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useUpdateOrganization(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CreateOrganizationInput & { status?: string }>) => {
      const { data } = await api.patch<{ org: Organization }>(`/orgs/${orgId}`, input);
      return data.org;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId] });
    },
  });
}
