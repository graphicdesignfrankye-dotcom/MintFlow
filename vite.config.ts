import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// In sviluppo serve api/*.ts come farebbe Vercel, così /api/gemini funziona con `npm run dev`.
const devApi = (): Plugin => ({
  name: 'dev-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const match = req.url?.match(/^\/api\/([a-z0-9-]+)/i);
      if (!match) return next();

      try {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const raw = Buffer.concat(chunks).toString();
        (req as any).body = raw && req.headers['content-type']?.includes('json') ? JSON.parse(raw) : raw;

        const send = (code: number, body: unknown) => {
          res.statusCode = code;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        (res as any).status = (code: number) => ({ json: (body: unknown) => send(code, body) });

        const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`);
        await mod.default(req, res);
      } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e?.message || 'Errore API' }));
      }
    });
  }
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Solo per le funzioni api/ in locale: non viene mai inserita nel codice del browser.
    if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY ??= env.GEMINI_API_KEY;
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), devApi()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
