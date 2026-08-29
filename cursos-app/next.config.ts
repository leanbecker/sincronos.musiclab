import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Permite que Server Actions funcionen detrás de la URL pública de
      // GitHub Codespaces (proxy a localhost). En producción (Vercel) esto
      // no hace falta, pero no molesta dejarlo.
      allowedOrigins: ["*.app.github.dev", "localhost:3000"],
    },
  },
};

export default nextConfig;
