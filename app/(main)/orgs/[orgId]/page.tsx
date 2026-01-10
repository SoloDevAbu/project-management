'use client';

import { useParams } from 'next/navigation';
import { useOrganization } from '@/hooks/organization/useOrganizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function OrganizationPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { data: org, isLoading } = useOrganization(orgId);

  if (isLoading) {
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
                  {org.members?.length || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Teams</CardDescription>
                <CardTitle className="text-2xl">
                  {org.members?.length || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Projects</CardDescription>
                <CardTitle className="text-2xl">
                  {org.projects?.length || 0}
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
              {org.members && org.members.length > 0 ? (
                <div className="space-y-2">
                  {org.members.map((member) => (
                    <div
                      key={member.user.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <p className="font-medium">{member.user.name || member.user.email}</p>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                      <span className="text-sm">{member.role}</span>
                    </div>
                  ))}
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
              {org.members && org.members.length > 0 ? (
                <div className="space-y-2">
                  {org.members.map((member) => (
                    <div
                      key={member.user.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <p className="font-medium">{member.user.name || member.user.email}</p>
                      </div>
                      <span className="text-sm">
                        {member.role}
                      </span>
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
              {org.projects && org.projects.length > 0 ? (
                <div className="space-y-2">
                  {org.projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-muted-foreground">{project.code}</p>
                      </div>
                      <span className="text-sm">{project.status}</span>
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

