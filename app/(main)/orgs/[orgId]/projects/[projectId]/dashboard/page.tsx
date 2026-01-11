'use client';

import { useParams } from 'next/navigation';
import { useProject } from '@/hooks/projects/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProjectDashboardPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const { data: project, isLoading } = useProject(orgId, projectId);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div>Loading...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8">
        <div>Project not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Status</CardDescription>
              <CardTitle className="text-2xl">{project.status}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Budget</CardDescription>
              <CardTitle className="text-2xl">
                {project.budgetTotal
                  ? `${project.currency} ${project.budgetTotal.toLocaleString()}`
                  : 'N/A'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Cost to Date</CardDescription>
              <CardTitle className="text-2xl">
                {project.currency} {project.costToDate.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Tasks</CardDescription>
              <CardTitle className="text-2xl">
                {project._count?.tasks || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {project.description && (
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{project.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
