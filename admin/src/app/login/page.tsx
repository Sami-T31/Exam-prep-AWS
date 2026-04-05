'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApiClient } from '@/lib/adminApi';
import { setAdminTokens } from '@/lib/adminAuth';

interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'STUDENT';
  };
  accessToken: string;
  refreshToken: string;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await adminApiClient.post<LoginResponse>('/auth/login', {
        email,
        password,
      });

      if (response.data.user.role !== 'ADMIN') {
        setError('This account is not an admin account.');
        return;
      }

      setAdminTokens(response.data.accessToken, response.data.refreshToken);
      router.push('/dashboard');
    } catch {
      setError('Invalid admin credentials.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 460, paddingTop: 80 }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Admin Login</h1>
        <p className="muted">Sign in with an admin account.</p>

        {error && <p className="error">{error}</p>}

        <form onSubmit={handleSubmit} className="grid">
          <label>
            <div style={{ marginBottom: 6, fontSize: 13 }}>Email</div>
            <input
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              required
            />
          </label>

          <label>
            <div style={{ marginBottom: 6, fontSize: 13 }}>Password</div>
            <input
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>

          <button className="btn primary" disabled={isLoading} type="submit">
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
