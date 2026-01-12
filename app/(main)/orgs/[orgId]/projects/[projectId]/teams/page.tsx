'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProjectTeams, useAssignTeamToProject, useRemoveTeamFromProject } from '@/hooks/projects/useProjects';
import { useOrganizationTeams } from '@/hooks/organization/useOrganizations';
import { useUserRole } from '@/hooks/organization/useOrganizations';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Trash2, Search } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function ProjectTeamsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);
  const { data: projectTeams, isLoading: teamsLoading } = useProjectTeams(orgId, projectId);
  const { data: orgTeams, isLoading: orgTeamsLoading } = useOrganizationTeams(orgId);
  const assignTeam = useAssignTeamToProject(orgId, projectId);
  const removeTeam = useRemoveTeamFromProject(orgId, projectId);
  const { toast } = useToast();

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const isAdminOrMaintainer = userRole === 'ADMIN' || userRole === 'MAINTAINER';

  if (roleLoading) {
    return <div>Loading...</div>;
  }

  if (!isAdminOrMaintainer) {
    router.push(`/orgs/${orgId}/projects/${projectId}/dashboard`);
    return null;
  }

  const assignedTeamIds = new Set(projectTeams?.map((t) => t.id) || []);
  const availableTeams = orgTeams?.filter(
    (team) =>
      !assignedTeamIds.has(team.id) &&
      (debouncedSearch === '' ||
        team.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        team.description?.toLowerCase().includes(debouncedSearch.toLowerCase()))
  ) || [];

  const filteredProjectTeams =
    projectTeams?.filter(
      (team) =>
        debouncedSearch === '' ||
        team.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        team.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
    ) || [];

  const handleAssignTeam = async () => {
    if (!selectedTeamId) {
      toast({
        title: 'Error',
        description: 'Please select a team',
        variant: 'destructive',
      });
      return;
    }

    try {
      await assignTeam.mutateAsync(selectedTeamId);
      toast({
        title: 'Success',
        description: 'Team assigned successfully',
      });
      setIsAssignDialogOpen(false);
      setSelectedTeamId('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to assign team',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to remove this team from the project?')) {
      return;
    }

    try {
      await removeTeam.mutateAsync(teamId);
      toast({
        title: 'Success',
        description: 'Team removed successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to remove team',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project Teams</h1>
          <p className="text-muted-foreground">
            Manage teams assigned to this project
          </p>
        </div>
        <Button onClick={() => setIsAssignDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Assign Team
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assigned Teams</CardTitle>
          <CardDescription>
            Teams currently assigned to this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {teamsLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading teams...</div>
          ) : filteredProjectTeams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No teams match your search' : 'No teams assigned to this project'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjectTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {team.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <Users className="mr-1 h-3 w-3" />
                        {team._count.members}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(team.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTeam(team.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Team to Project</DialogTitle>
            <DialogDescription>
              Select a team to assign to this project
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {orgTeamsLoading ? (
              <div className="text-center py-4 text-muted-foreground">Loading teams...</div>
            ) : availableTeams.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No available teams to assign
              </div>
            ) : (
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {availableTeams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex flex-col">
                        <span>{team.name}</span>
                        {team.description && (
                          <span className="text-xs text-muted-foreground">
                            {team.description}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignDialogOpen(false);
                setSelectedTeamId('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssignTeam}
              disabled={!selectedTeamId || assignTeam.isPending}
            >
              {assignTeam.isPending ? 'Assigning...' : 'Assign Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
