'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useOrganizations } from '@/hooks/organization/useOrganizations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CreateOrganizationDialog } from '@/components/organization/CreateOrganizationDialog';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { data: orgs, isLoading } = useOrganizations();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    router.push('/signin');
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Organizations</h1>
          <p className="text-muted-foreground">
            Manage your organizations and projects
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Create Organization
        </Button>
      </div>

      {isLoading ? (
        <div>Loading organizations...</div>
      ) : orgs && orgs.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <Card key={org.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-start gap-2">
                  <CardTitle>{org.name}</CardTitle>
                  {org.userRole && (
                    <Badge variant="outline" className="text-xs">
                      {org.userRole}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {org.legalName || 'No legal name'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Status: {org.status}
                  </p>
                  {org.userRole && (
                    <p className="text-sm text-muted-foreground">
                      Your Role: {org.userRole}
                    </p>
                  )}
                  {org._count?.members && (
                    <p className="text-sm text-muted-foreground">
                      Members: {org._count.members}
                    </p>
                  )}
                  <Button asChild className="w-full mt-4">
                    <Link href={`/orgs/${org.id}/overview`}>View Organization</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No organizations yet</CardTitle>
            <CardDescription>
              Create your first organization to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              Create Organization
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateOrganizationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}

