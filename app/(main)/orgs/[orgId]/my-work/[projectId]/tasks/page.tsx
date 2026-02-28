'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTasks, useUpdateTask, type Task } from '@/hooks/tasks/useTasks';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, CheckSquare, Play } from 'lucide-react';

const now = new Date();
const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

function isOverdue(task: Task): boolean {
  if (!task.deadlineDt) return false;
  return new Date(task.deadlineDt) < now && task.status !== 'DONE' && task.status !== 'ARCHIVED';
}

function isDueThisWeek(task: Task): boolean {
  if (!task.deadlineDt) return false;
  const d = new Date(task.deadlineDt);
  return d >= now && d <= weekFromNow;
}

function TaskActions({
  orgId,
  projectId,
  task,
}: {
  orgId: string;
  projectId: string;
  task: Task;
}) {
  const updateTask = useUpdateTask(orgId, projectId, task.id);
  const canUpdate =
    task.status !== 'DONE' && task.status !== 'ARCHIVED';

  if (!canUpdate) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex gap-1">
      {task.status !== 'IN_PROGRESS' && task.status !== 'REVIEW' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => updateTask.mutate({ status: 'IN_PROGRESS' })}
          disabled={updateTask.isPending}
        >
          <Play className="h-4 w-4 mr-1" />
          Start
        </Button>
      )}
      <Button
        size="sm"
        variant="secondary"
        onClick={() => updateTask.mutate({ status: 'DONE' })}
        disabled={updateTask.isPending}
      >
        <CheckSquare className="h-4 w-4 mr-1" />
        Mark done
      </Button>
    </div>
  );
}

export default function MemberTasksPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'deadline' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: tasks, isLoading } = useTasks(orgId, projectId, {
    assigneeId: userId ?? undefined,
    sortBy,
    sortOrder,
  });

  const filteredTasks = (tasks ?? [])
    .filter((task) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (
          !task.title.toLowerCase().includes(q) &&
          !(task.description?.toLowerCase().includes(q))
        ) {
          return false;
        }
      }
      if (statusFilter === 'completed') {
        if (task.status !== 'DONE') return false;
      } else if (statusFilter === 'uncompleted') {
        if (task.status === 'DONE' || task.status === 'ARCHIVED') return false;
      } else if (statusFilter !== 'all') {
        if (task.status !== statusFilter) return false;
      }
      if (deadlineFilter === 'overdue') {
        if (!isOverdue(task)) return false;
      } else if (deadlineFilter === 'due_this_week') {
        if (!isDueThisWeek(task)) return false;
      } else if (deadlineFilter === 'no_deadline') {
        if (task.deadlineDt) return false;
      }
      return true;
    });

  const tasksPerPage = 10;
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
  const startIndex = (page - 1) * tasksPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + tasksPerPage);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, deadlineFilter]);

  const handleSort = (field: 'priority' | 'deadline' | 'created') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'default';
      case 'IN_PROGRESS':
        return 'secondary';
      case 'BLOCKED':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'destructive';
      case 'P1':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="uncompleted">Uncompleted</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="TODO">Todo</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Deadline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All deadlines</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="due_this_week">Due this week</SelectItem>
                  <SelectItem value="no_deadline">No deadline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading tasks...</div>
            ) : paginatedTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks found
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort('priority')}
                          >
                            Priority
                            <SortIcon field="priority" />
                          </Button>
                        </TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort('deadline')}
                          >
                            Deadline
                            <SortIcon field="deadline" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort('created')}
                          >
                            Created
                            <SortIcon field="created" />
                          </Button>
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link
                              href={`/orgs/${orgId}/my-work/${projectId}/tasks/${task.id}`}
                              className="text-primary hover:underline"
                            >
                              {task.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.deadlineDt
                              ? new Date(task.deadlineDt).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {new Date(task.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <TaskActions orgId={orgId} projectId={projectId} task={task} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {page} of {totalPages} ({filteredTasks.length} tasks)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
