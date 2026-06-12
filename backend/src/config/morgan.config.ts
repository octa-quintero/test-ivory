import morgan from 'morgan';
import { config } from './index';
import { morganStream } from './winston.config';

const devFormat = ':method :url :status :response-time ms - :res[content-length]';

export const morganMiddleware = morgan(config.isProduction ? 'combined' : devFormat, {
  stream: morganStream,
});
