'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApiClient } from '@/lib/adminApi';
import { clearAdminTokens, getAdminAccessToken } from '@/lib/adminAuth';

interface DailyMetric {
  date: string;
  platform: 'WEB' | 'MOBILE';
  totalSessions: number;
  uniqueActiveUsers: number;
  averageSessionsPerUser: number;
  averageSessionDurationSec: number;
}

interface CohortMetric {
  cohortDate: string;
  platform: 'WEB' | 'MOBILE';
  cohortSize: number;
  day1RetentionPct: number;
  day7RetentionPct: number;
  day30RetentionPct: number;
}

interface RetentionResponse {
  generatedAt: string;
  retention: {
    daily: DailyMetric[];
    cohorts: CohortMetric[];
  };
  activeUsers: {
    WEB: { wau: number; mau: number };
    MOBILE: { wau: number; mau: number };
  };
}

interface AggregateResponse {
  privacyThreshold: number;
  averageAccuracyPerTopic: Array<{
    topicName: string;
    subjectName: string;
    gradeNumber: number;
    accuracyPercent: number;
    cohortSize: number;
  }>;
  mostMissedQuestions: Array<{
    questionText: string;
    subjectName: string;
    topicName: string;
    missRatePercent: number;
    cohortSize: number;
  }>;
  engagementByGradeAndRegion: Array<{
    gradeNumber: number;
    region: string;
    cohortSize: number;
    sessionCount: number;
    completionRatePct: number;
  }>;
  completionRates: Array<{
    gradeNumber: number;
    completionRatePct: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');
  const [retention, setRetention] = useState<RetentionResponse | null>(null);
  const [aggregates, setAggregates] = useState<AggregateResponse | null>(null);

  async function downloadCollectedData() {
    setIsDownloading(true);
    try {
      const response = await adminApiClient.get('/admin/analytics/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data as Blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `exam-prep-admin-collected-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Unable to download collected data right now.');
    } finally {
      setIsDownloading(false);
    }
  }

  useEffect(() => {
    async function load() {
      if (!getAdminAccessToken()) {
        router.replace('/login');
        return;
      }

      setIsLoading(true);
      setError('');
      try {
        const [retentionResponse, aggregatesResponse] = await Promise.all([
          adminApiClient.get<RetentionResponse>(
            '/admin/analytics/retention?days=30',
          ),
          adminApiClient.get<AggregateResponse>('/admin/analytics/aggregates'),
        ]);
        setRetention(retentionResponse.data);
        setAggregates(aggregatesResponse.data);
      } catch {
        clearAdminTokens();
        setError('Unable to load analytics data. Please sign in again.');
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [router]);

  return (
    <div>
      <header className="topbar">
        <div
          className="container"
          style={{ display: 'flex', justifyContent: 'space-between' }}
        >
          <div>
            <strong>Admin Analytics</strong>
            <div className="muted" style={{ fontSize: 12 }}>
              Retention, engagement, and privacy-safe institutional insights
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn primary"
              onClick={() => void downloadCollectedData()}
              disabled={isLoading || isDownloading}
              type="button"
            >
              {isDownloading ? 'Downloading...' : 'Download Collected Data'}
            </button>
            <Link className="btn" href="/dashboard">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="container" style={{ display: 'grid', gap: 14 }}>
        {isLoading && <div className="card">Loading analytics...</div>}
        {error && <p className="error">{error}</p>}

        {!isLoading && retention && (
          <>
            <section className="grid three">
              <div className="card">
                <div className="muted">Web WAU / MAU</div>
                <h2>
                  {retention.activeUsers.WEB.wau} /{' '}
                  {retention.activeUsers.WEB.mau}
                </h2>
              </div>
              <div className="card">
                <div className="muted">Mobile WAU / MAU</div>
                <h2>
                  {retention.activeUsers.MOBILE.wau} /{' '}
                  {retention.activeUsers.MOBILE.mau}
                </h2>
              </div>
              <div className="card">
                <div className="muted">Generated At</div>
                <h2 style={{ fontSize: 16 }}>
                  {new Date(retention.generatedAt).toLocaleString()}
                </h2>
              </div>
            </section>

            <section className="card">
              <h3>Daily Active Metrics (Last 30 Days)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Platform</th>
                    <th>Sessions</th>
                    <th>Unique Users (DAU)</th>
                    <th>Avg Sessions/User</th>
                    <th>Avg Session Duration (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {retention.retention.daily.map((row) => (
                    <tr key={`${row.date}-${row.platform}`}>
                      <td>{new Date(row.date).toISOString().slice(0, 10)}</td>
                      <td>{row.platform}</td>
                      <td>{row.totalSessions}</td>
                      <td>{row.uniqueActiveUsers}</td>
                      <td>{row.averageSessionsPerUser}</td>
                      <td>{row.averageSessionDurationSec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card">
              <h3>Cohort Retention (D1 / D7 / D30)</h3>
              <table>
                <thead>
                  <tr>
                    <th>Cohort Date</th>
                    <th>Platform</th>
                    <th>Cohort Size</th>
                    <th>D1</th>
                    <th>D7</th>
                    <th>D30</th>
                  </tr>
                </thead>
                <tbody>
                  {retention.retention.cohorts.map((row) => (
                    <tr key={`${row.cohortDate}-${row.platform}`}>
                      <td>
                        {new Date(row.cohortDate).toISOString().slice(0, 10)}
                      </td>
                      <td>{row.platform}</td>
                      <td>{row.cohortSize}</td>
                      <td>{row.day1RetentionPct}%</td>
                      <td>{row.day7RetentionPct}%</td>
                      <td>{row.day30RetentionPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        {!isLoading && aggregates && (
          <>
            <section className="card">
              <h3>
                Institutional Aggregates (Privacy threshold: cohort &ge;{' '}
                {aggregates.privacyThreshold})
              </h3>
              <p className="muted">
                Only aggregate rows above threshold are shown.
              </p>
            </section>

            <section className="card">
              <h3>Average Accuracy Per Topic</h3>
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Topic</th>
                    <th>Grade</th>
                    <th>Accuracy</th>
                    <th>Cohort</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregates.averageAccuracyPerTopic.map((row, index) => (
                    <tr key={`${row.topicName}-${index}`}>
                      <td>{row.subjectName}</td>
                      <td>{row.topicName}</td>
                      <td>{row.gradeNumber}</td>
                      <td>{row.accuracyPercent}%</td>
                      <td>{row.cohortSize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card">
              <h3>Most Missed Questions</h3>
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Topic</th>
                    <th>Question</th>
                    <th>Miss Rate</th>
                    <th>Cohort</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregates.mostMissedQuestions.map((row, index) => (
                    <tr key={`${row.questionText.slice(0, 30)}-${index}`}>
                      <td>{row.subjectName}</td>
                      <td>{row.topicName}</td>
                      <td>{row.questionText.slice(0, 100)}...</td>
                      <td>{row.missRatePercent}%</td>
                      <td>{row.cohortSize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card">
              <h3>Engagement by Grade and Region</h3>
              <table>
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Region</th>
                    <th>Cohort</th>
                    <th>Session Count</th>
                    <th>Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregates.engagementByGradeAndRegion.map((row, index) => (
                    <tr key={`${row.gradeNumber}-${row.region}-${index}`}>
                      <td>{row.gradeNumber}</td>
                      <td>{row.region}</td>
                      <td>{row.cohortSize}</td>
                      <td>{row.sessionCount}</td>
                      <td>{row.completionRatePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
