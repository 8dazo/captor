import { NextResponse } from 'next/server';

import { auth } from '../../../../../auth';
import {
  getProjectById,
  getProjectDashboardMetrics,
  getRecentTraces,
  getSpendSummary,
} from '../../../../../lib/platform';

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = await context.params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const [metrics, recentTraces, spendSummary] = await Promise.all([
    getProjectDashboardMetrics(projectId),
    getRecentTraces(projectId, 5),
    getSpendSummary(projectId, 30),
  ]);

  return NextResponse.json({
    metrics,
    recentTraces,
    spendSummary,
  });
}
