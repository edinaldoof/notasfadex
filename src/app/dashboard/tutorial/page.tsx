
'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Loader2, Video, File, Trash2, AlertTriangle, Search } from 'lucide-react';
import { getTutorials, deleteTutorial } from './actions';
import type { Tutorial } from '@prisma/client';
import { useSession } from 'next-auth/react';
import { Role } from '@prisma/client';
import { AddTutorialDialog } from './add-tutorial-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';

const TutorialCard = ({ tutorial, isOwner, onDelete }: { tutorial: Tutorial; isOwner: boolean; onDelete: (id: string) => void; }) => {
  const [showVideo, setShowVideo] = useState(false);

  const getYouTubeThumbnail = (url: string) => {
    const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  };

  const handleCardClick = () => {
    if (tutorial.type === 'VIDEO') {
      setShowVideo(true);
    } else {
      window.open(tutorial.url, '_blank');
    }
  };

  return (
    <>
      <Card className="group relative cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30">
        <div className="relative" onClick={handleCardClick}>
          <div className="aspect-video bg-slate-800 flex items-center justify-center">
            {tutorial.type === 'VIDEO' ? (
              <img src={getYouTubeThumbnail(tutorial.url)} alt={tutorial.title} className="w-full h-full object-cover" />
            ) : (
              <File className="w-16 h-16 text-slate-500" />
            )}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
              {tutorial.type === 'VIDEO' ? <Video className="w-12 h-12 text-white/80" /> : <File className="w-12 h-12 text-white/80" />}
            </div>
          </div>
          <CardHeader>
            <CardTitle>{tutorial.title}</CardTitle>
            <CardDescription>{tutorial.description}</CardDescription>
          </CardHeader>
        </div>
        {isOwner && (
          <CardContent className="absolute bottom-2 right-2">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o tutorial "{tutorial.title}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(tutorial.id)}>
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        )}
      </Card>

      {showVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setShowVideo(false)}>
          <div className="relative w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube.com/embed/${tutorial.url.split('v=')[1]?.split('&')[0]}`}
              title={tutorial.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-lg"
            ></iframe>
          </div>
        </div>
      )}
    </>
  );
};

function PageSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                    <Skeleton className="h-40 w-full" />
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full" />
                    </CardHeader>
                </Card>
            ))}
        </div>
    )
}

export default function TutorialPage() {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { data: session } = useSession();
  const { toast } = useToast();
  const isOwner = session?.user?.role === Role.OWNER;

  const fetchTutorials = async () => {
    setLoading(true);
    try {
      const data = await getTutorials();
      setTutorials(data);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível carregar os tutoriais.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutorials();
  }, [toast]);

  const handleTutorialAdded = () => {
    fetchTutorials();
  };
  
  const handleDelete = async (id: string) => {
    try {
        await deleteTutorial(id);
        toast({ title: 'Sucesso', description: 'Tutorial excluído.' });
        fetchTutorials();
    } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível excluir o tutorial.', variant: 'destructive' });
    }
  }

  const filteredTutorials = tutorials.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Tutoriais</h1>
            <p className="text-slate-500">Aprenda a usar o sistema e tire suas dúvidas.</p>
          </div>
        </div>
        {isOwner && (
          <Button onClick={() => setIsDialogOpen(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Novo Tutorial
          </Button>
        )}
      </div>

       <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
                placeholder="Buscar tutoriais por título ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
            />
        </div>

      {loading ? (
        <PageSkeleton />
      ) : filteredTutorials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTutorials.map((tutorial) => (
            <TutorialCard key={tutorial.id} tutorial={tutorial} isOwner={isOwner} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
         <div className="text-center py-16 bg-card rounded-xl border">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Nenhum Tutorial Encontrado</h3>
            <p className="text-slate-500">
                {searchTerm ? 'Tente uma busca diferente.' : 'Ainda não há tutoriais disponíveis. Volte em breve!'}
            </p>
         </div>
      )}

      {isOwner && (
        <AddTutorialDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onTutorialAdded={handleTutorialAdded}
        />
      )}
    </div>
  );
}
