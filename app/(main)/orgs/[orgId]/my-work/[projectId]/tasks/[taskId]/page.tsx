'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTask, useUpdateTask, type TaskDetail } from '@/hooks/tasks/useTasks';
import { useTaskComments, useAddTaskComment, useDeleteTaskComment } from '@/hooks/tasks/useTaskComments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Play, CheckSquare, Send, Trash2 } from 'lucide-react';

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getInitials(nameOrEmail: string) {
  if (!nameOrEmail) return "?";
  if (nameOrEmail.includes("@")) {
    return nameOrEmail.substring(0, 2).toUpperCase();
  }
  const parts = nameOrEmail.split(" ").filter((p) => p.length > 0);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nameOrEmail.substring(0, 2).toUpperCase();
}

function getColorClass(text: string) {
  const colors = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const Linkify = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <span className="whitespace-pre-wrap flex-1 break-words">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
};

export default function MemberTaskDetailPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const taskId = params.taskId as string;
  const { data: session } = useSession();

  const [commentText, setCommentText] = useState('');
  const [chatSearch, setChatSearch] = useState('');

  const { data: task, isLoading } = useTask(orgId, projectId, taskId);
  const updateTask = useUpdateTask(orgId, projectId, taskId);
  const { data: commentsData, isLoading: commentsLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useTaskComments(orgId, projectId, taskId);
  const addComment = useAddTaskComment(orgId, projectId, taskId);
  const deleteComment = useDeleteTaskComment(orgId, projectId, taskId);
  const allComments = commentsData?.pages.flatMap((p) => p.comments) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>Loading task...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-4">
        <div>Task not found</div>
        <Button asChild variant="outline">
          <Link href={`/orgs/${orgId}/my-work/${projectId}/tasks`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to my tasks
          </Link>
        </Button>
      </div>
    );
  }

  const detail = task as TaskDetail;
  const canUpdate = task.status !== 'DONE' && task.status !== 'ARCHIVED';

  return (
    <div className="flex gap-4 items-start">
      <div className="space-y-4 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/orgs/${orgId}/my-work/${projectId}/tasks`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to my tasks
            </Link>
          </Button>

          {canUpdate && (
            <div className="flex gap-2">
              {task.status !== 'IN_PROGRESS' && task.status !== 'REVIEW' && (
                <Button
                  size="sm"
                  variant="outline"
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
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-2xl">{task.title}</CardTitle>
              <Badge variant="outline">{task.type}</Badge>
              <Badge>{task.status}</Badge>
              <Badge variant="secondary">{task.priority}</Badge>
            </div>
            {task.project && (
              <CardDescription>
                {task.project.name} ({task.project.code})
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {task.description && (
              <div>
                <h3 className="font-medium mb-1">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.description}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Assignee</p>
                <p className="text-sm">
                  {task.assignee
                    ? task.assignee.name || task.assignee.email
                    : 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Reviewer</p>
                <p className="text-sm">
                  {task.reviewer
                    ? task.reviewer.name || task.reviewer.email
                    : 'No reviewer'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Deadline</p>
                <p className="text-sm">
                  {task.deadlineDt
                    ? new Date(task.deadlineDt).toLocaleDateString()
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{new Date(task.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {task.startDt && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Start</p>
                  <p className="text-sm">{new Date(task.startDt).toLocaleString()}</p>
                </div>
              )}
              {task.endDt && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">End</p>
                  <p className="text-sm">{new Date(task.endDt).toLocaleString()}</p>
                </div>
              )}
            </div>

            {detail.parent && (
              <div>
                <h3 className="font-medium mb-1">Parent task</h3>
                <p className="text-sm text-muted-foreground">{detail.parent.title}</p>
              </div>
            )}

            {detail.children && detail.children.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Sub-tasks</h3>
                <ul className="space-y-1">
                  {detail.children.map((c) => (
                    <li key={c.id} className="text-sm">
                      {c.title}
                      <span className="text-xs text-muted-foreground ml-2">
                        {c.status} · {c.priority}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail.dependencies && detail.dependencies.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Blocked by</h3>
                <ul className="space-y-1">
                  {detail.dependencies.map((d) => (
                    <li key={d.blockedByTask.id} className="text-sm">
                      {d.blockedByTask.title}
                      <span className="text-xs text-muted-foreground ml-2">
                        {d.blockedByTask.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {detail?.workLogs && detail.workLogs.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Work logs</h3>
                <ul className="space-y-2 border rounded-md divide-y">
                  {detail.workLogs.map((log) => (
                    <li key={log.id} className="p-3">
                      <div className="flex justify-between text-sm">
                        <span>
                          {log.user.name || log.user.email} ·{' '}
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                        <span className="font-medium">
                          {formatDuration(log.totalDurationMin)}
                        </span>
                      </div>
                      {log.segments && log.segments.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {log.segments
                            .map(
                              (s) =>
                                `${new Date(s.startDt).toLocaleTimeString()} – ${new Date(s.endDt).toLocaleTimeString()} (${s.durationMin}m)`
                            )
                            .join(', ')}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="w-[450px] shrink-0 sticky top-4 flex flex-col h-[60vh]">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle>Comments</CardTitle>
          <Input
            placeholder="Search comments..."
            value={chatSearch}
            onChange={(e) => setChatSearch(e.target.value)}
            className="h-8 text-sm mt-2"
          />
        </CardHeader>
        <CardContent className="flex flex-col gap-4 overflow-hidden flex-1">
          <form
            className="flex gap-2 shrink-0"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = commentText.trim();
              if (!trimmed) return;
              addComment.mutate(trimmed, {
                onSuccess: () => setCommentText(''),
              });
            }}
          >
            <Input
              placeholder="Write a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={addComment.isPending}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!commentText.trim() || addComment.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>

          <div className="overflow-y-auto flex-1 pr-2">
            {commentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            ) : !allComments || allComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <ul className="space-y-3">
                {allComments
                  .filter((c) =>
                    c.content.toLowerCase().includes(chatSearch.toLowerCase()),
                  )
                  .map((c) => {
                    const name = c.user.name || c.user.email;
                    return (
                      <li key={c.id} className="border rounded-md p-3 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-2">
                            <div
                              className={`flex items-center justify-center shrink-0 w-6 h-6 rounded-full text-[10px] font-medium text-white ${getColorClass(name)}`}
                              title={name}
                            >
                              {getInitials(name)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <p className="text-sm text-foreground">
                                <Linkify text={c.content} />
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {new Date(c.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {c.userId === session?.user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0 ml-2"
                              onClick={() => deleteComment.mutate(c.id)}
                              disabled={deleteComment.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            )}
            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
