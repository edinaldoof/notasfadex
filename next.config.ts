
// next.config.ts

import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* ...outras opções de configuração... */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // ✅ ESTE É O BLOCO IMPORTANTE
  experimental: {
    // Aumenta o limite de tamanho para uploads em Server Actions
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    // Adicionado para resolver o problema 'async_hooks' no cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false, // Diz ao Webpack para não incluir este módulo no browser
      };
    }

    return config;
  },
};

export default nextConfig;

    