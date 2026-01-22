const isDev = import.meta.env.DEV;

export const meetingLogger = {
  log: (...args: any[]) => isDev && console.log('[Meeting]', ...args),
  warn: (...args: any[]) => isDev && console.warn('[Meeting]', ...args),
  error: (...args: any[]) => console.error('[Meeting]', ...args),
};
