'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { Link2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { api, ApiError } from '@/lib/api/client';
import { Button } from '@/components/primitives/Button';
import { PlainInput } from '@/components/admin/AdminFields';
import { useToast } from '@/components/providers/ToastProvider';

/** Paste a government page; the server reads it into a draft and opens it for review. */
export function SubmitLinkForm() {
  const p = useTranslations('adminPortal');
  const te = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | undefined>();

  const submit = useMutation({
    mutationFn: () => api.post<{ candidate: { id: string }; existing: boolean }>('/admin/candidates', { url }),
    onSuccess: (data) => {
      toast.show({ tone: 'success', message: data.existing ? p('candidates.alreadyQueued') : p('candidates.queued') });
      router.push(`/admin/candidates/${data.candidate.id}`);
    },
    onError: (e) => {
      const message = e instanceof ApiError ? (e.fields?.url ?? e.message) : te('genericBody');
      setError(message);
    },
  });

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        submit.mutate();
      }}
    >
      <PlainInput
        id="candidate-url"
        type="url"
        inputMode="url"
        required
        placeholder="https://dss.gov.bd/pages/…"
        label={p('candidates.submitLabel')}
        hint={p('candidates.submitHelp')}
        error={error}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1"
      />
      <Button
        type="submit"
        size="md"
        loading={submit.isPending}
        loadingLabel={p('candidates.submitting')}
        leadingIcon={<Link2 size={18} className="icon" />}
      >
        {p('candidates.submit')}
      </Button>
    </form>
  );
}
