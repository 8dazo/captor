'use client';

import { ErrorState } from '~/components/error-state';

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState reference={error.digest} onRetry={reset} />;
}
