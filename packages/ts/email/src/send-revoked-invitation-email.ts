export async function sendRevokedInvitationEmail({
  recipient,
  appName,
  organizationName,
}: {
  recipient: string;
  appName: string;
  organizationName: string;
}): Promise<void> {
  console.log('[email stub]', 'sendRevokedInvitationEmail', {
    recipient,
    appName,
    organizationName,
  });
}
