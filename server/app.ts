import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes/apiRouter';
import { sendError } from './utils/apiResponse';

export function createExpressApp() {
  const app = express();

  // Security headers configured for SPA + images compatibility
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configured using CLIENT_URL environment variable for Render deployment
  const allowedOrigin = process.env.CLIENT_URL || '*';
  app.use(
    cors({
      origin: allowedOrigin === '*' ? true : [allowedOrigin, 'http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Mount REST API routes under /api
  app.use('/api', apiRouter);

  // 404 handler for unknown /api routes
  app.use('/api/*', (req: Request, res: Response) => {
    return sendError(res, `API endpoint not found: ${req.method} ${req.originalUrl}`, 404);
  });

  // Centralized error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    const message =
      statusCode === 500 ? 'Internal server error occurred.' : err.message || 'Request failed.';
    return sendError(res, message, statusCode, err.errors || [message]);
  });

  return app;
}
