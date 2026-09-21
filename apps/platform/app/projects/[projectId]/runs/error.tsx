'use client';

import { ErrorState } from '../../../../components/error-state';

export default function RunsError({ reset }: { reset: () => void }) {
  return (
    <ErrorState
      message="We couldn’t load these execution receipts. Please try again."
      onRetry={reset}
    />
  );
}
