'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWorkLogs } from '@/hooks/work-logs/useWorkLogs';
import { useOrganizationMembers } from '@/hooks/organization/useOrganizations';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ProjectWorkLogsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [userId, setUserId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'user'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: workLogsData, isLoading } = useWorkLogs(
    orgId,
    projectId,
    page,
    debouncedSearch || undefined,
    sortBy,
    sortOrder,
    userId !== 'all' ? userId : undefined,
    startDate || undefined,
    endDate || undefined
  );

  const { data: orgMembersData } = useOrganizationMembers(orgId, 1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, userId, startDate, endDate]);

  const handleSort = (field: 'date' | 'duration' | 'user') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Work Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
              <Input
                placeholder="Search by user name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <div className="flex gap-2 items-center">
                <Label htmlFor="user-filter" className="whitespace-nowrap">
                  User:
                </Label>
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger id="user-filter" className="w-[150px]">
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {orgMembersData?.members.map((member) => (
                      <SelectItem key={member.user.id} value={member.user.id}>
                        {member.user.name || member.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <Label htmlFor="start-date" className="whitespace-nowrap">
                  From:
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Label htmlFor="end-date" className="whitespace-nowrap">
                  To:
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[150px]"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading work logs...</div>
            ) : !workLogsData || workLogsData.workLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No work logs found
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort('date')}
                          >
                            Date
                            <SortIcon field="date" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort('duration')}
                          >
                            Duration
                            <SortIcon field="duration" />
                          </Button>
                        </TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Segments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workLogsData.workLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {log.user.name || log.user.email}
                          </TableCell>
                          <TableCell>
                            {new Date(log.createdAt).toLocaleDateString()}
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.createdAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDuration(log.totalDurationMin)}
                          </TableCell>
                          <TableCell>
                            {log.task ? (
                              <span className="font-medium">{log.task.title}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {log.segments.length} segment{log.segments.length !== 1 ? 's' : ''}
                            </div>
                            {log.segments.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {log.segments
                                  .map(
                                    (seg) =>
                                      `${new Date(seg.startDt).toLocaleTimeString()} - ${new Date(seg.endDt).toLocaleTimeString()}`
                                  )
                                  .join(', ')}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {workLogsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {workLogsData.pagination.page} of{' '}
                      {workLogsData.pagination.totalPages} (
                      {workLogsData.pagination.total} logs)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={!workLogsData.pagination.hasPrev}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!workLogsData.pagination.hasNext}
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
