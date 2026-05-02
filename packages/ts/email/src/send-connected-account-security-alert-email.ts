export async function sendConnectedAccountSecurityAlertEmail({
  recipient,
  appName,
  name,
  provider,
  action,
}: {
  recipient: string;
  appName: string;
  name: string;
  provider: string;
  action: string;
}): Promise<void> {
  console.log('[email stub]', 'sendConnectedAccountSecurityAlertEmail', {
    recipient,
    appName,
    name,
    provider,
    action,
  });
}
