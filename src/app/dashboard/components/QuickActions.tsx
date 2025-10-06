'use client';

import { motion } from 'framer-motion';
import { cn } from '../../../lib/utils';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  color: string;
  delay?: number;
}

function QuickAction({
  icon,
  title,
  description,
  href,
  onClick,
  color,
  delay = 0,
}: QuickActionProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'p-4 rounded-xl border border-slate-700/50 hover:border-slate-600/50',
        'bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl',
        'transition-all duration-300 text-left w-full group',
        'hover:shadow-xl hover:shadow-slate-900/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-lg transition-all duration-300',
            'bg-gradient-to-br from-slate-800/50 to-slate-700/50',
            'group-hover:scale-110',
            color
          )}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} passHref>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className="w-full text-left">
      {content}
    </button>
  );
}

export { QuickAction };