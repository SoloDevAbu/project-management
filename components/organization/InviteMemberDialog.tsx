'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useSearchUser,
  useInviteMember,
  type SearchUserResult,
} from '@/hooks/organization/useOrganizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['MAINTAINER', 'MEMBER']).default('MEMBER'),
});

type InviteMemberForm = z.infer<typeof inviteMemberSchema>;

interface InviteMemberDialogProps {
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({
  orgId,
  open,
  onOpenChange,
}: InviteMemberDialogProps) {
  const [searchResult, setSearchResult] = useState<SearchUserResult | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  
  const searchUser = useSearchUser(orgId);
  const inviteMember = useInviteMember(orgId);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<InviteMemberForm>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      role: 'MEMBER',
    },
  });

  const role = watch('role');
  const email = watch('email');

  useEffect(() => {
    if (open) {
      reset({
        email: '',
        role: 'MEMBER',
      });
      setSearchResult(null);
      setSearchEmail('');
      setHasSearched(false);
    }
  }, [open, reset]);

  const handleSearch = async () => {
    if (!email) return;
    
    setSearchEmail(email);
    setHasSearched(true);
    try {
      const result = await searchUser.mutateAsync(email);
      setSearchResult(result);
    } catch (error) {
      console.error('Failed to search user:', error);
      setSearchResult(null);
    }
  };

  const onSubmit = async (data: InviteMemberForm) => {
    try {
      await inviteMember.mutateAsync({
        email: data.email,
        role: data.role,
      });

      reset();
      setSearchResult(null);
      setSearchEmail('');
      setHasSearched(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to invite/add member:', error);
    }
  };

  const handleCancel = () => {
    reset();
    setSearchResult(null);
    setSearchEmail('');
    setHasSearched(false);
    onOpenChange(false);
  };

  const canAddMember = searchResult?.exists && !searchResult.isMember;
  const userExists = searchResult?.exists;
  const isExistingMember = searchResult?.isMember;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Search for a user by email or send an invite to a new user
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="user@example.com"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearch}
                disabled={!email || searchUser.isPending}
              >
                {searchUser.isPending ? 'Searching...' : 'Search'}
              </Button>
            </div>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {hasSearched && (
            <div className="space-y-3">
              {searchUser.isPending ? (
                <div className="text-sm text-muted-foreground">Searching...</div>
              ) : searchResult ? (
                <>
                  {userExists && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {searchResult.user?.name || searchResult.user?.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {searchResult.user?.email}
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {isExistingMember && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        This user is already a member of this organization
                      </AlertDescription>
                    </Alert>
                  )}

                  {!userExists && (
                    <Alert>
                      <AlertDescription>
                        User doesn't exist. An invite will be sent to this email.
                      </AlertDescription>
                    </Alert>
                  )}

                  {(canAddMember || !userExists) && (
                    <div className="space-y-2">
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={role}
                        onValueChange={(value) => setValue('role', value as 'MAINTAINER' | 'MEMBER')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MAINTAINER">Maintainer</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    Failed to search user. Please try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={inviteMember.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                inviteMember.isPending ||
                !hasSearched ||
                !searchResult ||
                isExistingMember
              }
            >
              {inviteMember.isPending
                ? 'Processing...'
                : userExists && canAddMember
                ? 'Add Member'
                : !userExists
                ? 'Send Invite'
                : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
