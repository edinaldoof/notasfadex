'use client';

import { motion } from 'framer-motion';
import {
  Activity,
  PlusCircle,
  Stamp,
  Undo2,
  Edit,
  AlertTriangle,
  XCircle,
  FileText,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '../../../../components/ui/avatar';
import { Skeleton } from '../../../../components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { HistoryType } from '@prisma/client';
import { getRecentActivities } from '../actions';

type RecentActivityEvent = Awaited<ReturnType<typeof getRecentActivities>>[0];

const getEventTypeConfig = (type: HistoryType) => {
  switch (type) {
    case 'CREATED':
      return {
        icon: <PlusCircle className="w-4 h-4 text-emerald-400" />,
        text: 'criou a nota',
      };
    case 'ATTESTED':
      return {
        icon: <Stamp className="w-4 h-4 text-blue-400" />,
        text: 'atestou a nota',
      };
    case 'REVERTED':
      return {
        icon: <Undo2 className="w-4 h-4 text-amber-400" />,
        text: 'desfez o atesto da nota',
      };
    case 'EDITED':
      return {
        icon: <Edit className="w-4 h-4 text-purple-400" />,
        text: 'editou a nota',
      };
    case 'EXPIRED':
      return {
        icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
        text: 'expirou para a nota',
      };
    case 'REJECTED':
      return {
        icon: <XCircle className="w-4 h-4 text-red-400" />,
        text: 'rejeitou a nota',
      };
    default:
      return {
        icon: <FileText className="w-4 h-4 text-slate-400" />,
        text: 'realizou um evento na nota',
      };
  }
};

const getInitials = (name: string | null) => {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export function RecentActivity({
  activities,
  loading,
  delay = 0,
}: {
  activities: RecentActivityEvent[];
  loading: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        'p-6 rounded-2xl border transition-all duration-300',
        'bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl',
        'border-slate-700/50 hover:border-slate-600/50',
        'shadow-lg'
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Atividade Recente
        </h3>
        <Link
          href="/dashboard/timeline"
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Ver todas
        </Link>
      </div>

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50"
            >
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))
        ) : activities.length > 0 ? (
          activities.map((activity, i) => {
            const eventConfig = getEventTypeConfig(activity.type);
            const userName =
              activity.author?.name || activity.userName || 'Sistema';
            const userImage = activity.author?.image;
            const noteReference = `Nota ${
              activity.note.noteNumber || 'S/N'
            } - CC: ${activity.note.projectAccountNumber}`;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: delay + i * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              >
                <Avatar className="h-8 w-8 mt-1 border-2 border-slate-700">
                  <AvatarImage src={userImage ?? undefined} />
                  <AvatarFallback className="text-xs bg-slate-600">
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-white">
                    <span className="font-semibold">{userName}</span>{' '}
                    {eventConfig.text}{' '}
                    <span className="font-semibold text-primary/80">
                      "{noteReference}"
                    </span>
                    .
                  </p>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    {eventConfig.icon}
                    {formatDistanceToNow(new Date(activity.date), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>Nenhuma atividade recente.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}