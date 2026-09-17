import { backfill, ContractViolationError } from '../packages/ts/core/src/index.js';

type Customer = { id: number; migrated: boolean };

const customers: Customer[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  migrated: false,
}));

let checkpoint = 0;

console.log('Phase 1: run with a hard ceiling of 8 writes.');

try {
  await backfill({
    name: 'customer-backfill-broken',
    source: customers,
    batchSize: 4,
    resource: 'db.writes',
    contract: {
      limits: {
        resources: {
          'db.writes': 8,
        },
      },
    },
    checkpoint: (customer) => customer.id,
    process: async (batch) => {
      for (const customer of batch) {
        customer.migrated = true;
      }
    },
  });
} catch (error) {
  if (!(error instanceof ContractViolationError)) {
    throw error;
  }

  const saved = error.receipt.checkpoints['backfill.cursor'];
  checkpoint = typeof saved === 'number' ? saved : 0;

  console.log(`Captor stopped the run: ${error.message}`);
  console.log(`Committed checkpoint: customer ${checkpoint}`);
  console.log(
    `Committed writes: ${error.receipt.resources['db.writes']?.committed ?? 0}`,
  );
}

if (checkpoint !== 8) {
  throw new Error(`Expected the first run to stop after customer 8, got ${checkpoint}`);
}

console.log('\nPhase 2: resume after the checkpoint with a corrected contract.');

const remaining = customers.filter((customer) => customer.id > checkpoint);
const resumed = await backfill({
  name: 'customer-backfill-resumed',
  source: remaining,
  batchSize: 4,
  resource: 'db.writes',
  contract: {
    limits: {
      resources: {
        'db.writes': remaining.length,
      },
    },
    outcome: {
      'backfill.items.processed': { equals: remaining.length },
    },
  },
  checkpoint: (customer) => customer.id,
  process: async (batch) => {
    for (const customer of batch) {
      customer.migrated = true;
    }
  },
});

const migrated = customers.filter((customer) => customer.migrated).length;
if (migrated !== customers.length) {
  throw new Error(`Expected all customers migrated, got ${migrated}/${customers.length}`);
}

console.log(`Resume status: ${resumed.receipt.status}`);
console.log(`Final checkpoint: ${resumed.receipt.checkpoints['backfill.cursor']}`);
console.log(`Customers migrated: ${migrated}/${customers.length}`);
console.log('\nDemo passed: the unsafe run stopped before exceeding its contract and resumed safely.');
