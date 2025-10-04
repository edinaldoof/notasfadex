'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardHeaderProps {
  greeting: string;
  userName: string | null | undefined;
  currentDate: string;
  onAddNote: () => void;
  loading: boolean;
}

const getDisplayName = (name: string | null | undefined) => {
  if (!name) {
    return '';
  }
  const nameParts = name.split(' ');
  if (nameParts.length > 1 && nameParts[0].toUpperCase() === 'FADEX') {
    return nameParts[1];
  }
  return nameParts[0];
};

export function DashboardHeader({
  greeting,
  userName,
  currentDate,
  onAddNote,
  loading,
}: DashboardHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {loading ? (
            <Skeleton className="h-10 w-80 mb-2" />
          ) : (
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              {greeting}, {getDisplayName(userName)}!
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <Sparkles className="w-8 h-8 text-yellow-400" />
              </motion.div>
            </h1>
          )}
          <p className="text-slate-400 capitalize flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {currentDate}
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center gap-2"
        >
          <Button
            variant="outline"
            asChild
            className={cn(
              'px-4 py-3 font-semibold transition-all duration-300 flex items-center gap-2',
              'bg-slate-800/50 border-slate-700/50 text-slate-300',
              'hover:bg-slate-800 hover:text-white'
            )}
          >
            <Link href="/dashboard/calendario">
              <Calendar className="w-5 h-5" />
              <span>Ver Calendário</span>
            </Link>
          </Button>
          <Button
            onClick={onAddNote}
            className={cn(
              'px-6 py-3 font-semibold transition-all duration-300 flex items-center gap-2',
              'bg-gradient-to-r from-emerald-500 to-green-600 text-white',
              'hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-105',
              'rounded-xl'
            )}
          >
            <Plus className="w-5 h-5" />
            <span>Nova Nota</span>
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}