import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  creator: {
    id: string;
    email: string;
    name?: string | null;
  };
  _count: {
    members: number;
    projectLinks: number;
  };
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role?: string | null;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  };
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
}

export interface AddTeamMemberInput {
  userId: string;
  role?: string;
}

export function useTeam(orgId: string | null, teamId: string | null) {
  return useQuery({
    queryKey: ['organizations', orgId, 'teams', teamId],
    queryFn: async () => {
      if (!orgId || !teamId) return null;
      const { data } = await api.get<{ team: Team }>(
        `/orgs/${orgId}/teams/${teamId}`
      );
      return data.team;
    },
    enabled: !!orgId && !!teamId,
  });
}

export function useTeamMembers(
  orgId: string | null,
  teamId: string | null,
  page: number = 1,
  search?: string,
  sortBy?: string,
  sortOrder?: string
) {
  return useQuery({
    queryKey: ['organizations', orgId, 'teams', teamId, 'members', page, search, sortBy, sortOrder],
    queryFn: async () => {
      if (!orgId || !teamId) return null;
      const params = new URLSearchParams({
        page: page.toString(),
      });
      if (search) params.append('search', search);
      if (sortBy) params.append('sortBy', sortBy);
      if (sortOrder) params.append('sortOrder', sortOrder);

      const { data } = await api.get<{
        members: TeamMember[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(`/orgs/${orgId}/teams/${teamId}/members?${params.toString()}`);
      return data;
    },
    enabled: !!orgId && !!teamId,
  });
}

export function useUpdateTeam(orgId: string, teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTeamInput) => {
      const { data } = await api.patch<{ team: Team }>(
        `/orgs/${orgId}/teams/${teamId}`,
        input
      );
      return data.team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'teams', teamId] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'teams'] });
    },
  });
}

export function useDeleteTeam(orgId: string, teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.delete(`/orgs/${orgId}/teams/${teamId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'teams'] });
    },
  });
}

export function useAddTeamMember(orgId: string, teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddTeamMemberInput) => {
      const { data } = await api.post<{ member: TeamMember }>(
        `/orgs/${orgId}/teams/${teamId}/members`,
        input
      );
      return data.member;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'teams', teamId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'teams', teamId] });
    },
  });
}

export function useRemoveTeamMember(orgId: string, teamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/orgs/${orgId}/teams/${teamId}/members?userId=${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'teams', teamId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'teams', teamId] });
    },
  });
}
