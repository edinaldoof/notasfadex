// src/middleware.ts

// Simplesmente re-exporta o middleware do NextAuth.
// Ele irá usar a estratégia "jwt" que já definimos e não tentará aceder à base de dados para ler a sessão.
export { auth as middleware } from "../../../auth";

// Opcional: define quais as rotas que devem ser protegidas.
// Se não definir isto, TODAS as rotas serão protegidas por defeito.
export const config = {
  matcher: ["/dashboard/:path*"],
};