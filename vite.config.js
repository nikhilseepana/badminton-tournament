import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

function ghTokenPlugin() {
  return {
    name: 'gh-token',
    configureServer(server) {
      server.middlewares.use('/api/gh-token', (_req, res) => {
        try {
          const token = execSync('gh auth token', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ token }));
        } catch {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'gh CLI not found or not authenticated. Run: gh auth login' }));
        }
      });
    },
  };
}

export default defineConfig({
  base: '/badminton-tournament/',
  plugins: [react(), ghTokenPlugin()],
  optimizeDeps: {
    include: ['grommet', 'styled-components'],
  },
});
