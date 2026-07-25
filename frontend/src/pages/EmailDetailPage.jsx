import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Link2,
  Paperclip,
  ScanLine,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { getEmail, getEmailRaw } from '@/api/emailsApi';
import { getLatestScan } from '@/api/scansApi';
import { ErrorState, LoadingState } from '@/components/common/states';
import { EmailBody } from '@/components/inbox/EmailBody';
import { ScanDetails } from '@/components/security/ScanDetails';
import { RiskBadge } from '@/components/security/RiskBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getSenderName } from '@/lib/email';
import { showDemoMessage } from '@/lib/demo';
import { formatDateTime } from '@/utils/formatDate';

export function EmailDetailPage() {
  const { emailId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ids = location.state?.ids || [];
  const index = ids.indexOf(emailId);
  const previousId = index > 0 ? ids[index - 1] : null;
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null;

  const [email, setEmail] = useState(null);
  const [raw, setRaw] = useState(null);
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [emailResult, rawResult, scanResult] = await Promise.allSettled([
        getEmail(emailId),
        getEmailRaw(emailId),
        getLatestScan(emailId),
      ]);
      if (emailResult.status === 'rejected') throw emailResult.reason;
      setEmail(emailResult.value);
      setRaw(rawResult.status === 'fulfilled' ? rawResult.value : null);
      setScan(scanResult.status === 'fulfilled' ? scanResult.value : null);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load this message.');
    } finally {
      setLoading(false);
    }
  }, [emailId]);

  useEffect(() => {
    load();
  }, [load]);

  const openSibling = (id) =>
    navigate(`/inbox/${id}`, { state: { ids }, replace: true });

  if (loading && !email) return <LoadingState label="Loading message…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!email) return null;

  const links = raw?.links || [];
  const attachments = raw?.attachmentExtensions || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/inbox')}>
          <ArrowLeft />
          Back to inbox
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!previousId}
            onClick={() => previousId && openSibling(previousId)}
            aria-label="Previous message"
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!nextId}
            onClick={() => nextId && openSibling(nextId)}
            aria-label="Next message"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <RiskBadge riskBucket={email.riskBucket} />
            <h1 className="text-h3 font-semibold">{email.subject || '(no subject)'}</h1>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {email.displayName || getSenderName(email)}
              </span>
              {email.from && <span> · {email.from}</span>}
              <span> · {formatDateTime(email.receivedAt)}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              showDemoMessage(
                'Scan results are pre-generated using deterministic rules.'
              )
            }
          >
            <ScanLine />
            Scan again
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent>
              <EmailBody
                htmlBody={raw?.htmlBody}
                textBody={raw?.textBody}
                riskBucket={email.riskBucket}
              />
            </CardContent>
          </Card>

          {(links.length > 0 || attachments.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Links &amp; attachments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {links.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Link2 className="h-3.5 w-3.5" />
                      Links ({links.length})
                    </p>
                    <ul className="space-y-1">
                      {links.map((link) => (
                        <li
                          key={link}
                          className="break-all rounded-md bg-muted/40 px-3 py-2 text-xs text-link"
                        >
                          {link}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((extension) => (
                      <Badge key={extension} variant="muted">
                        <Paperclip />
                        .{extension}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Demo actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  showDemoMessage('Message review changes are disabled.')
                }
              >
                <ShieldCheck className="text-risk-safe" />
                Mark safe
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  showDemoMessage('Message review changes are disabled.')
                }
              >
                <ShieldX className="text-risk-quarantine" />
                Mark phishing
              </Button>
            </CardContent>
          </Card>
          <ScanDetails scan={scan} />
        </div>
      </div>
    </div>
  );
}
