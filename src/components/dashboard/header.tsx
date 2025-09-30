
'use client';

import { LogOut, User as UserIcon, Menu, Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { signOut } from 'next-auth/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { Sidebar } from './sidebar';

export function Header() {
  const { data: session, status } = useSession();
  const user = session?.user;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
    return (
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
             <div className="lg:hidden">
                 <Skeleton className="h-10 w-10 rounded-md" />
             </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
           <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-background/95">
                <SheetHeader className="p-4 border-b border-border">
                    <SheetTitle>Menu de Navegação</SheetTitle>
                    <SheetDescription>
                        Navegue pelas seções do Notas Fadex.
                    </SheetDescription>
                </SheetHeader>
                <Sidebar />
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex items-center justify-end w-full">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-3 rounded-full hover:bg-accent transition-colors p-1">
                    <Avatar className="w-9 h-9 border-2 border-border">
                      <AvatarImage src={user.image || ''} alt={user.name || 'User'} />
                      <AvatarFallback>{getInitials(user.name || user.email || 'U')}</AvatarFallback>
                    </Avatar>
                     <span className="sr-only">Abrir menu do usuário</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60 bg-background/95 backdrop-blur-lg" align="end">
                  <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </DropdownMenuItem>
                   <DropdownMenuItem disabled>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer focus:bg-destructive/20 focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}