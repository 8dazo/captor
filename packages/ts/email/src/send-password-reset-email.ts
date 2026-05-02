export async function sendPasswordResetEmail({
  recipient,
  appName,
  name,
  resetPasswordLink,
}: {
  recipient: string;
  appName: string;
  name: string;
  resetPasswordLink: string;
}): Promise<void> {
  console.log('[email stub]', 'sendPasswordResetEmail', {
    recipient,
    appName,
    name,
    resetPasswordLink,
  });
}
