import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface AuditLog {
  id: string;
  orgId: string | null;
  actorUserId: string;
  entityType: string;
  entityId: string;
  action: string;
  diffJson: any;
  timestamp: string;
  actor: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface AuditLogPagination {
  auditLogs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useAuditLogs(
  orgId: string | null,
  projectId: string | null,
  page: number = 1,
  search: string = '',
  sortBy: string = 'timestamp',
  sortOrder: 'asc' | 'desc' = 'desc',
  action?: string,
  actorId?: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery<AuditLogPagination | null>({
    queryKey: ['auditLogs', orgId, projectId, page, search, sortBy, sortOrder, action, actorId, startDate, endDate],
    queryFn: async () => {
      if (!orgId || !projectId) return null;
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        sortBy,
        sortOrder,
      });
      if (action) params.set('action', action);
      if (actorId) params.set('actorId', actorId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const { data } = await api.get<AuditLogPagination>(
        `/orgs/${orgId}/projects/${projectId}/audit?${params.toString()}`
      );
      return data;
    },
    enabled: !!orgId && !!projectId,
  });
}
