'use client';

import { ErrorState } from '~/components/error-state';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState reference={error.digest} onRetry={reset} fullScreen />;
}
