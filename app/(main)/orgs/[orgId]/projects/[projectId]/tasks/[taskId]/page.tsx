"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  useTask,
  useTasks,
  useUpdateTaskAssignee,
  useUpdateTaskReviewer,
  useAddTaskDependency,
  useRemoveTaskDependency,
  type TaskDetail,
} from "@/hooks/tasks/useTasks";
import {
  useTaskComments,
  useAddTaskComment,
  useDeleteTaskComment,
} from "@/hooks/tasks/useTaskComments";
import { useUserRole } from "@/hooks/organization";
import { useProjectTeamMembers } from "@/hooks/organization";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditTaskDialog } from "@/components/tasks/EditTaskDialog";
import { ArrowLeft, Pencil, Link2, X, Send, Trash2 } from "lucide-react";

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

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;
  const taskId = params.taskId as string;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [blockedByTaskId, setBlockedByTaskId] = useState<string>("");
  const [commentText, setCommentText] = useState("");
  const [chatSearch, setChatSearch] = useState("");

  const { data: task, isLoading } = useTask(orgId, projectId, taskId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: projectTasksData } = useTasks(orgId, projectId);
  const { data: teamMembersData } = useProjectTeamMembers(orgId, projectId);
  const updateAssignee = useUpdateTaskAssignee(orgId, projectId, taskId);
  const updateReviewer = useUpdateTaskReviewer(orgId, projectId, taskId);
  const addDependency = useAddTaskDependency(orgId, projectId, taskId);
  const removeDependency = useRemoveTaskDependency(orgId, projectId, taskId);
  const {
    data: commentsData,
    isLoading: commentsLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTaskComments(orgId, projectId, taskId);
  const addComment = useAddTaskComment(orgId, projectId, taskId);
  const deleteComment = useDeleteTaskComment(orgId, projectId, taskId);
  const { data: session } = useSession();

  const members = teamMembersData?.members ?? [];
  const allComments = commentsData?.pages.flatMap((p) => p.comments) ?? [];

  useEffect(() => {
    if (roleLoading || userRole === undefined) return;
    if (userRole === "MEMBER") {
      router.replace(`/orgs/${orgId}/my-work`);
    }
  }, [userRole, roleLoading, orgId, router]);

  if (
    roleLoading ||
    !userRole ||
    (userRole !== "ADMIN" && userRole !== "MAINTAINER")
  ) {
    return (
      <div className="space-y-4">
        <div className="text-muted-foreground">
          {roleLoading ? "Loading..." : "Redirecting..."}
        </div>
      </div>
    );
  }

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
          <Link href={`/orgs/${orgId}/projects/${projectId}/tasks`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to tasks
          </Link>
        </Button>
      </div>
    );
  }

  const detail = task as TaskDetail;
  const blockedByIds = new Set(
    detail.dependencies?.map((d) => d.blockedByTask.id) ?? [],
  );
  const availableBlockingTasks = (projectTasksData?.tasks ?? []).filter(
    (t) => t.id !== taskId && !blockedByIds.has(t.id),
  );

  return (
    <div className="flex gap-4 items-start">
      <div className="space-y-4 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/orgs/${orgId}/projects/${projectId}/tasks`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to tasks
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit task
          </Button>
        </div>

        <EditTaskDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          orgId={orgId}
          projectId={projectId}
          task={task}
        />

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
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Assignee
                </p>
                <Select
                  value={task.assigneeUserId ?? "none"}
                  onValueChange={(v) =>
                    updateAssignee.mutate(v === "none" ? null : v)
                  }
                  disabled={updateAssignee.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user.id} value={m.user.id}>
                        {m.user.name || m.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Reviewer
                </p>
                <Select
                  value={task.reviewerUserId ?? "none"}
                  onValueChange={(v) =>
                    updateReviewer.mutate(v === "none" ? null : v)
                  }
                  disabled={updateReviewer.isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No reviewer</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user.id} value={m.user.id}>
                        {m.user.name || m.user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Deadline
                </p>
                <p className="text-sm">
                  {task.deadlineDt
                    ? new Date(task.deadlineDt).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Created
                </p>
                <p className="text-sm">
                  {new Date(task.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {task.startDt && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Start
                  </p>
                  <p className="text-sm">
                    {new Date(task.startDt).toLocaleString()}
                  </p>
                </div>
              )}
              {task.endDt && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    End
                  </p>
                  <p className="text-sm">
                    {new Date(task.endDt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {detail.parent && (
              <div>
                <h3 className="font-medium mb-1">Parent task</h3>
                <Link
                  href={`/orgs/${orgId}/projects/${projectId}/tasks/${detail.parent.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  {detail.parent.title}
                </Link>
              </div>
            )}

            {detail.children && detail.children.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Sub-tasks</h3>
                <ul className="space-y-1">
                  {detail.children.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/orgs/${orgId}/projects/${projectId}/tasks/${c.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {c.title}
                      </Link>
                      <span className="text-xs text-muted-foreground ml-2">
                        {c.status} · {c.priority}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-2">Blocked by</h3>
              {detail.dependencies && detail.dependencies.length > 0 ? (
                <ul className="space-y-2">
                  {detail.dependencies.map((d) => (
                    <li
                      key={d.blockedByTask.id}
                      className="flex items-center justify-between gap-2 py-1"
                    >
                      <div>
                        <Link
                          href={`/orgs/${orgId}/projects/${projectId}/tasks/${d.blockedByTask.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {d.blockedByTask.title}
                        </Link>
                        <span className="text-xs text-muted-foreground ml-2">
                          {d.blockedByTask.status}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          removeDependency.mutate(d.blockedByTask.id)
                        }
                        disabled={removeDependency.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Not blocked by any task
                </p>
              )}
              {availableBlockingTasks.length > 0 && (
                <div className="flex gap-2 mt-2">
                  <Select
                    value={blockedByTaskId}
                    onValueChange={setBlockedByTaskId}
                  >
                    <SelectTrigger className="w-[280px]">
                      <SelectValue placeholder="Add blocked by..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBlockingTasks.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (blockedByTaskId) {
                        addDependency.mutate(blockedByTaskId, {
                          onSuccess: () => setBlockedByTaskId(""),
                        });
                      }
                    }}
                    disabled={!blockedByTaskId || addDependency.isPending}
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              )}
            </div>

            {detail?.workLogs && detail.workLogs.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Work logs</h3>
                <ul className="space-y-2 border rounded-md divide-y">
                  {detail.workLogs.map((log) => (
                    <li key={log.id} className="p-3">
                      <div className="flex justify-between text-sm">
                        <span>
                          {log.user.name || log.user.email} ·{" "}
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
                                `${new Date(s.startDt).toLocaleTimeString()} – ${new Date(s.endDt).toLocaleTimeString()} (${s.durationMin}m)`,
                            )
                            .join(", ")}
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
                onSuccess: () => setCommentText(""),
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
              <p className="text-sm text-muted-foreground">
                Loading comments...
              </p>
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
                      <li
                        key={c.id}
                        className="border rounded-md p-3 space-y-2"
                      >
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
                          {(c.userId === session?.user?.id ||
                            userRole === "ADMIN" ||
                            userRole === "MAINTAINER") && (
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
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
