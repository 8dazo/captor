import { NextResponse } from 'next/server';

import { auth } from '../../../auth';
import { getHookByPublicId, getProjectById, getTraceById } from '../../../lib/platform';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id')?.trim();

  if (!id || (type !== 'trace' && type !== 'hook')) {
    return NextResponse.json({ error: 'Invalid navigation context request' }, { status: 400 });
  }

  const projectId =
    type === 'trace'
      ? (await getTraceById(id, session.user.id))?.hook.projectId
      : (await getHookByPublicId(id, session.user.id))?.projectId;

  if (!projectId) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json({
    project: {
      id: project.id,
      name: project.name,
    },
  });
}
