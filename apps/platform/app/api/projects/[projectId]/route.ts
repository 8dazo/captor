import { getProjectById } from "../../../../lib/control-plane";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const project = getProjectById(projectId);

  if (!project) {
    return Response.json(
      {
        error: "Project not found",
      },
      { status: 404 },
    );
  }

  return Response.json({
    project,
  });
}
