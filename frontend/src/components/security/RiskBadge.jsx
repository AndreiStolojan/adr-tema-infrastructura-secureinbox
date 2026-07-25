// ─────────────────────────────────────────────────────────────────────────────
// RiskBadge.jsx — eticheta colorată cu verdictul de risc al unui email.
//
// Ce face, pe scurt: arată un "pill" (etichetă rotunjită) cu o iconiță și un
// text care descriu cât de riscant e un email (ex: "Safe", "Likely phishing",
// "Needs review"). Culoarea și iconița NU sunt alese aici — vin din
// `lib/risk.js` (getRiskMeta), care e sursa unică de adevăr pentru cum se
// afișează fiecare verdict în toată aplicația.
//
// ─────────────────────────────────────────────────────────────────────────────

import { getRiskMeta } from '@/lib/risk';
import { cn } from '@/lib/utils';

/**
 * Pill that shows the final risk bucket for an email.
 * Used in the inbox list and email header. Icon + colour come from lib/risk.
 */
// Componenta principală primește riskBucket-ul și afișează eticheta
// corespunzătoare.
// - showIcon: dacă afișăm și iconița.
export function RiskBadge({ riskBucket, size = 'default', showIcon = true, className }) {
  // getRiskMeta traduce riskBucket-ul într-un obiect cu eticheta de afișat (label)
  // și "tonul" vizual (culoare + iconiță), definite central în lib/risk.js.
  const { label, tone } = getRiskMeta(riskBucket);
  const Icon = tone.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        tone.soft,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {label}
    </span>
  );
}
