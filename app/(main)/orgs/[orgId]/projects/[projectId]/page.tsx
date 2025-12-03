'use client';

import { useParams } from 'next/navigation';
import { useProject } from '@/hooks/projects/useProjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProjectPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const { data: project, isLoading } = useProject(orgId, projectId);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">{project.code}</p>
          </div>
          <Button asChild>
            <Link href={`/orgs/${orgId}/projects/${projectId}/tasks/new`}>
              Create Task
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="subprojects">Sub-Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Task list will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subprojects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sub-Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {project._count?.children || 0} sub-projects
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

