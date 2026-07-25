import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import createError from '../common/errors/create-error.js';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../config/env.js';
import User from '../models/user.model.js';

export const toPublicUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const signToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const buildAuthResponse = (user) => ({
  token: signToken(user._id),
  user: toPublicUser(user),
});

export const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw createError('User already exists', 409, [], 'USER_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  });

  return buildAuthResponse(user);
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select('+passwordHash');

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw createError(
      'Invalid email or password',
      401,
      [],
      'INVALID_CREDENTIALS'
    );
  }

  return buildAuthResponse(user);
};
