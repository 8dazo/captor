export interface AuthContextUser {
  id: string;
  email: string;
  name: string;
  image: string | null;
}

export interface AuthOrganizationContext {
  organizationId: string;
  organizationName: string;
  role: string;
}

export async function getAuthContext(): Promise<AuthContextUser> {
  return {
    id: 'mock-user-id',
    email: 'mock@example.com',
    name: 'Mock User',
    image: null,
  };
}

export async function getAuthOrganizationContext(): Promise<AuthOrganizationContext> {
  return {
    organizationId: 'mock-org-id',
    organizationName: 'Mock Organization',
    role: 'member',
  };
}
