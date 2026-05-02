export enum AuthErrorCode {
  CredentialsSignin = 'CredentialsSignin',
  SessionRequired = 'SessionRequired',
  AdapterError = 'AdapterError',
  InvalidCallbackUrl = 'InvalidCallbackUrl',
  Verification = 'Verification',
}

export const CredentialsSignin = 'CredentialsSignin' as const;
