import { addColors, createLogger, format, transports } from 'winston';

const { combine, timestamp, colorize, printf, errors } = format;

const customColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

addColors(customColors);

export const logger = createLogger({
  level: 'debug',
  transports: [
    new transports.Console({
      format: combine(
        colorize({ colors: customColors }),
        timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
        errors({ stack: true }),
        printf(({ level, message, timestamp: ts, stack }) => {
          const stackTrace = stack ? `\n${stack}` : '';
          return `${ts} [${level.toUpperCase()}]: ${message}${stackTrace}`;
        }),
      ),
    }),
  ],
  exitOnError: false,
});

export const morganStream = {
  write: (message: string): void => {
    logger.http(message.trim());
  },
};
