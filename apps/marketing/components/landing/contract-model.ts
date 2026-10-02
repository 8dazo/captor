export const contractPresets = [
  {
    id: 'sync',
    label: 'API sync',
    resource: 'http.requests',
    noun: 'requests',
    name: 'partner-sync',
  },
  {
    id: 'backfill',
    label: 'Data backfill',
    resource: 'db.writes',
    noun: 'writes',
    name: 'customer-backfill',
  },
  {
    id: 'agent',
    label: 'Agent tools',
    resource: 'tool.calls',
    noun: 'tool calls',
    name: 'agent-workflow',
  },
] as const;

export function makeContractPlan(
  presetIndex: number,
  limit: number,
  operations: number,
  units: number
) {
  const preset = contractPresets[presetIndex];
  if (!preset) throw new RangeError('Unknown contract preset');
  for (const value of [limit, operations, units]) {
    if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
      throw new RangeError('Plan values must be integers between 1 and 100');
    }
  }
  const admitted = Math.min(operations, Math.floor(limit / units));
  const blocked = admitted < operations;
  const contract = { limits: { resources: { [preset.resource]: limit } } };
  const code = `import { run, ContractViolationError } from 'captar';

const contract = ${JSON.stringify(contract, null, 2)};

try {
  const { receipt } = await run('${preset.name}', contract, async (execution) => {
    for (let i = 0; i < ${operations}; i++) {
      const hold = execution.reserve('${preset.resource}', ${units});
      // Await your operation here; this sample performs no external work.
      execution.commit(hold);
    }
  });
  console.log(receipt);
} catch (error) {
  if (!(error instanceof ContractViolationError)) throw error;
  console.log(error.receipt); // Inspect the enforced boundary.
}`;
  return {
    preset,
    contract,
    code,
    admitted,
    blocked,
    used: admitted * units,
    remaining: limit - admitted * units,
  };
}
