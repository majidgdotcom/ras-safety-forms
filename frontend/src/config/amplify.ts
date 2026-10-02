import { Amplify } from 'aws-amplify';

import { env } from './env';

/** Amplify is used ONLY for Cognito login (tokens are refreshed automatically). */
export function configureAmplify(): void {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: env.userPoolId,
        userPoolClientId: env.userPoolClientId,
        loginWith: { email: true },
      },
    },
  });
}
