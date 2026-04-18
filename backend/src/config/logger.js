import pino from 'pino'

const loggerConfig = {
  development: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true
      },
    },
  },
  production: true,
  test: false,
}

export const logger = pino(loggerConfig[process.env.NODE_ENV] || true)
