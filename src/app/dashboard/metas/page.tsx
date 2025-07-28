
'use client';

import { useState, useEffect } from 'react';
import { Target, DollarSign, Clock, FileCheck, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getGoalsData, GoalsData } from './actions';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const GoalCard = ({
  title,
  description,
  icon: Icon,
  currentValue,
  goalValue,
  unit = '',
  loading,
  lowerIsBetter = false,
  delay = 0,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  currentValue: number;
  goalValue: number;
  unit?: string;
  loading: boolean;
  lowerIsBetter?: boolean;
  delay?: number;
}) => {
  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-border">
        <CardHeader className="pb-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  const progress = goalValue > 0 ? Math.min((currentValue / goalValue) * 100, 100) : 0;
  const isGoalReached = lowerIsBetter ? currentValue <= goalValue : currentValue >= goalValue;
  
  let progressColor = 'bg-primary';
  let isOverGoal = !lowerIsBetter && currentValue > goalValue;
  
  if (lowerIsBetter) {
    if (currentValue > goalValue) { // Bad, over the goal
      progressColor = 'bg-destructive';
    } else if (currentValue > goalValue * 0.75) { // Warning
      progressColor = 'bg-amber-500';
    } else { // Good
      progressColor = 'bg-green-500';
    }
  } else {
     if (isGoalReached) {
        progressColor = 'bg-green-500';
     }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="bg-slate-900/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 h-full flex flex-col">
        <CardHeader className="pb-4 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Icon className="w-5 h-5 text-primary" />
              {title}
            </CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          {isGoalReached ? (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <CheckCircle className="w-6 h-6 text-green-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Meta Atingida!</p>
                    </TooltipContent>
                </Tooltip>
             </TooltipProvider>
          ) : (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Target className="w-6 h-6 text-slate-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Meta em andamento</p>
                    </TooltipContent>
                </Tooltip>
             </TooltipProvider>
          )}
        </CardHeader>
        <CardContent className="space-y-4 flex-grow flex flex-col justify-end">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">
              {unit === 'R$' ? formatCurrency(currentValue) : currentValue.toFixed(lowerIsBetter ? 0 : 1)}
              {unit !== 'R$' && <span className="text-xl font-normal text-slate-400"> {unit}</span>}
            </span>
            <span className="text-sm text-slate-500">
              / meta: {unit === 'R$' ? formatCurrency(goalValue) : goalValue} {unit !== 'R$' && unit}
            </span>
          </div>
          <div>
            <Progress value={progress} className="h-3" indicatorClassName={progressColor} />
            <div className="flex justify-between text-xs text-slate-400 mt-1.5">
              <span>{isOverGoal ? "Acima da meta" : lowerIsBetter ? (currentValue > 0 ? `${currentValue} acima da meta de 0` : "Meta atingida") : `${progress.toFixed(0)}% concluído`}</span>
              {!isGoalReached && !lowerIsBetter && (
                <span>Faltam {unit === 'R$' ? formatCurrency(Math.max(0, goalValue - currentValue)) : (goalValue - currentValue).toFixed(1)}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};


export default function MetasPage() {
    const [goalsData, setGoalsData] = useState<GoalsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const data = await getGoalsData();
                setGoalsData(data);
            } catch (error) {
                console.error("Failed to fetch goals data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const monthlySpendingGoal = 50000;
    const attestationTimeGoal = 10; // dias
    const notesProcessedGoal = 100;

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-20"></div>
                <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-2xl">
                  <Target className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Metas e Eficiência
                </h1>
                <p className="text-slate-400 mt-1">
                  Acompanhe o progresso da equipe em relação aos objetivos financeiros e operacionais.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                <GoalCard 
                    title="Notas Expiradas no Mês"
                    description="O objetivo é manter este número em zero para garantir a agilidade."
                    icon={XCircle}
                    currentValue={goalsData?.expiredNotesThisMonth ?? 0}
                    goalValue={0} // A meta é 0
                    unit="notas"
                    loading={loading}
                    lowerIsBetter
                    delay={0.1}
                />
                <GoalCard 
                    title="Tempo Médio de Atesto"
                    description="Média de dias para uma nota ser atestada após a criação."
                    icon={Clock}
                    currentValue={goalsData?.avgAttestationTimeInDays ?? 0}
                    goalValue={attestationTimeGoal}
                    unit="dias"
                    loading={loading}
                    lowerIsBetter
                    delay={0.2}
                />
                <GoalCard 
                    title="Gastos do Mês"
                    description="Valor total das notas atestadas no mês corrente."
                    icon={DollarSign}
                    currentValue={goalsData?.currentMonthSpending ?? 0}
                    goalValue={monthlySpendingGoal}
                    unit="R$"
                    loading={loading}
                    lowerIsBetter
                    delay={0.3}
                />
                <GoalCard 
                    title="Notas Processadas"
                    description="Total de notas criadas no sistema este mês."
                    icon={FileCheck}
                    currentValue={goalsData?.notesProcessedThisMonth ?? 0}
                    goalValue={notesProcessedGoal}
                    unit="notas"
                    loading={loading}
                    delay={0.4}
                />
            </div>

             <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
             >
                <Card className="bg-slate-900/50 border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                           {goalsData && goalsData.spendingTrend <= 0 ? <TrendingDown className='w-5 h-5 text-green-400'/> : <TrendingUp className='w-5 h-5 text-red-400'/>}
                            Análise de Tendências
                        </CardTitle>
                        <CardDescription>
                            Comparativo de gastos do mês atual com o mês anterior.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {loading ? (
                            <>
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-20 w-full" />
                            </>
                        ) : (
                            <>
                                <div className="p-4 rounded-lg bg-slate-800/50">
                                    <p className="text-sm text-slate-400">Gastos Mês Anterior</p>
                                    <p className="text-2xl font-bold">{formatCurrency(goalsData?.lastMonthSpending ?? 0)}</p>
                                </div>
                                 <div className="p-4 rounded-lg bg-slate-800/50">
                                    <p className="text-sm text-slate-400">Gastos Mês Atual</p>
                                    <p className="text-2xl font-bold">{formatCurrency(goalsData?.currentMonthSpending ?? 0)}</p>
                                </div>
                                <div className="p-4 rounded-lg bg-slate-800/50">
                                    <p className="text-sm text-slate-400">Variação Percentual</p>
                                    <p className={cn(
                                        "text-2xl font-bold flex items-center gap-1",
                                        (goalsData?.spendingTrend ?? 0) > 0 ? 'text-red-400' : 'text-green-400'
                                    )}>
                                        {(goalsData?.spendingTrend ?? 0) > 0 ? '+' : ''}
                                        {(goalsData?.spendingTrend ?? 0).toFixed(2)}%
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
