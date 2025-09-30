
import { 
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { getNoteFromToken } from './actions';
import AttestationClientPage from './_components/attestation-client-page';


function ErrorPage({ error }: { error: string }) {
  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-900 p-4">
      <div className="w-full max-w-lg text-center bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl">
        <ShieldAlert 
          className="w-16 h-16 text-destructive mx-auto mb-6" 
          aria-hidden="true"
        />
        <h1 className="text-3xl font-bold text-white mb-2">Agradecemos pelo acesso!</h1>
        <p className="text-slate-400 text-lg" role="alert">
          {error}
        </p>
        <Link 
          href="/" 
          className="inline-block mt-8 text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-slate-800 rounded"></Link>
      </div>
    </main>
  );
}

// Este é agora um Server Component puro.
export default async function AttestationPage({ params }: { params: { token: string }}) {
  const { token } = params;

  if (!token) {
    return <ErrorPage error="Token não fornecido ou inválido." />;
  }

  // A busca dos dados ocorre aqui, no servidor.
  const { note, error } = await getNoteFromToken(token);
  
  if (error || !note) {
    return <ErrorPage error={error || 'Não foi possível carregar as informações da nota.'} />;
  }

  // Os dados são passados como props para o componente cliente.
  return <AttestationClientPage initialNote={note} token={token} />;
}
