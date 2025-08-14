
import { cn } from "@/lib/utils";
import { Skeleton } from "../ui/skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, loading }) => (
    <div className={cn(
      "bg-background/80 backdrop-blur-sm rounded-xl p-5 border border-border/80 hover:border-primary/50 transition-all duration-300 flex items-center space-x-4 shadow-sm hover:shadow-primary/10",
      "w-full" // Garante que o card ocupe todo o espaço disponível no grid
    )}>
      <div className="flex-shrink-0 bg-accent p-3 rounded-lg">
          {icon}
      </div>
      <div className="flex-grow">
        <p className="text-muted-foreground text-sm">{title}</p>
        {loading ? (
            <Skeleton className="h-8 w-32 mt-1" />
        ) : (
            <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
      </div>
    </div>
  );
