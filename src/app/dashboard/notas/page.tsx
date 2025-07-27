
import { Suspense } from 'react';
import NotasClientPage from '../notas-client';
import { Skeleton } from '@/components/ui/skeleton';

// Loading skeleton for the page
function Loading() {
  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start mb-8">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-11 w-32" />
        </div>
        <div className="bg-background/80 backdrop-blur-sm rounded-xl p-4 border border-border/80 mb-8">
             <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <Skeleton className="h-10 w-full max-w-md" />
                <Skeleton className="h-10 w-full sm:w-[260px]" />
                <Skeleton className="h-10 w-full sm:w-auto" />
            </div>
        </div>
        <div className="bg-background/80 backdrop-blur-sm rounded-xl border border-border/80 overflow-hidden">
            <div className="p-4">
                 <Skeleton className="h-12 w-full" />
                 <Skeleton className="h-12 w-full mt-2" />
                 <Skeleton className="h-12 w-full mt-2" />
                 <Skeleton className="h-12 w-full mt-2" />
            </div>
        </div>
    </div>
  );
}


export default async function NotasPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const page = Number(searchParams?.page) || 1;
  const limit = Number(searchParams?.limit) || 10;
  
  return (
    <Suspense fallback={<Loading />} key={page + '_' + limit}>
      <NotasClientPage />
    </Suspense>
  );
}
