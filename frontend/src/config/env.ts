/** Reads the Vite env variables once and fails loudly if one is missing. */
function required(name: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (!value) throw new Error(`Missing env variable ${name}. Copy frontend/.env.example to .env.local`);
  return value;
}

export const env = {
  apiUrl: required('VITE_API_URL').replace(/\/$/, ''),
  userPoolId: required('VITE_COGNITO_USER_POOL_ID'),
  userPoolClientId: required('VITE_COGNITO_CLIENT_ID'),
};
