/**
 * Public demo mode, turned on by the hosted deployment's environment variables.
 * The demo account is meant to be public, so its email and password are shown on the
 * login page; they are set in Vercel, never in the repository.
 */
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export const DEMO_ACCOUNT =
  DEMO_MODE && process.env.NEXT_PUBLIC_DEMO_EMAIL && process.env.NEXT_PUBLIC_DEMO_PASSWORD
    ? { email: process.env.NEXT_PUBLIC_DEMO_EMAIL, password: process.env.NEXT_PUBLIC_DEMO_PASSWORD }
    : null;

export const REPO_URL = 'https://github.com/joao-bermal/triage-desk';
