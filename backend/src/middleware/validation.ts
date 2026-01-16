import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { logger } from '../config/logger';

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation error:', errors);
        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      logger.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Common validation schemas
export const schemas = {
  uuid: z.string().uuid(),
  email: z.string().email(),
  studentId: z.string().min(1).max(50),
  amount: z.number().positive(),
  price: z.number().nonnegative(),
  phone: z.string().regex(/^[0-9]{10}$/),
  password: z.string().min(8),
};



