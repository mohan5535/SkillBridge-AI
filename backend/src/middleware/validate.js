import { ValidationError } from '../errors/ValidationError.js';

/**
 * Generic Zod schema validation middleware.
 * Validates req.body, req.query, or req.params against the provided Zod schema.
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.name === 'ZodError' && Array.isArray(err.errors)) {
        const errorList = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        return next(new ValidationError('Request validation failed', errorList));
      }
      next(err);
    }
  };
}

