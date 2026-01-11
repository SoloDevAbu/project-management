'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject, useUpdateProject, useDeleteProject } from '@/hooks/projects/useProjects';
import { useUserRole } from '@/hooks/organization/useOrganizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  status: z.enum(['PLANNED', 'IN_PROGRESS', 'HOLD', 'COMPLETED', 'CANCELLED']),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  currency: z.string().optional(),
});

type UpdateProjectForm = z.infer<typeof updateProjectSchema>;

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const { data: project, isLoading: projectLoading } = useProject(orgId, projectId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const updateProject = useUpdateProject(orgId, projectId);
  const deleteProject = useDeleteProject(orgId, projectId);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<UpdateProjectForm>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project?.name || '',
      code: project?.code || '',
      description: project?.description || '',
      status: (project?.status as any) || 'PLANNED',
      startDate: project?.startDate
        ? new Date(project.startDate).toISOString().split('T')[0]
        : '',
      deadline: project?.deadline
        ? new Date(project.deadline).toISOString().split('T')[0]
        : '',
      currency: project?.currency || 'USD',
    },
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        code: project.code,
        description: project.description || '',
        status: (project.status as any) || 'PLANNED',
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().split('T')[0]
          : '',
        deadline: project.deadline
          ? new Date(project.deadline).toISOString().split('T')[0]
          : '',
        currency: project.currency || 'USD',
      });
    }
  }, [project, reset]);

  useEffect(() => {
    if (userRole && userRole !== 'ADMIN' && userRole !== 'MAINTAINER') {
      router.replace(`/orgs/${orgId}/projects/${projectId}/dashboard`);
    }
  }, [userRole, router, orgId, projectId]);

  const onSubmit = async (data: UpdateProjectForm) => {
    try {
      await updateProject.mutateAsync({
        name: data.name,
        code: data.code,
        description: data.description || undefined,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
        currency: data.currency,
      });
    } catch (error) {
      console.error('Failed to update project:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync();
      router.push(`/orgs/${orgId}/overview`);
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  if (projectLoading || roleLoading) {
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

  if (userRole !== 'ADMIN' && userRole !== 'MAINTAINER') {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Project Details</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>
                Update project information and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Project name"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Code *</Label>
                    <Input
                      id="code"
                      {...register('code')}
                      placeholder="Project code"
                    />
                    {errors.code && (
                      <p className="text-sm text-destructive">{errors.code.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Project description"
                    rows={4}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLANNED">Planned</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="HOLD">Hold</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.status && (
                      <p className="text-sm text-destructive">{errors.status.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input id="currency" {...register('currency')} />
                    {errors.currency && (
                      <p className="text-sm text-destructive">
                        {errors.currency.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      {...register('startDate')}
                    />
                    {errors.startDate && (
                      <p className="text-sm text-destructive">
                        {errors.startDate.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      {...register('deadline')}
                    />
                    {errors.deadline && (
                      <p className="text-sm text-destructive">
                        {errors.deadline.message}
                      </p>
                    )}
                  </div>
                </div>

                <Button type="submit" disabled={updateProject.isPending}>
                  {updateProject.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Linked Teams</CardTitle>
              <CardDescription>
                Teams linked to this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Team management will be implemented in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Linked Users</CardTitle>
              <CardDescription>
                Users linked to this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                User management will be implemented in a future update.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="danger" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">Delete Project</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the
                      project and all associated data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleteProject.isPending}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteProject.isPending ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
