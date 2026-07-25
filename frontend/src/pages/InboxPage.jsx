import { useMemo, useState } from 'react';
import { Mail, RefreshCw, Search } from 'lucide-react';

import { getEmails } from '@/api/emailsApi';
import { PageHeader } from '@/components/common/PageHeader';
import {
  EmptyState,
  ErrorState,
  InboxSkeleton,
} from '@/components/common/states';
import { Pagination } from '@/components/common/Pagination';
import { EmailRow } from '@/components/inbox/EmailRow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useApi } from '@/hooks/useApi';
import { normalizeEmailList } from '@/lib/email-list';
import { showDemoMessage } from '@/lib/demo';
import { RISK_FILTERS } from '@/lib/risk';
import { cn } from '@/lib/utils';

export function InboxPage() {
  const [search, setSearch] = useState('');
  const [riskBucket, setRiskBucket] = useState('');
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ search, riskBucket, page, limit: 10 }),
    [search, riskBucket, page]
  );
  const query = useApi(
    () => getEmails(params),
    [search, riskBucket, page],
    `inbox-${search}-${riskBucket}-${page}`
  );
  const emails = normalizeEmailList(query.data);
  const pagination = query.data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const ids = emails.map((email) => email._id);

  const chooseRisk = (value) => {
    setRiskBucket(value);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Synthetic inbox"
        title="Inbox"
        description={`${pagination.total || 0} fictitious messages in the local demo dataset.`}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              showDemoMessage('Mailbox synchronization is disabled.')
            }
          >
            <RefreshCw />
            Sync
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search sender, subject or content"
            className="h-10 w-full rounded-md border border-input bg-transparent pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {RISK_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => chooseRisk(filter.key)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition-colors',
                riskBucket === filter.key
                  ? 'border-primary bg-primary/15 text-foreground'
                  : 'border-border text-muted-foreground hover:bg-accent'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {query.loading && !query.data ? (
        <InboxSkeleton />
      ) : query.error ? (
        <ErrorState message={query.error} onRetry={query.reload} />
      ) : emails.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No messages found"
          description="The next step will add an idempotent demo seed for this account."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border/60">
            {emails.map((email) => (
              <EmailRow key={email._id} email={email} linkState={{ ids }} />
            ))}
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPage={setPage}
          />
        </Card>
      )}
    </div>
  );
}
