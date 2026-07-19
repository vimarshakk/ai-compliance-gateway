import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  type?: string;
  details?: unknown;
}

export function createAppError(message: string, statusCode: number, code: string, details?: unknown): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  err.type = 'api_error';
  err.details = details;
  return err;
}

export async function errorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: AppError, request: FastifyRequest, reply: FastifyReply) => {
    const statusCode = error.statusCode ?? 500;
    const code = error.code ?? 'INTERNAL_ERROR';
    const type = error.type ?? 'server_error';

    const response: Record<string, unknown> = {
      error: {
        message: statusCode === 500 ? 'Internal server error' : error.message,
        type,
        code,
      },
    };

    if (request.id) {
      (response as any).requestId = request.id;
    }

    if (error.details) {
      (response.error as any).details = error.details;
    }

    app.log.error({ requestId: request.id, error: error.message, stack: error.stack, statusCode }, 'request error');

    reply.status(statusCode).send(response);
  });

  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    reply.status(404).send({
      error: {
        message: `Route ${request.method} ${request.url} not found`,
        type: 'invalid_request_error',
        code: 'NOT_FOUND',
      },
    });
  });
}
