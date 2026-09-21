import { auth } from '../../../../../../../auth';
import { getExecutionRun } from '../../../../../../../lib/execution-runs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { projectId, runId } = await params;
  const run = await getExecutionRun(projectId, session.user.id, runId);
  if (!run) return Response.json({ error: 'Not found' }, { status: 404 });
  return new Response(JSON.stringify(run.data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="captor-receipt.json"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
