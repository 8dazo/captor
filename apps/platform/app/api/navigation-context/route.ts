import { NextResponse } from 'next/server';

import { auth } from '../../../auth';
import { prisma } from '../../../lib/db';

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

  const project =
    type === 'trace'
      ? (
          await prisma.trace.findFirst({
            where: {
              id,
              hook: {
                project: {
                  members: { some: { userId: session.user.id } },
                },
              },
            },
            select: {
              hook: {
                select: {
                  project: { select: { id: true, name: true } },
                },
              },
            },
          })
        )?.hook.project
      : (
          await prisma.hookConnection.findFirst({
            where: {
              publicId: id,
              project: {
                members: { some: { userId: session.user.id } },
              },
            },
            select: {
              project: { select: { id: true, name: true } },
            },
          })
        )?.project;

  if (!project) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  return NextResponse.json({ project });
}
