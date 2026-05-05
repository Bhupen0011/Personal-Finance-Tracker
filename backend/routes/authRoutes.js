import express from 'express';
import { body } from 'express-validator';
import {
  forgotPassword,
  getProfile,
  loginUser,
  registerUser,
  resetPassword,
  updatePreferences,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validateRequest,
  registerUser,
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  loginUser,
);

router.post(
  '/forgotpassword',
  [body('email').isEmail().withMessage('Valid email is required')],
  validateRequest,
  forgotPassword,
);

router.put(
  '/resetpassword/:resettoken',
  [body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')],
  validateRequest,
  resetPassword,
);

router.get('/me', protect, getProfile);
router.put(
  '/preferences',
  protect,
  [
    body('currency').optional().isString(),
    body('theme').optional().isIn(['light', 'dark']),
    body('notificationSettings').optional().isObject(),
  ],
  validateRequest,
  updatePreferences,
);

export default router;
