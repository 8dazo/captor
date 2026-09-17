import { describe, expect, it } from 'vitest';

import { ContractViolationError, run } from './index.js';

describe('execution contracts', () => {
  it('tracks committed resource usage', async () => {
    const result = await run(
      'customer-backfill',
      {
        limits: {
          resources: {
            'db.writes': 3,
          },
        },
      },
      async (execution) => {
        execution.consume('db.writes', 2);
        const reservation = execution.reserve('db.writes', 1);
        execution.commit(reservation);
        return 'done';
      },
    );

    expect(result.value).toBe('done');
    expect(result.receipt.status).toBe('succeeded');
    expect(result.receipt.resources['db.writes']).toEqual({
      limit: 3,
      committed: 3,
      reserved: 0,
    });
  });

  it('releases unused reservations', async () => {
    const result = await run(
      'dry-run',
      {
        limits: {
          resources: {
            'emails.sent': 10,
          },
        },
      },
      (execution) => {
        const reservation = execution.reserve('emails.sent', 10);
        execution.release(reservation);
        return execution.remaining('emails.sent');
      },
    );

    expect(result.value).toBe(10);
    expect(result.receipt.resources['emails.sent']?.committed).toBe(0);
    expect(result.receipt.resources['emails.sent']?.reserved).toBe(0);
  });

  it('blocks work before a resource limit would be exceeded', async () => {
    try {
      await run(
        'unsafe-backfill',
        {
          limits: {
            resources: {
              'db.writes': 5,
            },
          },
        },
        (execution) => {
          execution.consume('db.writes', 5);
          execution.consume('db.writes', 1);
        },
      );
      throw new Error('expected contract violation');
    } catch (error) {
      expect(error).toBeInstanceOf(ContractViolationError);
      const violation = error as ContractViolationError;
      expect(violation.receipt.status).toBe('failed');
      expect(violation.receipt.resources['db.writes']?.committed).toBe(5);
      expect(violation.receipt.violations[0]).toMatchObject({
        kind: 'resource-limit',
        resource: 'db.writes',
        limit: 5,
        actual: 6,
      });
    }
  });

  it('fails a normal return when the declared outcome is not met', async () => {
    try {
      await run(
        'nightly-reconciliation',
        {
          outcome: {
            'records.processed': { min: 100 },
            'error.rate': { max: 0.01 },
          },
        },
        (execution) => {
          execution.metric('records.processed', 99);
          execution.metric('error.rate', 0.005);
        },
      );
      throw new Error('expected outcome violation');
    } catch (error) {
      expect(error).toBeInstanceOf(ContractViolationError);
      const violation = error as ContractViolationError;
      expect(violation.receipt.status).toBe('failed');
      expect(violation.receipt.violations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'outcome',
            metric: 'records.processed',
            limit: 100,
            actual: 99,
          }),
        ]),
      );
    }
  });

  it('stores checkpoints in the execution receipt', async () => {
    const result = await run('resumeable-backfill', {}, (execution) => {
      execution.checkpoint('cursor', { userId: 1234 });
    });

    expect(result.receipt.checkpoints.cursor).toEqual({ userId: 1234 });
  });
});
