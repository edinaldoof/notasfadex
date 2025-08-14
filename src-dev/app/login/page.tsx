import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import GoogleSignInButton from '@/components/auth/google-signin-button';
import { Layers, Shield, Users, Clock } from 'lucide-react';

export default async function LoginPage(): Promise<JSX.Element> {
  const session = await auth();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0 z-0">
      {/* Animated gradient orbs */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[60vw] h-[60vh] bg-gradient-to-r from-blue-500/30 to-green-700/20 rounded-full blur-[200px] animate-pulse"></div>
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[40vw] h-[70vh] bg-gradient-to-l from-green-800/20 to-blue-500/25 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[35vw] h-[50vh] bg-gradient-to-br from-cyan-500/15 to-blue-600/20 rounded-full blur-[180px] animate-pulse"></div>
      
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
      </div>
      <div className="w-full max-w-md mx-auto z-10 relative">
      {/* Floating elements for visual interest */}
      <div className="absolute -top-20 -left-10 w-20 h-20 bg-blue-500/10 rounded-full blur-xl animate-bounce"></div>
      <div className="absolute -top-10 -right-16 w-16 h-16 bg-green-700/10 rounded-full blur-lg animate-bounce"></div>
      
      <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-700/50 rounded-3xl shadow-2xl shadow-black/40 p-8 text-center relative overflow-hidden group hover:shadow-blue-500/20 hover:shadow-2xl transition-all duration-500">
      {/* Subtle border glow effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-transparent to-green-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm"></div>
      
      {/* Logo and Brand Section */}
      <div className="flex justify-center mb-8 relative z-10">
      <div className="flex items-center space-x-4">
        <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center border border-slate-200 shadow-lg hover:scale-110 transition-transform duration-300">
          <img src="/favicon.ico" alt="Fadex Logo" className="w-8 h-8" />
        </div>
        <div className="text-left">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
        Notas Fadex
        </h1>
        <p className="text-xs text-slate-400 font-medium">Sistema Interno</p>
        </div>
      </div>
      </div>
      
      {/* Rest of the code remains the same */}
      <div className="mb-8 relative z-10">
      <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
        Bem-vindo de volta!
      </h2>
      <p className="text-slate-300 leading-relaxed">
        Acesse sua conta para gerenciar suas notas e projetos com segurança.
      </p>
      </div>

      <div className="mb-8 relative z-10">
      <GoogleSignInButton />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8 relative z-10">
      <div className="flex flex-col items-center space-y-2 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-colors duration-300">
        <Shield className="w-5 h-5 text-blue-400" />
        <span className="text-xs text-slate-400 font-medium">Seguro</span>
      </div>
      <div className="flex flex-col items-center space-y-2 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-colors duration-300">
        <Clock className="w-5 h-5 text-green-400" />
        <span className="text-xs text-slate-400 font-medium">Rápido</span>
      </div>
      <div className="flex flex-col items-center space-y-2 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:bg-slate-800/50 transition-colors duration-300">
        <Users className="w-5 h-5 text-green-600" />
        <span className="text-xs text-slate-400 font-medium">Colaborativo</span>
      </div>
      </div>
      
      <div className="relative z-10">
      <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent mb-4"></div>
      <p className="text-xs text-slate-400 leading-relaxed">
        🔒 Acesso restrito a funcionários autorizados @fadex.org.br<br/>
        <span className="text-slate-500">Vamos bater as metas!</span>
      </p>
      </div>
      </div>

      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent blur-sm"></div>
      </div>
    </main>
  );
}
