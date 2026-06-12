import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import hpp from 'hpp';
import swaggerUi from 'swagger-ui-express';
import { corsOptions } from './config/cors.config';
import { morganMiddleware } from './config/morgan.config';
import { swaggerSpec } from './config/swagger.config';
import { globalLimiter } from './middlewares/rateLimiter';
import { requestId } from './middlewares/requestId';
import healthRouter from './routes/healthRoutes';
import authRouter from './routes/authRoutes';
import feedRouter from './routes/feedRoutes';
import postRouter from './routes/postRoutes';
import adminRouter from './routes/adminRoutes';
import meRouter from './routes/meRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(requestId);
app.use(helmet());
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json());
app.use(hpp());
app.use(morganMiddleware);
app.use(globalLimiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/health', healthRouter);
app.use('/v1/auth', authRouter);
app.use('/v1/feed', feedRouter);
app.use('/v1/posts', postRouter);
app.use('/v1/admin', adminRouter);
app.use('/v1/me', meRouter);

app.use(errorHandler);

export { app };
