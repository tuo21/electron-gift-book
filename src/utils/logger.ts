const isDev = import.meta.env.DEV

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel = isDev ? 'debug' : 'warn'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatMessage(level: LogLevel, prefix: string, ...args: unknown[]): void {
  if (!shouldLog(level)) return
  const label = `[${prefix}]`
  switch (level) {
    case 'debug':
      console.log(label, ...args)
      break
    case 'info':
      console.info(label, ...args)
      break
    case 'warn':
      console.warn(label, ...args)
      break
    case 'error':
      console.error(label, ...args)
      break
  }
}

export const logger = {
  debug(prefix: string, ...args: unknown[]) {
    formatMessage('debug', prefix, ...args)
  },
  info(prefix: string, ...args: unknown[]) {
    formatMessage('info', prefix, ...args)
  },
  warn(prefix: string, ...args: unknown[]) {
    formatMessage('warn', prefix, ...args)
  },
  error(prefix: string, ...args: unknown[]) {
    formatMessage('error', prefix, ...args)
  },
}
