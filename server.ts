import dotenv from 'dotenv';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './server/app';
import { connectDatabase } from './server/config/db';

dotenv.config();

async function startServer() {
  await connectDatabase();

  const app = createExpressApp();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Server] Aethelgard Atelier Full-Stack Server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
