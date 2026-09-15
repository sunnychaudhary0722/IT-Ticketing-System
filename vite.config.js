import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { apiApp } from './backend/server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function expressBackendPlugin() {
  return {
    name: 'express-backend-server',
    configureServer(server) {
      console.log('[Vite] Express REST API middleware attached to dev server on port 3000');
      server.middlewares.use(apiApp);
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressBackendPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

