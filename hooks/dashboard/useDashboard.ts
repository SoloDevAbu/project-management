import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';

export interface OrgStat {
    orgId: string;
    orgName: string;
    orgStatus: string;
    userRole: string;
    memberCount: number;
    projectCount: number;
    pendingTaskCount: number;
}

export interface DashboardStats {
    totalOrganizations: number;
    totalPendingTasks: number;
    organizations: OrgStat[];
}

export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const { data } = await api.get<DashboardStats>('/dashboard');
            return data;
        },
    });
}
