'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateTask } from '@/hooks/tasks/useTasks';
import { useOrganizationMembers } from '@/hooks/organization/useOrganizations';
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
import { useToast } from '@/components/ui/use-toast';

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']).default('TASK'),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE', 'ARCHIVED']).default('BACKLOG'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']).default('P4'),
  assigneeUserId: z.string().uuid().optional().nullable(),
  reviewerUserId: z.string().uuid().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  startDt: z.string().optional().nullable(),
  deadlineDt: z.string().optional().nullable(),
});

type CreateTaskForm = z.infer<typeof createTaskSchema>;

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  projectId: string;
  projectTasks: Array<{ id: string; title: string }>;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  orgId,
  projectId,
  projectTasks,
}: CreateTaskDialogProps) {
  const { data: membersData } = useOrganizationMembers(orgId, 1);
  const createTask = useCreateTask(orgId, projectId);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      type: 'TASK',
      status: 'BACKLOG',
      priority: 'P4',
      assigneeUserId: null,
      reviewerUserId: null,
      parentId: null,
    },
  });

  const members = membersData?.members || [];

  const onSubmit = async (data: CreateTaskForm) => {
    try {
      await createTask.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        type: data.type,
        status: data.status,
        priority: data.priority,
        assigneeUserId: data.assigneeUserId || undefined,
        reviewerUserId: data.reviewerUserId || undefined,
        parentId: data.parentId || undefined,
        startDt: data.startDt || undefined,
        deadlineDt: data.deadlineDt || undefined,
      });
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new task for this project
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Enter task title"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Enter task description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TASK">Task</SelectItem>
                      <SelectItem value="BUG">Bug</SelectItem>
                      <SelectItem value="FEATURE">Feature</SelectItem>
                      <SelectItem value="CHANGE">Change</SelectItem>
                      <SelectItem value="RESEARCH">Research</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BACKLOG">Backlog</SelectItem>
                      <SelectItem value="TODO">Todo</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="BLOCKED">Blocked</SelectItem>
                      <SelectItem value="REVIEW">Review</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="P0">P0 - Critical</SelectItem>
                      <SelectItem value="P1">P1 - High</SelectItem>
                      <SelectItem value="P2">P2 - Medium</SelectItem>
                      <SelectItem value="P3">P3 - Low</SelectItem>
                      <SelectItem value="P4">P4 - Lowest</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Task</Label>
              <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent task (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Top-level task)</SelectItem>
                      {projectTasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assigneeUserId">Assignee</Label>
              <Controller
                name="assigneeUserId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.user.id} value={member.user.id}>
                          {member.user.name || member.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reviewerUserId">Reviewer</Label>
              <Controller
                name="reviewerUserId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reviewer (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No reviewer</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.user.id} value={member.user.id}>
                          {member.user.name || member.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDt">Start Date</Label>
              <Input
                id="startDt"
                type="datetime-local"
                {...register('startDt')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadlineDt">Deadline</Label>
              <Input
                id="deadlineDt"
                type="datetime-local"
                {...register('deadlineDt')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
