'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateOrganization } from '@/hooks/organization/useOrganizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  legalName: z.string().optional(),
  country: z.string().optional(),
  address: z.string().optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
});

type CreateOrgForm = z.infer<typeof createOrgSchema>;

export default function NewOrganizationPage() {
  const router = useRouter();
  const createOrg = useCreateOrganization();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrgForm>({
    resolver: zodResolver(createOrgSchema),
  });

  const onSubmit = async (data: CreateOrgForm) => {
    try {
      const org = await createOrg.mutateAsync({
        name: data.name,
        legalName: data.legalName,
        country: data.country,
        address: data.address,
        contactEmail: data.contactEmail || undefined,
        contactPhone: data.contactPhone,
      });

      router.push(`/orgs/${org.id}`);
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Organization</CardTitle>
          <CardDescription>
            Create a new organization to manage projects and teams
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Acme Inc."
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name</Label>
              <Input
                id="legalName"
                {...register('legalName')}
                placeholder="Acme Inc. Corporation"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...register('country')}
                placeholder="United States"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register('address')}
                placeholder="123 Main St, City, State"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                {...register('contactEmail')}
                placeholder="contact@example.com"
              />
              {errors.contactEmail && (
                <p className="text-sm text-red-600">{errors.contactEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                {...register('contactPhone')}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createOrg.isPending}>
                {createOrg.isPending ? 'Creating...' : 'Create Organization'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

