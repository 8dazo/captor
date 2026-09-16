export type NavigationResource =
  | { type: 'trace'; id: string }
  | { type: 'hook'; id: string };

function decodePathSegment(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function getNavigationResource(pathname: string): NavigationResource | null {
  const traceMatch = pathname.match(/^\/traces\/([^/]+)(?:\/|$)/);
  if (traceMatch?.[1]) {
    const id = decodePathSegment(traceMatch[1]);
    return id ? { type: 'trace', id } : null;
  }

  const hookMatch = pathname.match(/^\/hooks\/([^/]+)(?:\/|$)/);
  if (hookMatch?.[1]) {
    const id = decodePathSegment(hookMatch[1]);
    return id ? { type: 'hook', id } : null;
  }

  return null;
}
