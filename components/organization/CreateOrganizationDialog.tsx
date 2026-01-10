'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateOrganization } from '@/hooks/organization/useOrganizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  legalName: z.string().min(1, 'Legal name is required'),
  country: z.string().min(1, 'Country is required'),
  address: z.string().min(1, 'Address is required'),
  contactEmail: z.string().email('Invalid email').min(1, 'Contact email is required'),
  contactPhone: z.string().min(1, 'Contact phone is required'),
});

type CreateOrgForm = z.infer<typeof createOrgSchema>;

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: CreateOrganizationDialogProps) {
  const router = useRouter();
  const createOrg = useCreateOrganization();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
  } = useForm<CreateOrgForm>({
    resolver: zodResolver(createOrgSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    if (open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateOrgForm) => {
    try {
      const org = await createOrg.mutateAsync({
        name: data.name,
        legalName: data.legalName,
        country: data.country,
        address: data.address,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      });

      reset();
      onOpenChange(false);
      router.push(`/orgs/${org.id}`);
    } catch (error) {
      console.error('Failed to create organization:', error);
    }
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to manage projects and teams
          </DialogDescription>
        </DialogHeader>
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
            <Label htmlFor="legalName">Legal Name *</Label>
            <Input
              id="legalName"
              {...register('legalName')}
              placeholder="Acme Inc. Corporation"
            />
            {errors.legalName && (
              <p className="text-sm text-red-600">{errors.legalName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country *</Label>
            <Input
              id="country"
              {...register('country')}
              placeholder="United States"
            />
            {errors.country && (
              <p className="text-sm text-red-600">{errors.country.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="123 Main St, City, State"
            />
            {errors.address && (
              <p className="text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email *</Label>
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
            <Label htmlFor="contactPhone">Contact Phone *</Label>
            <Input
              id="contactPhone"
              {...register('contactPhone')}
              placeholder="+1 (555) 123-4567"
            />
            {errors.contactPhone && (
              <p className="text-sm text-red-600">{errors.contactPhone.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={createOrg.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createOrg.isPending || !isValid || !isDirty}>
              {createOrg.isPending ? 'Creating...' : 'Create Organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
