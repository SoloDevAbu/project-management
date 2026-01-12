'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useProject } from '@/hooks/projects/useProjects';
import { useUserRole } from '@/hooks/organization/useOrganizations';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { LayoutDashboard, CheckSquare, Clock, FileText, Settings, Users } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

function ProjectHeader({ 
  orgId, 
  project 
}: { 
  orgId: string; 
  project: { name: string; code: string } 
}) {
  const { state } = useSidebar();
  
  if (state === 'collapsed') {
    return null;
  }
  
  return (
    <Link href={`/orgs/${orgId}/overview`} className="flex-1 block">
      <div className="font-semibold text-sm truncate">{project.name}</div>
      <div className="text-xs text-muted-foreground truncate">
        {project.code}
      </div>
    </Link>
  );
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params.orgId as string;
  const projectId = params.projectId as string;

  const { data: project, isLoading: projectLoading } = useProject(orgId, projectId);
  const { data: userRole, isLoading: roleLoading } = useUserRole(orgId);

  const basePath = `/orgs/${orgId}/projects/${projectId}`;
  const isAdminOrMaintainer = userRole === 'ADMIN' || userRole === 'MAINTAINER';

  const navItems = [
    {
      title: 'Dashboard',
      icon: LayoutDashboard,
      href: `${basePath}/dashboard`,
    },
    {
      title: 'Tasks',
      icon: CheckSquare,
      href: `${basePath}/tasks`,
    },
    {
      title: 'Work Logs',
      icon: Clock,
      href: `${basePath}/work-logs`,
    },
    {
      title: 'Audit',
      icon: FileText,
      href: `${basePath}/audit`,
    },
    ...(isAdminOrMaintainer
      ? [
          {
            title: 'Teams',
            icon: Users,
            href: `${basePath}/teams`,
          },
          {
            title: 'Settings',
            icon: Settings,
            href: `${basePath}/settings`,
          },
        ]
      : []),
  ];

  const { data: session } = useSession();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex items-center gap-2 px-2 py-2">
                {projectLoading ? (
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-16 bg-muted animate-pulse rounded mt-1" />
                  </div>
                ) : project ? (
                  <ProjectHeader orgId={orgId} project={project} />
                ) : null}
                <SidebarTrigger className="-ml-1" />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <div className="flex items-center gap-4 flex-1">
            <Link href="/" className="text-sm hover:underline">
              Organizations
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: '/signin' })}
            >
              Sign Out
            </Button>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
