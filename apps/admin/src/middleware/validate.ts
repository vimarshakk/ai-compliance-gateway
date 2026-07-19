import type { FastifyRequest, FastifyReply } from 'fastify';
import type { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation failed',
          details: (error as ZodError).errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      throw error;
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation failed',
          details: (error as ZodError).errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      throw error;
    }
  };
}
