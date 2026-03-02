import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../middlewares/validate';
import authController from '../controllers/authController';

const router = Router();

// Login schema validation
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

// Login route
router.post(
  '/login',
  validate({ body: loginSchema }),
  authController.login.bind(authController)
);

export default router;