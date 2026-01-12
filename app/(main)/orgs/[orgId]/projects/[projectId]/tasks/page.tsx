'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTasks } from '@/hooks/tasks/useTasks';
import { useUserRole } from '@/hooks/organization/useOrganizations';
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
import { CreateTaskDialog } from '@/components/tasks/CreateTaskDialog';
import { ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';

export default function ProjectTasksPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'deadline' | 'created'>('priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: userRole } = useUserRole(orgId);
  const isAdminOrMaintainer = userRole === 'ADMIN' || userRole === 'MAINTAINER';

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: tasks, isLoading } = useTasks(orgId, projectId, {
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const projectTasks = tasks?.filter((t) => t.projectId === projectId) || [];

  const filteredTasks = tasks
    ? tasks
        .filter((task) => {
          if (debouncedSearch) {
            const searchLower = debouncedSearch.toLowerCase();
            if (
              !task.title.toLowerCase().includes(searchLower) &&
              !task.description?.toLowerCase().includes(searchLower)
            ) {
              return false;
            }
          }
          if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
            return false;
          }
          if (assigneeFilter !== 'all' && task.assigneeUserId !== assigneeFilter) {
            return false;
          }
          return true;
        })
        .sort((a, b) => {
          let compare = 0;
          if (sortBy === 'priority') {
            const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3, P4: 4 };
            compare = (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 5) - (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 5);
          } else if (sortBy === 'deadline') {
            const aDeadline = a.deadlineDt ? new Date(a.deadlineDt).getTime() : Infinity;
            const bDeadline = b.deadlineDt ? new Date(b.deadlineDt).getTime() : Infinity;
            compare = aDeadline - bDeadline;
          } else if (sortBy === 'created') {
            compare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          }
          return sortOrder === 'asc' ? compare : -compare;
        })
    : [];

  const tasksPerPage = 10;
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
  const startIndex = (page - 1) * tasksPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + tasksPerPage);

  const uniqueAssignees = Array.from(
    new Set(tasks?.map((task) => task.assigneeUserId).filter((id): id is string => !!id) || [])
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, priorityFilter, assigneeFilter]);

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0':
        return 'destructive';
      case 'P1':
        return 'default';
      case 'P2':
        return 'secondary';
      default:
        return 'outline';
    }
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

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tasks</CardTitle>
            {isAdminOrMaintainer && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            )}
          </div>
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
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="BACKLOG">Backlog</SelectItem>
                  <SelectItem value="TODO">Todo</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="P0">P0</SelectItem>
                  <SelectItem value="P1">P1</SelectItem>
                  <SelectItem value="P2">P2</SelectItem>
                  <SelectItem value="P3">P3</SelectItem>
                  <SelectItem value="P4">P4</SelectItem>
                </SelectContent>
              </Select>
              {uniqueAssignees.length > 0 && (
                <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assignees</SelectItem>
                    {uniqueAssignees.map((assigneeId) => {
                      const task = tasks?.find((t) => t.assigneeUserId === assigneeId);
                      const displayName = task?.assignee?.name || task?.assignee?.email || 'Unassigned';
                      return (
                        <SelectItem key={assigneeId} value={assigneeId}>
                          {displayName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
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
                        <TableHead>Assignee</TableHead>
                        <TableHead>Reviewer</TableHead>
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTasks.map((task) => (
                        <TableRow
                          key={task.id}
                          className="cursor-pointer"
                          onClick={() =>
                            router.push(`/orgs/${orgId}/projects/${projectId}/tasks/${task.id}`)
                          }
                        >
                          <TableCell>
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {task.assignee?.name || task.assignee?.email || '-'}
                          </TableCell>
                          <TableCell>
                            {task.reviewer?.name || task.reviewer?.email || '-'}
                          </TableCell>
                          <TableCell>
                            {task.deadlineDt
                              ? new Date(task.deadlineDt).toLocaleDateString()
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(task.createdAt).toLocaleDateString()}
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

      <CreateTaskDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        orgId={orgId}
        projectId={projectId}
        projectTasks={projectTasks.map((task) => ({
          id: task.id,
          title: task.title || '',
        }))}
      />
    </div>
  );
}
