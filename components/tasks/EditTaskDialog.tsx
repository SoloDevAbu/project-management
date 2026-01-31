'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUpdateTask, type Task } from '@/hooks/tasks/useTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';

const editTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['BUG', 'FEATURE', 'TASK', 'CHANGE', 'RESEARCH', 'OTHER']),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE', 'ARCHIVED']),
  priority: z.enum(['P0', 'P1', 'P2', 'P3', 'P4']),
  assignmentDt: z.string().optional().nullable(),
  startDt: z.string().optional().nullable(),
  endDt: z.string().optional().nullable(),
  deadlineDt: z.string().optional().nullable(),
});

type EditTaskForm = z.infer<typeof editTaskSchema>;

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  projectId: string;
  task: Task;
}

function toDatetimeLocal(d: string | null | undefined): string {
  if (!d) return '';
  const date = new Date(d);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditTaskDialog({
  open,
  onOpenChange,
  orgId,
  projectId,
  task,
}: EditTaskDialogProps) {
  const updateTask = useUpdateTask(orgId, projectId, task.id);
  const { toast } = useToast();

  const form = useForm<EditTaskForm>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      title: task.title,
      description: task.description ?? '',
      type: (task.type as EditTaskForm['type']) ?? 'TASK',
      status: (task.status as EditTaskForm['status']) ?? 'BACKLOG',
      priority: (task.priority as EditTaskForm['priority']) ?? 'P4',
      assignmentDt: task.assignmentDt ? new Date(task.assignmentDt).toISOString().slice(0, 16) : null,
      startDt: task.startDt ? new Date(task.startDt).toISOString().slice(0, 16) : null,
      endDt: task.endDt ? new Date(task.endDt).toISOString().slice(0, 16) : null,
      deadlineDt: task.deadlineDt ? new Date(task.deadlineDt).toISOString().slice(0, 16) : null,
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (open && task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        type: (task.type as EditTaskForm['type']) ?? 'TASK',
        status: (task.status as EditTaskForm['status']) ?? 'BACKLOG',
        priority: (task.priority as EditTaskForm['priority']) ?? 'P4',
        assignmentDt: task.assignmentDt ? new Date(task.assignmentDt).toISOString().slice(0, 16) : null,
        startDt: task.startDt ? new Date(task.startDt).toISOString().slice(0, 16) : null,
        endDt: task.endDt ? new Date(task.endDt).toISOString().slice(0, 16) : null,
        deadlineDt: task.deadlineDt ? new Date(task.deadlineDt).toISOString().slice(0, 16) : null,
      });
    }
  }, [open, task, reset]);

  const onSubmit = async (data: EditTaskForm) => {
    try {
      await updateTask.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        type: data.type,
        status: data.status,
        priority: data.priority,
        assignmentDt: data.assignmentDt ? new Date(data.assignmentDt).toISOString() : null,
        startDt: data.startDt ? new Date(data.startDt).toISOString() : null,
        endDt: data.endDt ? new Date(data.endDt).toISOString() : null,
        deadlineDt: data.deadlineDt ? new Date(data.deadlineDt).toISOString() : null,
      });
      toast({ title: 'Success', description: 'Task updated successfully' });
      onOpenChange(false);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast({
        title: 'Error',
        description: err.response?.data?.error ?? 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <div className="flex flex-col max-h-[90vh] min-h-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task details (assignee and reviewer are changed separately)</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto px-6 space-y-4 pb-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Task title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Description" rows={3} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="TASK">Task</SelectItem>
                            <SelectItem value="BUG">Bug</SelectItem>
                            <SelectItem value="FEATURE">Feature</SelectItem>
                            <SelectItem value="CHANGE">Change</SelectItem>
                            <SelectItem value="RESEARCH">Research</SelectItem>
                            <SelectItem value="OTHER">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="P0">P0 - Critical</SelectItem>
                          <SelectItem value="P1">P1 - High</SelectItem>
                          <SelectItem value="P2">P2 - Medium</SelectItem>
                          <SelectItem value="P3">P3 - Low</SelectItem>
                          <SelectItem value="P4">P4 - Lowest</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assignmentDt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignment date</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startDt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deadlineDt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value || null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter className="flex-shrink-0 px-6 py-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={updateTask.isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTask.isPending}>
                  {updateTask.isPending ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
