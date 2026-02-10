import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

export const logger = pino({
  level: logLevel,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

export const createContextLogger = (context: string) => {
  return logger.child({ context });
};

export const paymentLogger = createContextLogger('Payment');
export const pagarmeLogger = createContextLogger('Pagar.me');
export const authLogger = createContextLogger('Auth');
export const dbLogger = createContextLogger('Database');
export const apiLogger = createContextLogger('API');

// Assinatura module logger - conditionally logs based on environment
const isProd = process.env.NODE_ENV === 'production';
export const assinaturaLogger = {
  log: (...args: any[]) => !isProd && console.log('[Assinatura]', ...args),
  warn: (...args: any[]) => !isProd && console.warn('[Assinatura]', ...args),
  error: (...args: any[]) => console.error('[Assinatura]', ...args),
};

export default logger;
