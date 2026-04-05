import { AxiosError } from 'axios';

type ApiErrorPayload = {
  message?: string | string[];
};

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof AxiosError)) {
    return fallback;
  }

  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Try again in a moment.';
    }
    return (
      'Could not reach the API server. Start the backend (npm run dev:backend from the repo root), ' +
      'ensure Postgres and Redis are running (for example docker compose up -d), then retry. ' +
      'If you opened this app using a Network URL from another device, remove NEXT_PUBLIC_API_URL ' +
      'from web/.env.local so requests are proxied through Next, or set it to this machine’s LAN IP and port 3001.'
    );
  }

  const payload = error.response.data as ApiErrorPayload;
  if (Array.isArray(payload?.message) && payload.message.length > 0) {
    return payload.message[0]!;
  }

  if (typeof payload?.message === 'string' && payload.message.trim().length > 0) {
    return payload.message;
  }

  if (error.response.status === 401) {
    return 'Invalid email or password.';
  }

  return fallback;
}
