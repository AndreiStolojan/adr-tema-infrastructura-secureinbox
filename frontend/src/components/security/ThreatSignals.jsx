import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Globe,
  KeyRound,
  Link2,
  Paperclip,
  ShieldAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';

const RULE_META = {
  reply_to_mismatch: {
    label: 'Reply goes to a different address',
    detail:
      'The reply address differs from the sender address, a common phishing pattern.',
    icon: AlertTriangle,
  },
  shortened_url_detected: {
    label: 'Shortened link detected',
    detail: 'Shortened links hide their real destination.',
    icon: Link2,
  },
  'suspicious_link_pattern:ip_address_link': {
    label: 'Link uses an IP address',
    detail: 'The link uses a raw IP address instead of a normal domain name.',
    icon: Globe,
  },
  'suspicious_link_pattern:embedded_credentials': {
    label: 'Login details embedded in link',
    detail: 'The URL contains credentials, which is a strong warning sign.',
    icon: KeyRound,
  },
  'suspicious_link_pattern:punycode_domain': {
    label: 'Lookalike domain detected',
    detail: 'The domain uses special characters that can imitate a known brand.',
    icon: Globe,
  },
  'suspicious_link_pattern:very_long_url': {
    label: 'Unusually long link',
    detail: 'Long URLs can make the real destination difficult to inspect.',
    icon: Link2,
  },
  high_risk_attachment_extension: {
    label: 'Dangerous file attachment',
    detail: 'The attachment type can be used to install malicious software.',
    icon: Paperclip,
  },
  archive_attachment_extension: {
    label: 'Compressed archive attachment',
    detail: 'Archive files can hide malicious content.',
    icon: Paperclip,
  },
  too_many_links_high: {
    label: 'Too many links',
    detail: 'The message contains an unusually high number of links.',
    icon: Link2,
  },
  too_many_links_medium: {
    label: 'Many links',
    detail: 'The number of links is higher than expected.',
    icon: Link2,
  },
  urgent_action_language: {
    label: 'Urgency language',
    detail:
      'A deterministic keyword rule detected language that pressures the recipient to act quickly.',
    icon: AlertTriangle,
  },
  credential_request_language: {
    label: 'Requests credentials',
    detail:
      'A deterministic keyword rule detected a request for authentication data.',
    icon: KeyRound,
  },
};

const fallbackMeta = (rule) => ({
  label: String(rule || 'Unknown signal')
    .replace(/_(high|medium|low)$/, '')
    .replace(/[_:]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase()),
  detail: null,
  icon: AlertTriangle,
});

function SignalRow({ signal, index }) {
  const rule = typeof signal === 'string' ? signal : signal.rule;
  const points = typeof signal === 'object' ? (signal.points ?? null) : null;
  const backendDetail = typeof signal === 'object' ? signal.details : null;
  const meta = RULE_META[rule] || fallbackMeta(rule);
  const Icon = meta.icon;

  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="flex items-start gap-3 rounded-lg border border-risk-review/30 bg-risk-review/[0.06] px-3 py-2.5"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-risk-review-soft text-risk-review">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium leading-tight">{meta.label}</span>
        {(backendDetail || meta.detail) && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {backendDetail || meta.detail}
          </p>
        )}
      </div>
      {points != null && (
        <Badge variant="muted" className="mt-0.5 shrink-0 tabular-nums">
          +{points}
        </Badge>
      )}
    </motion.li>
  );
}

export function ThreatSignals({ scan }) {
  const triggered = Array.isArray(scan?.triggeredRules)
    ? scan.triggeredRules
    : [];

  if (triggered.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="label-overline flex items-center gap-1.5 text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" />
        What triggered the warning
        <span className="ml-auto rounded-full bg-muted px-2 py-0 text-[10px] font-semibold tabular-nums text-foreground/70">
          {triggered.length}
        </span>
      </p>
      <ul className="space-y-1.5">
        {triggered.map((signal, index) => (
          <SignalRow
            key={`${typeof signal === 'string' ? signal : signal.rule}-${index}`}
            signal={signal}
            index={index}
          />
        ))}
      </ul>
    </div>
  );
}
