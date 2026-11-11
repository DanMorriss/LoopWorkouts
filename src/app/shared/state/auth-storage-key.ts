/**
 * Where the Supabase client keeps the sign-in, in localStorage: there while this device is
 * signed in. Here rather than with the client (`account/account-client.ts`), as code that
 * only checks whether there's a sign-in shouldn't load the account feature.
 */
export const AUTH_STORAGE_KEY = 'sb-cpgacyzlfyskifzhkotu-auth-token';
