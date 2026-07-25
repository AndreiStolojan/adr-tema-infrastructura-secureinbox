import { Gauge, Info } from 'lucide-react';

import { ThreatSignals } from '@/components/security/ThreatSignals';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getVerdictMeta } from '@/lib/risk';
import { cn } from '@/lib/utils';

export function ScanDetails({ scan }) {
  if (!scan) return null;

  const verdict = getVerdictMeta(scan.verdict);
  const score = Number(scan.score ?? scan.ruleScore ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          This demo uses deterministic security rules only. No AI model is
          called.
        </span>
      </div>

      {scan.explanation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rule-based explanation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground/90">
              {scan.explanation}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="label-overline flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5" />
              Deterministic risk score
            </span>
            <span className={cn('text-lg font-semibold tabular-nums', verdict.tone.text)}>
              {score}/100
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${Math.max(0, Math.min(score, 100))}%`,
                backgroundColor: verdict.tone.hex,
              }}
            />
          </div>
          <ThreatSignals scan={scan} />
        </CardContent>
      </Card>
    </div>
  );
}
