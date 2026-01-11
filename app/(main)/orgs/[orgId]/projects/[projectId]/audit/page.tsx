'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuditLogs } from '@/hooks/audit/useAuditLogs';
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

export default function ProjectAuditPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [action, setAction] = useState<string>('all');
  const [actorId, setActorId] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'actor' | 'action'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data: auditLogsData, isLoading } = useAuditLogs(
    orgId,
    projectId,
    page,
    debouncedSearch || undefined,
    sortBy,
    sortOrder,
    action !== 'all' ? action : undefined,
    actorId !== 'all' ? actorId : undefined,
    startDate || undefined,
    endDate || undefined
  );

  const { data: orgMembersData } = useOrganizationMembers(orgId, 1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, action, actorId, startDate, endDate]);

  const handleSort = (field: 'timestamp' | 'actor' | 'action') => {
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

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 items-center flex-wrap">
              <Input
                placeholder="Search by actor name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <div className="flex gap-2 items-center">
                <Label htmlFor="action-filter" className="whitespace-nowrap">
                  Action:
                </Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger id="action-filter" className="w-[150px]">
                    <SelectValue placeholder="All Actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 items-center">
                <Label htmlFor="actor-filter" className="whitespace-nowrap">
                  Actor:
                </Label>
                <Select value={actorId} onValueChange={setActorId}>
                  <SelectTrigger id="actor-filter" className="w-[150px]">
                    <SelectValue placeholder="All Actors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actors</SelectItem>
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
              <div className="text-center py-8">Loading audit logs...</div>
            ) : !auditLogsData || auditLogsData.auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found
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
                            onClick={() => handleSort('timestamp')}
                          >
                            Timestamp
                            <SortIcon field="timestamp" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort('actor')}
                          >
                            Actor
                            <SortIcon field="actor" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2"
                            onClick={() => handleSort('action')}
                          >
                            Action
                            <SortIcon field="action" />
                          </Button>
                        </TableHead>
                        <TableHead>Entity Type</TableHead>
                        <TableHead>Entity ID</TableHead>
                        <TableHead>Changes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLogsData.auditLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.timestamp).toLocaleString()}
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.timestamp), {
                                addSuffix: true,
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.actor.name || log.actor.email}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{log.action}</span>
                          </TableCell>
                          <TableCell>{log.entityType}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {log.entityId.substring(0, 8)}...
                            </code>
                          </TableCell>
                          <TableCell>
                            {log.diffJson ? (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                  View Changes
                                </summary>
                                <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-32">
                                  {JSON.stringify(log.diffJson, null, 2)}
                                </pre>
                              </details>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {auditLogsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {auditLogsData.pagination.page} of{' '}
                      {auditLogsData.pagination.totalPages} (
                      {auditLogsData.pagination.total} logs)
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={!auditLogsData.pagination.hasPrev}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={!auditLogsData.pagination.hasNext}
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
