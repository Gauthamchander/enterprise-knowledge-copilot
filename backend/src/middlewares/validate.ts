import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

export const validate = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((detail) => detail.message));
      } else {
        // Replace req.body with validated and sanitized data
        req.body = schema.body.validate(req.body, { stripUnknown: true }).value;
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((detail) => detail.message));
      } else {
        req.query = schema.query.validate(req.query, { stripUnknown: true }).value;
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params, { abortEarly: false });
      if (error) {
        errors.push(...error.details.map((detail) => detail.message));
      } else {
        req.params = schema.params.validate(req.params, { stripUnknown: true }).value;
      }
    }

    if (errors.length > 0) {
      return next(new AppError(`Validation error: ${errors.join(', ')}`, 400));
    }

    next();
  };
};