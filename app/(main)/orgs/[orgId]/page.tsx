'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  useOrganization,
  useOrganizationMembers,
  useOrganizationTeams,
  useOrganizationProjects,
} from '@/hooks/organization/useOrganizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';

export default function OrganizationPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const [membersPage, setMembersPage] = useState(1);
  
  const { data: org, isLoading: orgLoading } = useOrganization(orgId);
  const { data: membersData, isLoading: membersLoading } = useOrganizationMembers(orgId, membersPage);
  const { data: teams, isLoading: teamsLoading } = useOrganizationTeams(orgId);
  const { data: projects, isLoading: projectsLoading } = useOrganizationProjects(orgId);

  if (orgLoading) {
    return <div>Loading...</div>;
  }

  if (!org) {
    return <div>Organization not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{org.name}</h1>
        {org.legalName && (
          <p className="text-muted-foreground">{org.legalName}</p>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Members</CardDescription>
                <CardTitle className="text-2xl">
                  {org._count?.members || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Teams</CardDescription>
                <CardTitle className="text-2xl">
                  {org._count?.teams || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Projects</CardDescription>
                <CardTitle className="text-2xl">
                  {org._count?.projects || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Status</CardDescription>
                <CardTitle className="text-2xl">{org.status}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {org.country && <p><strong>Country:</strong> {org.country}</p>}
              {org.address && <p><strong>Address:</strong> {org.address}</p>}
              {org.contactEmail && (
                <p><strong>Contact Email:</strong> {org.contactEmail}</p>
              )}
              {org.contactPhone && (
                <p><strong>Contact Phone:</strong> {org.contactPhone}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Members</CardTitle>
                <Button>Invite Member</Button>
              </div>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div>Loading members...</div>
              ) : membersData && membersData.members.length > 0 ? (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {membersData.members.map((member) => (
                        <TableRow key={member.user.id}>
                          <TableCell className="font-medium">
                            {member.user.name || 'N/A'}
                          </TableCell>
                          <TableCell>{member.user.email}</TableCell>
                          <TableCell>{member.role}</TableCell>
                          <TableCell>
                            {new Date(member.joinedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {membersData.pagination && membersData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Page {membersData.pagination.page} of {membersData.pagination.totalPages} 
                        ({membersData.pagination.total} total)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMembersPage((p) => Math.max(1, p - 1))}
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
                </div>
              ) : (
                <p className="text-muted-foreground">No members yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Teams</CardTitle>
                <Button>Create Team</Button>
              </div>
            </CardHeader>
            <CardContent>
              {teamsLoading ? (
                <div>Loading teams...</div>
              ) : teams && teams.length > 0 ? (
                <div className="space-y-2">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-4 border rounded"
                    >
                      <div>
                        <p className="font-medium">{team.name}</p>
                        {team.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {team.description}
                          </p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                          <span>Members: {team._count.members}</span>
                          <span>Projects: {team._count.projectLinks}</span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Created by {team.creator.name || team.creator.email}</p>
                        <p>{new Date(team.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No teams yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Projects</CardTitle>
                <Button asChild>
                  <Link href={`/orgs/${orgId}/projects/new`}>Create Project</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {projectsLoading ? (
                <div>Loading projects...</div>
              ) : projects && projects.length > 0 ? (
                <div className="space-y-2">
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-4 border rounded"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{project.code}</p>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm">{project.status}</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No projects yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

