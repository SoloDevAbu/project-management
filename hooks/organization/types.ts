export interface Organization {
  id: string;
  name: string;
  legalName: string | null;
  country: string | null;
  address: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  createdAt: string;
  userRole: string;
  _count: {
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

export interface CreateTeamInput {
  name: string;
  description?: string;
}

export interface ProjectTeamMember {
  user: {
    id: string;
    email: string;
    name?: string | null;
    avatar?: string | null;
  };
}
