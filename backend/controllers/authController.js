import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateToken } from '../utils/token.js';
import { serializeUser } from '../utils/serializers.js';
import crypto from 'crypto';
import { sendEmail } from '../utils/sendEmail.js';

function buildAuthPayload(user) {
  return {
    token: generateToken(user._id),
    user: serializeUser(user),
  };
}

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(400);
    throw new Error('A user with this email already exists');
  }

  const user = await User.create({ name, email, password });
  res.status(201).json(buildAuthPayload(user));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  res.json(buildAuthPayload(user));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error('There is no user with that email');
  }

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
  const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please click on the link below to reset your password:\n\n${resetUrl}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      text: message,
    });
    res.status(200).json({ success: true, message: 'Password reset link sent to email' });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(500);
    throw new Error('Email could not be sent');
  }
});

export const resetPassword = asyncHandler(async (req, res) => {
  const resetPasswordToken = crypto
    .createHash('sha256')
    .update(req.params.resettoken)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error('Invalid or expired password reset token');
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json(buildAuthPayload(user));
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({ user: serializeUser(user) });
});

export const updatePreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const incoming = req.body || {};
  const nextPreferences = {
    currency: incoming.currency || user.preferences?.currency || 'INR',
    theme: incoming.theme || user.preferences?.theme || 'light',
    notificationSettings: {
      budgetAlerts:
        incoming.notificationSettings?.budgetAlerts ?? user.preferences?.notificationSettings?.budgetAlerts ?? true,
      weeklySummary:
        incoming.notificationSettings?.weeklySummary ?? user.preferences?.notificationSettings?.weeklySummary ?? false,
      groupActivity:
        incoming.notificationSettings?.groupActivity ?? user.preferences?.notificationSettings?.groupActivity ?? true,
      settlementReminders:
        incoming.notificationSettings?.settlementReminders
        ?? user.preferences?.notificationSettings?.settlementReminders
        ?? true,
    },
  };

  user.preferences = nextPreferences;
  await user.save();

  res.json({
    message: 'Preferences updated',
    user: serializeUser(user),
  });
});
