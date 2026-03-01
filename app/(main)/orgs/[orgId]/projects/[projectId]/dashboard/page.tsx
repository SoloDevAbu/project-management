'use client';

import { useParams } from 'next/navigation';
import { useProject, useUpdateProject } from '@/hooks/projects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ProjectDetailesEditor from '@/components/projects/ProjectDetailesEditor';
import type { ProjectDetailesEditorRef } from '@/components/projects/ProjectDetailesEditor';
import { Button } from '@/components/ui/button';
import { useRef, useState } from 'react';
import { toast } from '@/components/ui/use-toast';

export default function ProjectDashboardPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const { data: project, isLoading } = useProject(orgId, projectId);
  const updateProject = useUpdateProject(orgId, projectId);

  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<ProjectDetailesEditorRef>(null);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleUpdate = () => {
    const description = editorRef.current?.getContent() ?? '';
    updateProject.mutate(
      { description },
      {
        onSuccess: () => {
          toast({ title: 'Description updated successfully' });
          setIsEditing(false);
        },
        onError: () => {
          toast({ title: 'Failed to update description', variant: 'destructive' });
        },
      }
    );
  };

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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Description</CardTitle>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdate}
                    disabled={updateProject.isPending}
                  >
                    {updateProject.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={handleEdit}>
                  Edit Description
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <ProjectDetailesEditor
                ref={editorRef}
                initialContent={project.description}
              />
            ) : (
              <p className="whitespace-pre-wrap">{project.description || 'No description yet.'}</p>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
