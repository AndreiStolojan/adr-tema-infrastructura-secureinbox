import {
  AlertTriangle,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

import { getDashboardSummary } from '@/api/emailsApi';
import { DashboardSkeleton, ErrorState } from '@/components/common/states';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { RiskDonut } from '@/components/dashboard/RiskDonut';
import { TopRulesChart } from '@/components/dashboard/TopRulesChart';
import { EmailRow } from '@/components/inbox/EmailRow';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/useApi';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/lib/risk';
import { showDemoMessage } from '@/lib/demo';

export function DashboardPage() {
  const query = useApi(getDashboardSummary, [], 'dashboard-summary');

  if (query.loading && !query.data) return <DashboardSkeleton />;
  if (query.error) return <ErrorState message={query.error} onRetry={query.reload} />;

  const data = query.data || {};
  const counts = data.counts || {};
  const distribution = data.distribution || {};
  const donut = [
    {
      name: CATEGORY_LABELS.safe,
      value: distribution.safe || 0,
      color: CATEGORY_COLORS.safe,
    },
    {
      name: CATEGORY_LABELS.suspicious,
      value: distribution.needs_review || 0,
      color: CATEGORY_COLORS.suspicious,
    },
    {
      name: CATEGORY_LABELS.likely_phishing,
      value: distribution.quarantine || 0,
      color: CATEGORY_COLORS.likely_phishing,
    },
    {
      name: CATEGORY_LABELS.unscanned,
      value: distribution.unscanned || 0,
      color: CATEGORY_COLORS.unscanned,
    },
  ];
  const ids = (data.recentEmails || []).map((email) => email._id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Local dataset"
        title="Security overview"
        description="Rule-based results for fictitious messages stored in MongoDB."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              showDemoMessage('Mailbox refresh is disabled in this demo.')
            }
          >
            <RefreshCw />
            Refresh
          </Button>
        }
      />

      <div className="rounded-lg border border-primary/20 bg-primary/[0.05] px-4 py-3 text-sm text-muted-foreground">
        This environment uses synthetic data. No Gmail account is connected and
        no external AI service is called.
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Mail} label="Messages" value={counts.total || 0} to="/inbox" />
        <StatCard icon={ShieldCheck} label="Safe" value={counts.safe || 0} tone="text-risk-safe" />
        <StatCard icon={AlertTriangle} label="Suspicious" value={counts.suspicious || 0} tone="text-risk-review" />
        <StatCard icon={ShieldAlert} label="Likely phishing" value={counts.likelyPhishing || 0} tone="text-risk-quarantine" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <RiskDonut data={donut} centerValue={counts.total || 0} centerLabel="messages" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Most common warning signs</CardTitle>
          </CardHeader>
          <CardContent>
            <TopRulesChart rules={data.topRules || []} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent messages</CardTitle>
        </CardHeader>
        <div className="divide-y divide-border/60">
          {(data.recentEmails || []).map((email) => (
            <EmailRow key={email._id} email={email} linkState={{ ids }} compact />
          ))}
        </div>
      </Card>
    </div>
  );
}
