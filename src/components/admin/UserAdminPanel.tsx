'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, LogOut, Unlock, Eye, Ban, RotateCcw, Trash2, ShieldCheck } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api/client';
import { Button } from '@/components/primitives/Button';
import { Banner } from '@/components/primitives/Banner';
import { Card } from '@/components/primitives/Card';
import { NativeSelect, PlainInput } from '@/components/admin/AdminFields';
import { useToast } from '@/components/providers/ToastProvider';
import { ROLE_RANK, USER_ROLES, type UserRole } from '@/lib/domain/enums';

type Action = 'force_logout' | 'unlock' | 'reset_code' | 'reveal_phone' | 'suspend' | 'reactivate';

/**
 * The actions an administrator can take on one person. Each asks for a short
 * reason, which goes to the audit log with the action. The server enforces
 * every rule shown here; the UI only hides what would be refused.
 */
export function UserAdminPanel({
  user,
  viewerRole,
  isSelf,
}: {
  readonly user: { id: string; name: string; role: UserRole; status: string; locked: boolean };
  readonly viewerRole: UserRole;
  readonly isSelf: boolean;
}) {
  const p = useTranslations('adminPortal');
  const te = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();

  const [pending, setPending] = useState<Action | 'delete' | 'role' | null>(null);
  const [reason, setReason] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [role, setRole] = useState<UserRole>(user.role);
  const [resetCode, setResetCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [phone, setPhone] = useState<string | null>(null);

  const isAdmin = ROLE_RANK[viewerRole] >= ROLE_RANK.administrator;
  const outranks = ROLE_RANK[viewerRole] > ROLE_RANK[user.role];
  const canAct = isAdmin && outranks && !isSelf;

  const onError = (error: unknown) =>
    toast.show({ tone: 'error', message: error instanceof ApiError ? error.message : te('genericBody') });

  const act = useMutation({
    mutationFn: (action: Action) =>
      api.post<{ code?: string; expiresAt?: string; phone?: string; revoked?: number }>(`/admin/users/${user.id}/actions`, {
        action,
        reason,
      }),
    onSuccess: (data, action) => {
      setPending(null);
      setReason('');
      if (action === 'reset_code' && data.code && data.expiresAt) setResetCode({ code: data.code, expiresAt: data.expiresAt });
      else if (action === 'reveal_phone' && data.phone) setPhone(data.phone);
      else {
        toast.show({
          tone: 'success',
          message: typeof data.revoked === 'number' && data.revoked > 0 ? p('user.revoked', { count: data.revoked }) : p('saved'),
        });
      }
      router.refresh();
    },
    onError,
  });

  const changeRole = useMutation({
    mutationFn: () => api.patch('/admin/users', { userId: user.id, role }),
    onSuccess: () => {
      setPending(null);
      toast.show({ tone: 'success', message: p('saved') });
      router.refresh();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/admin/users/${user.id}`, { reason, confirmName }),
    onSuccess: () => {
      toast.show({ tone: 'success', message: p('user.deleted') });
      router.push('/admin/users');
    },
    onError,
  });

  if (isSelf) return <Banner tone="info" statusWord={p('note')}>{p('user.cannotSelf')}</Banner>;
  if (!isAdmin) return <Banner tone="info" statusWord={p('note')}>{p('onlyAdmin')}</Banner>;
  if (!outranks) return <Banner tone="info" statusWord={p('note')}>{p('user.cannotRank')}</Banner>;

  const actions: { action: Action; label: string; icon: typeof LogOut; show: boolean; danger?: boolean }[] = [
    { action: 'reveal_phone', label: p('user.revealPhone'), icon: Eye, show: true },
    { action: 'reset_code', label: p('user.resetCode'), icon: KeyRound, show: user.status === 'active' },
    { action: 'unlock', label: p('user.unlock'), icon: Unlock, show: user.locked },
    { action: 'force_logout', label: p('user.forceLogout'), icon: LogOut, show: true },
    { action: 'suspend', label: p('user.suspend'), icon: Ban, show: user.status === 'active', danger: true },
    { action: 'reactivate', label: p('user.reactivate'), icon: RotateCcw, show: user.status === 'suspended' },
  ];

  const reasonField = (
    <PlainInput
      id="admin-reason"
      label={p('reason')}
      hint={p('reasonHelp')}
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      maxLength={500}
      autoFocus
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {resetCode ? (
        <Card padding="default" className="flex flex-col gap-2 border-stroke-brand">
          <p className="type-label-md text-text-primary">{p('user.resetCodeTitle')}</p>
          <p className="type-display-sm tabular tracking-[0.3em] text-text-primary" aria-live="polite">
            {resetCode.code}
          </p>
          <p className="type-body-md text-text-secondary">{p('user.resetCodeHelp', { minutes: 15 })}</p>
        </Card>
      ) : null}

      {phone ? (
        <Card padding="default">
          <p className="type-label-md text-text-secondary">{p('user.fullNumber')}</p>
          <p className="type-heading-md tabular text-text-primary">{phone}</p>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {actions
          .filter((a) => a.show && canAct)
          .map(({ action, label, icon: Icon, danger }) => (
            <Button
              key={action}
              variant={danger ? 'danger-subtle' : 'secondary'}
              size="md"
              aria-expanded={pending === action}
              onClick={() => {
                setPending(pending === action ? null : action);
                setReason('');
              }}
              leadingIcon={<Icon size={18} className="icon" />}
            >
              {label}
            </Button>
          ))}
      </div>

      {pending && pending !== 'delete' && pending !== 'role' ? (
        <Card padding="default" className="flex flex-col gap-3">
          {reasonField}
          <div className="flex gap-2">
            <Button
              size="md"
              variant={pending === 'suspend' ? 'danger' : 'primary'}
              disabled={reason.trim().length < 3}
              loading={act.isPending}
              loadingLabel={p('confirm')}
              onClick={() => act.mutate(pending)}
            >
              {p('confirm')}
            </Button>
            <Button size="md" variant="tertiary" onClick={() => setPending(null)}>
              {p('cancel')}
            </Button>
          </div>
        </Card>
      ) : null}

      <Card padding="default" className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <NativeSelect
            id="role-select"
            label={p('user.changeRole')}
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={USER_ROLES.filter((r) => r !== 'guest' && (ROLE_RANK[r] < ROLE_RANK[viewerRole] || r === user.role)).map((r) => ({
              value: r,
              label: p(`role.${r}`),
            }))}
            className="sm:w-64"
          />
          <Button
            size="md"
            variant="secondary"
            disabled={role === user.role}
            loading={changeRole.isPending}
            loadingLabel={p('user.saveRole')}
            onClick={() => changeRole.mutate()}
            leadingIcon={<ShieldCheck size={18} className="icon" />}
          >
            {p('user.saveRole')}
          </Button>
        </div>
      </Card>

      {viewerRole === 'super_admin' ? (
        <Card padding="default" className="flex flex-col gap-3">
          <Button
            variant="danger-subtle"
            size="md"
            aria-expanded={pending === 'delete'}
            onClick={() => setPending(pending === 'delete' ? null : 'delete')}
            leadingIcon={<Trash2 size={18} className="icon" />}
          >
            {p('user.delete')}
          </Button>
          {pending === 'delete' ? (
            <>
              <Banner tone="warning" statusWord={p('warning')}>{p('user.deleteWarning')}</Banner>
              {reasonField}
              <PlainInput
                id="confirm-name"
                label={p('user.deleteConfirm', { name: user.name })}
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
              />
              <Button
                variant="danger"
                size="md"
                disabled={reason.trim().length < 3 || confirmName.trim() !== user.name}
                loading={remove.isPending}
                loadingLabel={p('user.delete')}
                onClick={() => remove.mutate()}
              >
                {p('user.delete')}
              </Button>
            </>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
