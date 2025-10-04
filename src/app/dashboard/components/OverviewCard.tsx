'use client';

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CheckBadge } from '@/components/icons/check-badge';

interface OverviewCardProps {
  attestedPercentage: number;
  totalAmount: number;
  resolutionRate: number;
}

export function OverviewCard({
  attestedPercentage,
  totalAmount,
  resolutionRate,
}: OverviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 1.1 }}
      className={cn(
        'relative p-8 rounded-2xl border overflow-hidden',
        'bg-gradient-to-br from-slate-900/90 via-slate-800/90 to-emerald-900/20 backdrop-blur-xl',
        'border-slate-700/50',
        'shadow-xl'
      )}
    >
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              Sistema Notas Fadex
              <CheckBadge className="w-6 h-6 text-emerald-400" />
            </h2>
            <p className="text-slate-400 mt-2 max-w-2xl">
              Gerencie suas notas fiscais de forma inteligente e organizada.
              Acompanhe o status, valores e mantenha tudo sob controle.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-800/50 rounded-xl backdrop-blur-sm">
            <p className="text-sm text-slate-400 mb-1">Taxa de Conclusão</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${attestedPercentage}%` }}
                  transition={{ duration: 1, delay: 1.3 }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-500"
                />
              </div>
              <span className="text-sm font-semibold text-white">
                {attestedPercentage}%
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-xl backdrop-blur-sm">
            <p className="text-sm text-slate-400 mb-1">Média Mensal</p>
            <p className="text-xl font-bold text-white">
              R${' '}
              {(totalAmount / 12).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-xl backdrop-blur-sm">
            <p className="text-sm text-slate-400 mb-1">
              Taxa de Resolução (30d)
            </p>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-xl font-bold text-white">
                {resolutionRate}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}