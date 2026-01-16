import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { logger, loggerStream } from './config/logger';
import { closeConnections } from './config/database';
import { standardLimiter } from './middleware/rateLimiter';

// Import routes
import authRoutes from './routes/auth.routes';
import walletRoutes from './routes/wallet.routes';
import mealRoutes from './routes/meal.routes';
import qrRoutes from './routes/qr.routes';
import vendorRoutes from './routes/vendor.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}));

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/wallet', walletRoutes);
apiRouter.use('/meals', mealRoutes);
apiRouter.use('/qr', qrRoutes);
apiRouter.use('/vendors', vendorRoutes);
apiRouter.use('/admin', adminRoutes);

app.use(`/api/${API_VERSION}`, standardLimiter, apiRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 CampusSync Backend Server running on port ${PORT}`);
  logger.info(`📡 API available at http://localhost:${PORT}/api/${API_VERSION}`);
  logger.info(`🏥 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await closeConnections();
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await closeConnections();
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;



