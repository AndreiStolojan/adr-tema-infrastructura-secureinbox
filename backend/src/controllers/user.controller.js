import { getCurrentUser } from '../services/user.service.js';

export const getMe = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user._id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};
