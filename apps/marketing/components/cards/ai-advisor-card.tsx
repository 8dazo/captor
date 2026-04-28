import * as React from 'react';
import { CheckCircle2Icon, CoinsIcon, CpuIcon, GaugeIcon, HashIcon, ZapIcon } from 'lucide-react';

import { Badge } from '@workspace/ui/components/badge';
import { Card, CardContent, CardFooter, type CardProps } from '@workspace/ui/components/card';

export function AiAdvisorCard(props: CardProps): React.JSX.Element {
  return (
    <Card {...props}>
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center gap-2">
          <ZapIcon className="size-5" />
          <h2 className="text-xl font-semibold">Trace Inspector</h2>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <HashIcon className="size-4 text-muted-foreground" />
            <span className="w-24 text-sm text-muted-foreground">Trace ID</span>
            <span className="font-mono text-sm">trc_a3k9f7x2m</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2Icon className="size-4 text-muted-foreground" />
            <span className="w-24 text-sm text-muted-foreground">Status</span>
            <Badge variant="secondary" className="whitespace-nowrap text-xs">
              COMPLETED
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <CpuIcon className="size-4 text-muted-foreground" />
            <span className="w-24 text-sm text-muted-foreground">Provider</span>
            <span className="text-sm">OpenAI</span>
          </div>
          <div className="flex items-center gap-2">
            <GaugeIcon className="size-4 text-muted-foreground" />
            <span className="w-24 text-sm text-muted-foreground">Model</span>
            <span className="font-mono text-sm">gpt-4.1-mini</span>
          </div>
          <div className="flex items-center gap-2">
            <CoinsIcon className="size-4 text-muted-foreground" />
            <span className="w-24 text-sm text-muted-foreground">Spend</span>
            <span className="text-sm">$0.098</span>
          </div>
          <div className="flex items-center gap-2">
            <HashIcon className="size-4 text-muted-foreground" />
            <span className="w-24 text-sm text-muted-foreground">Input Tokens</span>
            <span className="text-sm">842</span>
          </div>
          <div className="flex items-center gap-2">
            <HashIcon className="size-4 text-muted-foreground" />
            <span className="w-24 text-sm text-muted-foreground">Output Tokens</span>
            <span className="text-sm">318</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-4 rounded-b-xl bg-neutral-50 pt-6 dark:bg-neutral-900">
        <h3 className="text-base font-semibold sm:text-lg">Trace Inspector</h3>
        <div className="min-h-10 max-w-md text-sm text-muted-foreground">
          Inspect every LLM call end-to-end: prompt, completion, tokens, cost, and latency in one
          view.
        </div>
      </CardFooter>
    </Card>
  );
}
