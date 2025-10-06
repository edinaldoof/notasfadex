'use client';

import {
  BarChart3,
  FileSpreadsheet,
  Clock,
  Calculator,
  FileText,
  Target,
  Activity,
} from 'lucide-react';
import { AddNoteDialog } from '@/app/dashboard/add-note-dialog';
import { CheckBadge } from '../../../../components/icons/check-badge';
import { useDashboard } from './hooks/useDashboard';
import { DashboardHeader } from './components/DashboardHeader';
import { StatCard } from './components/StatCards';
import { QuickAction } from './components/QuickActions';
import { RecentActivity } from './components/RecentActivity';
import { OverviewCard } from './components/OverviewCard';

export default function DashboardPage() {
  const {
    summary,
    activities,
    loadingSummary,
    loadingActivities,
    showAddModal,
    setShowAddModal,
    session,
    status,
    greeting,
    currentDate,
    handleNoteAdded,
    attestedPercentage,
  } = useDashboard();

  return (
    <div className="space-y-8">
      <DashboardHeader
        greeting={greeting}
        userName={session?.user?.name}
        currentDate={currentDate}
        onAddNote={() => setShowAddModal(true)}
        loading={status === 'loading'}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Notas"
          value={summary.totalNotes}
          icon={<FileSpreadsheet className="w-6 h-6 text-blue-400" />}
          loading={loadingSummary || status !== 'authenticated'}
          color="bg-blue-500"
          href="/dashboard/notas?status=all"
          delay={0.1}
        />
        <StatCard
          title="Notas Atestadas"
          value={summary.attestedNotes}
          icon={<CheckBadge className="w-6 h-6 text-green-400" />}
          loading={loadingSummary || status !== 'authenticated'}
          trend={attestedPercentage}
          color="bg-green-500"
          href="/dashboard/notas?status=atestada"
          delay={0.2}
        />
        <StatCard
          title="Pendentes"
          value={summary.pendingNotes}
          icon={<Clock className="w-6 h-6 text-amber-400" />}
          loading={loadingSummary || status !== 'authenticated'}
          color="bg-amber-500"
          href="/dashboard/notas?status=pendente"
          delay={0.3}
        />
        <StatCard
          title="Taxa de Resolução (30d)"
          value={`${summary.resolutionRate}%`}
          icon={<Calculator className="w-6 h-6 text-purple-400" />}
          loading={loadingSummary || status !== 'authenticated'}
          color="bg-purple-500"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <QuickAction
              icon={<FileText className="w-5 h-5 text-blue-400" />}
              title="Adicionar Nota"
              description="Cadastre uma nova nota fiscal"
              onClick={() => setShowAddModal(true)}
              color="text-blue-400"
              delay={0.6}
            />
            <QuickAction
              icon={<BarChart3 className="w-5 h-5 text-purple-400" />}
              title="Ver Relatórios"
              description="Análise detalhada das notas"
              href="/dashboard/reports"
              color="text-purple-400"
              delay={0.7}
            />
            <QuickAction
              icon={<Target className="w-5 h-5 text-green-400" />}
              title="Metas do Mês"
              description="Acompanhe seus objetivos"
              href="/dashboard/metas"
              color="text-green-400"
              delay={0.8}
            />
            <QuickAction
              icon={<Activity className="w-5 h-5 text-orange-400" />}
              title="Histórico"
              description="Veja todas as atividades"
              href="/dashboard/timeline"
              color="text-orange-400"
              delay={0.9}
            />
          </div>
        </div>
        <RecentActivity
          activities={activities}
          loading={loadingActivities}
          delay={1}
        />
      </div>

      <OverviewCard
        attestedPercentage={attestedPercentage}
        totalAmount={summary.totalAmount}
        resolutionRate={summary.resolutionRate}
      />

      <AddNoteDialog
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onNoteAdded={handleNoteAdded}
      />
    </div>
  );
}