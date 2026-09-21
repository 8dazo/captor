import { Badge } from './ui/badge';
import type { Receipt } from '../lib/execution-receipts';

export function RunStatus({ status }: { status: Receipt['status'] }) {
  const variant =
    status === 'succeeded'
      ? 'status_completed'
      : status === 'failed'
        ? 'status_failed'
        : status === 'aborted'
          ? 'status_blocked'
          : 'status_pending';
  return (
    <Badge variant={variant}>
      {status === 'running'
        ? 'Running at capture'
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
