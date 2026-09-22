import { run } from '../packages/ts/sdk/dist/index.js';

const customers = [{ id: 1 }, { id: 2 }, { id: 3 }];
const repaired = new Set();
const result = await run(
  'customer-repair',
  {
    limits: { resources: { 'db.writes': 3 } },
    outcome: { 'records.processed': { equals: customers.length } },
  },
  async (execution) => {
    for (const customer of customers) {
      const write = execution.reserve('db.writes', 1);
      // Replace this local operation with an awaited, idempotent database write.
      repaired.add(customer.id);
      execution.commit(write);
      execution.checkpoint('customer-id', customer.id);
    }
    execution.metric('records.processed', repaired.size);
  }
);
console.log(result.receipt);
