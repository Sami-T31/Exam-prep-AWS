/**
 * @exam-prep/shared
 *
 * This package is the single source of truth for all data types,
 * validation rules, and constants used across the entire platform:
 *   - Backend (NestJS API)
 *   - Web app (Next.js)
 *   - Mobile app (React Native + Expo)
 *   - Admin dashboard (Next.js)
 *
 * When you change a type here, all apps see the change immediately.
 * This prevents the backend and frontend from drifting out of sync.
 */

export * from './types';
export * from './constants';
export * from './validation';
