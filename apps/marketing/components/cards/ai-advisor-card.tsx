import * as React from 'react';
import {
  CheckCircle2Icon,
  CoinsIcon,
  CpuIcon,
  GaugeIcon,
  HashIcon,
  ShieldCheckIcon,
  ZapIcon,
} from 'lucide-react';

import { Badge } from '@workspace/ui/components/badge';
import { Card, CardContent, CardFooter, type CardProps } from '@workspace/ui/components/card';

const ROWS = [
  { icon: HashIcon, label: 'Trace', value: 'external trace + request IDs' },
  { icon: CpuIcon, label: 'Provider', value: 'OpenAI / OpenRouter / compatible' },
  { icon: GaugeIcon, label: 'Model', value: 'captured from the request / response' },
  { icon: CoinsIcon, label: 'Cost', value: 'reserved estimate + committed actual' },
  { icon: HashIcon, label: 'Tokens', value: 'input, output, cached input when available' },
  { icon: ShieldCheckIcon, label: 'Policy', value: 'violations linked to the same trace' },
] as const;

export function AiAdvisorCard(props: CardProps): React.JSX.Element {
  return (
    <Card {...props}>
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center gap-2">
          <ZapIcon className="size-5" />
          <h2 className="text-xl font-semibold">Trace inspector</h2>
          <Badge variant="secondary" className="ml-auto">
            Runtime evidence
          </Badge>
        </div>
        <div className="space-y-2">
          {ROWS.map((row) => {
            const Icon = row.icon;
            return (
              <div key={row.label} className="flex items-start gap-2 rounded-lg border bg-muted/20 p-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="w-20 shrink-0 text-sm text-muted-foreground">{row.label}</span>
                <span className="text-sm">{row.value}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
            <CheckCircle2Icon className="size-3.5" /> Completed, failed, blocked, and running states are derived from spans.
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-3 rounded-b-xl bg-neutral-50 pt-6 dark:bg-neutral-900">
        <h3 className="text-base font-semibold sm:text-lg">One trace, not six disconnected logs</h3>
        <div className="max-w-md text-sm leading-6 text-muted-foreground">
          Follow the request from runtime policy through provider response, spend reconciliation,
          spans, retained payloads, and any violation that occurred.
        </div>
      </CardFooter>
    </Card>
  );
}
