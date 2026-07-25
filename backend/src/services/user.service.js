import createError from '../common/errors/create-error.js';
import User from '../models/user.model.js';
import { toPublicUser } from './auth.service.js';

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw createError('User not found', 404, [], 'USER_NOT_FOUND');
  }

  return toPublicUser(user);
};
