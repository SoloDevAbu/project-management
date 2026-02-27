'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePendingTasks, type PendingTask } from '@/hooks/dashboard/usePendingTasks';
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
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

function getTaskRoute(task: PendingTask): string {
  const { project, userRole } = task;
  const orgId = project.orgId;
  const projectId = project.id;

  if (userRole === 'ADMIN' || userRole === 'MAINTAINER') {
    // Admin/Maintainer → go to task detail page
    return `/orgs/${orgId}/projects/${projectId}/tasks/${task.id}`;
  }
  // Member → go to my-work tasks list
  return `/orgs/${orgId}/my-work/${projectId}/tasks`;
}

export default function PendingTasksPage() {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [orgFilter, setOrgFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'priority' | 'deadline' | 'created'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: tasks, isLoading } = usePendingTasks({ sortBy, sortOrder });

  const filteredTasks = (tasks ?? []).filter((task) => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      if (
        !task.title.toLowerCase().includes(q) &&
        !(task.description?.toLowerCase().includes(q))
      ) {
        return false;
      }
    }
    if (orgFilter !== 'all' && task.project.orgId !== orgFilter) {
      return false;
    }
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const tasksPerPage = 10;
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);
  const startIndex = (page - 1) * tasksPerPage;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + tasksPerPage);

  // Get unique orgs for filtering
  const uniqueOrgs = Array.from(
    new Map(
      (tasks ?? []).map((t) => [t.project.orgId, t.project.org.name])
    ).entries()
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, orgFilter, priorityFilter]);

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
      case 'IN_PROGRESS':
        return 'secondary';
      case 'BLOCKED':
        return 'destructive';
      case 'REVIEW':
        return 'default';
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
      <div>
        <h1 className="text-3xl font-bold">Pending Tasks</h1>
        <p className="text-muted-foreground">
          All tasks across your organizations that are not yet completed
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
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
              {uniqueOrgs.length > 1 && (
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Organization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Organizations</SelectItem>
                    {uniqueOrgs.map(([orgId, orgName]) => (
                      <SelectItem key={orgId} value={orgId}>
                        {orgName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading tasks...</div>
            ) : paginatedTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending tasks found
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
                        <TableHead>Organization</TableHead>
                        <TableHead>Project</TableHead>
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
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(getTaskRoute(task))}
                        >
                          <TableCell>
                            <Badge variant={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {task.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {task.project.org.name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {task.project.name}
                          </TableCell>
                          <TableCell>
                            {task.deadlineDt
                              ? new Date(task.deadlineDt).toLocaleDateString()
                              : '—'}
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
    </div>
  );
}
