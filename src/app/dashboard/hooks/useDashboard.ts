'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getDashboardSummary, getRecentActivities } from '../actions';
import { HistoryType } from '@prisma/client';

// Interface for the summary
interface DashboardSummary {
  totalNotes: number;
  attestedNotes: number;
  pendingNotes: number;
  totalAmount: number;
  resolutionRate: number;
}

// Type for recent activities
type RecentActivityEvent = Awaited<ReturnType<typeof getRecentActivities>>[0];

const GREETING_TIMES = {
  MORNING: 12,
  AFTERNOON: 18,
} as const;

export function useDashboard() {
  const [summary, setSummary] = useState<DashboardSummary>({
    totalNotes: 0,
    attestedNotes: 0,
    pendingNotes: 0,
    totalAmount: 0,
    resolutionRate: 0,
  });
  const [activities, setActivities] = useState<RecentActivityEvent[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { data: session, status } = useSession();
  const [greeting, setGreeting] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const getGreeting = () => {
      const currentHour = new Date().getHours();
      if (currentHour < GREETING_TIMES.MORNING) {
        return 'Bom dia';
      } else if (currentHour < GREETING_TIMES.AFTERNOON) {
        return 'Boa tarde';
      } else {
        return 'Boa noite';
      }
    };
    setGreeting(getGreeting());

    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    setCurrentDate(today.toLocaleDateString('pt-BR', options));
  }, []);

  const fetchData = useCallback(async () => {
    setLoadingSummary(true);
    setLoadingActivities(true);
    try {
      const [summaryData, activitiesData] = await Promise.all([
        getDashboardSummary(),
        getRecentActivities(),
      ]);
      setSummary(summaryData);
      setActivities(activitiesData);
      setError(null);
    } catch (error) {
      setError('Erro ao carregar dados do dashboard');
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoadingSummary(false);
      setLoadingActivities(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  const handleNoteAdded = () => {
    fetchData();
  };

  const attestedPercentage =
    summary.totalNotes > 0
      ? Math.round((summary.attestedNotes / summary.totalNotes) * 100)
      : 0;

  return {
    summary,
    activities,
    loadingSummary,
    loadingActivities,
    showAddModal,
    setShowAddModal,
    session,
    status,
    greeting,
    error,
    currentDate,
    handleNoteAdded,
    attestedPercentage,
  };
}