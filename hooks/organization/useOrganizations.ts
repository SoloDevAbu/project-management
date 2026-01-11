import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface Organization {
  id: string;
  name: string;
  legalName?: string | null;
  country?: string | null;
  address?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status: string;
  createdAt: string;
  _count?: {
    members: number;
    teams: number;
    projects: number;
  };
}

export interface OrgMember {
  role: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  };
}

export interface OrgTeam {
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

export interface OrgProject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  createdAt: string;
  creator: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export interface CreateOrganizationInput {
  name: string;
  legalName?: string;
  country?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
}

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

export function useOrganizationMembers(orgId: string | null, page: number = 1) {
  return useQuery({
    queryKey: ['organizations', orgId, 'members', page],
    queryFn: async () => {
      if (!orgId) return null;
      const { data } = await api.get<{
        members: OrgMember[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
          hasNext: boolean;
          hasPrev: boolean;
        };
      }>(`/orgs/${orgId}/members?page=${page}`);
      return data;
    },
    enabled: !!orgId,
  });
}

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

export interface CreateTeamInput {
  name: string;
  description?: string;
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

export interface SearchUserResult {
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  } | null;
  exists: boolean;
  isMember: boolean;
  memberRole: string | null;
}

export interface InviteMemberInput {
  email: string;
  role: 'MAINTAINER' | 'MEMBER';
}

export interface InviteMemberResult {
  member?: OrgMember;
  invite?: {
    id: string;
    email: string;
    role: string;
    token: string;
    expiresAt: string;
  };
  added: boolean;
}

export function useSearchUser(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post<SearchUserResult>(
        `/orgs/${orgId}/members/search`,
        { email }
      );
      return data;
    },
  });
}

export function useInviteMember(orgId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: InviteMemberInput) => {
      const { data } = await api.post<InviteMemberResult>(
        `/orgs/${orgId}/members/invite`,
        input
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId, 'members'] });
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId] });
    },
  });
}
