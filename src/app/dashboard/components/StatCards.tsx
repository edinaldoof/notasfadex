'use client';

import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowUpRight, TrendingUp } from 'lucide-react';

interface EnhancedStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: number;
  color: string;
  href?: string;
  delay?: number;
}

function EnhancedStatCard({
  title,
  value,
  icon,
  loading,
  trend,
  color,
  href,
  delay = 0,
}: EnhancedStatCardProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      className={cn(
        'relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer',
        'bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl',
        'border-slate-700/50 hover:border-slate-600/50',
        'shadow-lg hover:shadow-2xl hover:shadow-slate-900/50',
        'group overflow-hidden'
      )}
    >
      <div
        className={cn(
          'absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 group-hover:opacity-20 transition-opacity',
          color
        )}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              'p-3 rounded-xl transition-all duration-300',
              'bg-gradient-to-br from-slate-800/50 to-slate-700/50',
              'group-hover:scale-110 group-hover:rotate-3'
            )}
          >
            {icon}
          </div>
          {trend !== undefined && (
            <div
              className={cn(
                'flex items-center gap-1 text-sm px-2 py-1 rounded-full',
                trend >= 0
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              )}
            >
              <TrendingUp
                className={cn('w-3 h-3', trend < 0 && 'rotate-180')}
              />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-3xl font-bold text-white">{value}</p>
          )}
        </div>

        {href && (
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowUpRight className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>
    </motion.div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export { EnhancedStatCard as StatCard };