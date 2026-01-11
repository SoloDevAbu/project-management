'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { useOrganization, useUserRole } from '@/hooks/organization/useOrganizations';
import {
  useTeam,
  useTeamMembers,
  useUpdateTeam,
  useDeleteTeam,
  useAddTeamMember,
  useRemoveTeamMember,
} from '@/hooks/teams/useTeams';
import { useOrganizationMembers } from '@/hooks/organization/useOrganizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const updateTeamSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().uuid('Please select a user'),
  role: z.string().optional(),
});

type UpdateTeamForm = z.infer<typeof updateTeamSchema>;
type AddMemberForm = z.infer<typeof addMemberSchema>;

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const teamId = params.teamId as string;

  const [membersPage, setMembersPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: org } = useOrganization(orgId);
  const { data: userRole } = useUserRole(orgId);
  const { data: team, isLoading: teamLoading } = useTeam(orgId, teamId);
  const { data: membersData, isLoading: membersLoading } = useTeamMembers(
    orgId,
    teamId,
    membersPage,
    debouncedSearch || undefined,
    sortBy,
    sortOrder
  );
  const { data: orgMembers } = useOrganizationMembers(orgId, 1);
  const updateTeam = useUpdateTeam(orgId, teamId);
  const deleteTeam = useDeleteTeam(orgId, teamId);
  const addMember = useAddTeamMember(orgId, teamId);
  const removeMember = useRemoveTeamMember(orgId, teamId);

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors },
    reset: resetEdit,
    setValue: setEditValue,
    watch: watchEdit,
  } = useForm<UpdateTeamForm>({
    resolver: zodResolver(updateTeamSchema),
  });

  const {
    register: registerAdd,
    handleSubmit: handleAddSubmit,
    formState: { errors: addErrors },
    reset: resetAdd,
    setValue: setAddValue,
  } = useForm<AddMemberForm>({
    resolver: zodResolver(addMemberSchema),
  });

  useEffect(() => {
    if (userRole === 'MEMBER') {
      router.replace(`/orgs/${orgId}/my-work`);
    }
  }, [userRole, orgId, router]);

  useEffect(() => {
    if (team && isEditDialogOpen) {
      setEditValue('name', team.name);
      setEditValue('description', team.description || '');
    }
  }, [team, isEditDialogOpen, setEditValue]);

  const onEditSubmit = async (data: UpdateTeamForm) => {
    try {
      await updateTeam.mutateAsync(data);
      setIsEditDialogOpen(false);
      resetEdit();
    } catch (error) {
      console.error('Failed to update team:', error);
    }
  };

  const onAddMemberSubmit = async (data: AddMemberForm) => {
    try {
      await addMember.mutateAsync(data);
      setIsAddMemberDialogOpen(false);
      resetAdd();
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTeam.mutateAsync();
      router.push(`/orgs/${orgId}/overview`);
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await removeMember.mutateAsync(userId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  if (teamLoading) {
    return <div>Loading...</div>;
  }

  if (!team) {
    return <div>Team not found</div>;
  }

  if (userRole !== 'ADMIN' && userRole !== 'MAINTAINER') {
    return <div>Access denied. Insufficient permissions.</div>;
  }

  const availableMembers = orgMembers?.members.filter(
    (member) => !membersData?.members.some((tm) => tm.userId === member.user.id)
  ) || [];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{org?.name}</h1>
        {org?.legalName && (
          <p className="text-muted-foreground">{org.legalName}</p>
        )}
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="members">Team Members</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{team.name}</CardTitle>
                  {team.description && (
                    <CardDescription>{team.description}</CardDescription>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Created by</p>
                <p className="text-sm text-muted-foreground">
                  {team.creator.name || team.creator.email}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Created on</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(team.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Statistics</p>
                <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                  <span>Members: {team._count.members}</span>
                  <span>Projects: {team._count.projectLinks}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Members</CardTitle>
                <Button onClick={() => setIsAddMemberDialogOpen(true)}>
                  Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setMembersPage(1);
                    }}
                    className="flex-1"
                  />
                  <Select
                    value={sortBy}
                    onValueChange={(value) => {
                      setSortBy(value);
                      setMembersPage(1);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="role">Role</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={sortOrder}
                    onValueChange={(value) => {
                      setSortOrder(value);
                      setMembersPage(1);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {membersLoading ? (
                  <div>Loading members...</div>
                ) : membersData && membersData.members.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {membersData.members.map((member) => (
                          <TableRow key={member.userId}>
                            <TableCell className="font-medium">
                              {member.user.name || 'N/A'}
                            </TableCell>
                            <TableCell>{member.user.email}</TableCell>
                            <TableCell>{member.role || 'N/A'}</TableCell>
                            <TableCell>
                              {new Date(member.joinedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveMember(member.userId)}
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {membersData.pagination && membersData.pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          Page {membersData.pagination.page} of{' '}
                          {membersData.pagination.totalPages} (
                          {membersData.pagination.total} total)
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setMembersPage((p) => Math.max(1, p - 1))
                            }
                            disabled={!membersData.pagination.hasPrev}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMembersPage((p) => p + 1)}
                            disabled={!membersData.pagination.hasNext}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No members yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>
              Update team name and description
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...registerEdit('name')}
                placeholder="Team name"
              />
              {editErrors.name && (
                <p className="text-sm text-red-600">{editErrors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...registerEdit('description')}
                placeholder="Team description"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  resetEdit();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateTeam.isPending}>
                {updateTeam.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Select a member from the organization to add to this team
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit(onAddMemberSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">Member *</Label>
              <Select
                onValueChange={(value) => setAddValue('userId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {availableMembers.map((member) => (
                    <SelectItem key={member.user.id} value={member.user.id}>
                      {member.user.name || member.user.email} ({member.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addErrors.userId && (
                <p className="text-sm text-red-600">{addErrors.userId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role (Optional)</Label>
              <Input
                id="role"
                {...registerAdd('role')}
                placeholder="Team role"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddMemberDialogOpen(false);
                  resetAdd();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addMember.isPending}>
                {addMember.isPending ? 'Adding...' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the team
              and remove all team members.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTeam.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
