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

export interface ProjectTeam {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  _count: {
    members: number;
  };
}
