import { redirect } from 'next/navigation';
import { auth } from '../../../auth';
import GoogleSignInButton from '../../../../components/auth/google-signin-button';
import { Layers, Shield, Users, Clock, Sparkles, ArrowRight, Star } from 'lucide-react';

export default async function LoginPage(): Promise<JSX.Element> {
  const session = await auth();

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 relative overflow-hidden">
      {/* Ultra Enhanced Background Effects */}
      <div className="absolute inset-0 z-0">
        {/* Primary animated gradient orbs with improved animation */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[80vw] md:w-[60vw] h-[60vh] bg-gradient-to-r from-blue-500/40 via-cyan-500/30 to-green-700/30 rounded-full blur-[200px] animate-pulse"></div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 md:translate-x-1/2 w-[60vw] md:w-[40vw] h-[70vh] bg-gradient-to-l from-green-800/30 via-emerald-600/20 to-blue-500/35 rounded-full blur-[150px] animate-pulse [animation-delay:2s]"></div>
        <div className="absolute top-1/2 left-0 -translate-x-1/4 md:-translate-x-1/2 -translate-y-1/2 w-[50vw] md:w-[35vw] h-[50vh] bg-gradient-to-br from-cyan-500/25 via-blue-600/30 to-purple-600/20 rounded-full blur-[180px] animate-pulse [animation-delay:4s]"></div>
        
        {/* Secondary floating orbs for depth */}
        <div className="absolute top-1/4 right-1/4 w-[25vw] h-[25vh] bg-gradient-to-r from-purple-500/20 to-pink-500/15 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-1/4 left-1/4 w-[20vw] h-[20vh] bg-gradient-to-l from-teal-500/20 to-cyan-500/15 rounded-full blur-[100px] animate-float [animation-delay:3s]"></div>
        
        {/* Animated lines effect */}
        <div className="absolute inset-0">
          <div className="absolute h-px w-40 md:w-60 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent top-1/4 left-0 animate-slide-right"></div>
          <div className="absolute h-px w-40 md:w-60 bg-gradient-to-r from-transparent via-green-500/50 to-transparent top-3/4 right-0 animate-slide-left"></div>
          <div className="absolute w-px h-40 md:h-60 bg-gradient-to-b from-transparent via-purple-500/50 to-transparent left-1/4 top-0 animate-slide-down"></div>
          <div className="absolute w-px h-40 md:h-60 bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent right-1/4 bottom-0 animate-slide-up"></div>
        </div>
        
        {/* Premium grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 10 0 L 0 0 0 60' fill='none' stroke='rgba(255, 255, 255, 0.02)' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`
          }}
        ></div>
        
        {/* Noise texture overlay for premium feel */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`
          }}
        ></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 z-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float-random"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${15 + i * 5}s`
            }}
          >
            <Star className={`w-2 h-2 text-blue-400/20 animate-pulse`} />
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm sm:max-w-md mx-auto z-10 relative">
        {/* Premium floating elements */}
        <div className="absolute -top-16 md:-top-20 -left-6 md:-left-10 w-16 md:w-20 h-16 md:h-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute -top-8 md:-top-10 -right-12 md:-right-16 w-12 md:w-16 h-12 md:h-16 bg-gradient-to-br from-green-700/20 to-emerald-500/10 rounded-full blur-lg animate-bounce [animation-delay:1s]"></div>
        <div className="absolute -bottom-8 md:-bottom-10 -left-8 md:-left-12 w-14 md:w-18 h-14 md:h-18 bg-gradient-to-tr from-purple-500/15 to-pink-500/10 rounded-full blur-lg animate-bounce [animation-delay:2s]"></div>
        
        <div className="bg-slate-900/70 backdrop-blur-3xl border border-slate-700/60 rounded-3xl shadow-2xl shadow-black/50 p-6 sm:p-8 text-center relative overflow-hidden group hover:shadow-blue-500/30 hover:shadow-2xl transition-all duration-700">
          {/* Premium border glow effect */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/30 via-purple-500/20 to-green-700/30 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-md"></div>
          
          {/* Inner glow accent */}
          <div className="absolute inset-[1px] rounded-3xl bg-gradient-to-b from-white/5 to-transparent opacity-50"></div>
          
          {/* Logo and Brand Section with enhanced animation */}
          <div className="flex justify-center mb-6 sm:mb-8 relative z-10">
            <div className="flex items-center space-x-3 sm:space-x-4 group/logo">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-green-700 rounded-2xl blur-lg opacity-0 group-hover/logo:opacity-50 transition-opacity duration-500"></div>
                <div className="relative bg-white w-12 sm:w-14 h-12 sm:h-14 rounded-2xl flex items-center justify-center border border-slate-200 shadow-xl hover:scale-110 hover:rotate-6 transition-all duration-500">
                  <img src="/favicon.ico" alt="Fadex Logo" className="w-6 sm:w-8 h-6 sm:h-8" />
                </div>
              </div>
              <div className="text-left">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-green-100 bg-clip-text text-transparent animate-gradient">
                  Notas Fadex
                </h1>
                <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Sistema Administrativo
                </p>
              </div>
            </div>
          </div>
          
          {/* Welcome Section with better typography */}
          <div className="mb-6 sm:mb-8 relative z-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3 tracking-tight flex items-center justify-center gap-2">
              <span>Bem-vindo de volta</span>
              <span className="animate-wave inline-block origin-[70%_70%]">👋</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed px-4">
              Acesse sua conta para gerenciar suas notas e projetos com máxima segurança
            </p>
          </div>

          {/* Sign in button with proper hover effect - CORRIGIDO */}
          <div className="mb-6 sm:mb-8 relative z-10">
            {/* Efeito de glow que não bloqueia o botão - usa pointer-events-none */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl blur-md opacity-0 group-hover/btn:opacity-30 transition-opacity duration-500 pointer-events-none"></div>
            <div className="relative group/btn">
              <GoogleSignInButton />
            </div>
          </div>

          {/* Feature cards with improved responsive grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8 relative z-10">
            <div className="group/card flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-700/40 hover:from-slate-800/60 hover:to-slate-800/40 hover:border-blue-500/30 transition-all duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 rounded-full blur-md opacity-0 group-hover/card:opacity-30 transition-opacity duration-500"></div>
                <Shield className="w-4 sm:w-5 h-4 sm:h-5 text-blue-400 relative z-10 group-hover/card:scale-110 transition-transform duration-300" />
              </div>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Seguro</span>
            </div>
            <div className="group/card flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-700/40 hover:from-slate-800/60 hover:to-slate-800/40 hover:border-green-500/30 transition-all duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-0 group-hover/card:opacity-30 transition-opacity duration-500"></div>
                <Clock className="w-4 sm:w-5 h-4 sm:h-5 text-green-400 relative z-10 group-hover/card:scale-110 transition-transform duration-300" />
              </div>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Rápido</span>
            </div>
            <div className="group/card flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-3 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-800/20 border border-slate-700/40 hover:from-slate-800/60 hover:to-slate-800/40 hover:border-purple-500/30 transition-all duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 rounded-full blur-md opacity-0 group-hover/card:opacity-30 transition-opacity duration-500"></div>
                <Users className="w-4 sm:w-5 h-4 sm:h-5 text-purple-400 relative z-10 group-hover/card:scale-110 transition-transform duration-300" />
              </div>
              <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Colaborativo</span>
            </div>
          </div>
          
          {/* Premium footer with animated elements */}
          <div className="relative z-10">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-600/50 to-transparent mb-3 sm:mb-4"></div>
            <div className="space-y-2">
              <p className="text-[10px] sm:text-xs text-slate-400 leading-relaxed">
                🔒 Acesso restrito a funcionários autorizados @fadex.org.br
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500 font-medium flex items-center justify-center gap-1">
                <span>Vamos bater as metas Uhuuu!</span>
                <ArrowRight className="w-3 h-3 animate-bounce-horizontal" />
              </p>
            </div>
          </div>
        </div>

        {/* Bottom accent line with enhanced glow */}
        <div className="absolute -bottom-6 sm:-bottom-10 left-1/2 -translate-x-1/2 w-24 sm:w-32 h-1 bg-gradient-to-r from-transparent via-blue-500/70 to-transparent blur-sm animate-pulse"></div>
      </div>
    </main>
  );
}