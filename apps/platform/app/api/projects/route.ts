import { createLocalProject, listProjects } from "../../../lib/control-plane";

export async function GET() {
  return Response.json({
    projects: listProjects(),
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
  };

  const project = await createLocalProject({
    name: body.name,
  });

  return Response.json({
    project,
  });
}
