import { loginUser, registerUser } from '../services/auth.service.js';

// Controllerul traduce cererea HTTP într-un apel către service. Validarea
// datelor s-a făcut deja în middleware-ul rutei.
export const register = async (req, res, next) => {
  try {
    const data = await registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'User successfully created',
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const data = await loginUser(req.body);
    res.status(200).json({
      success: true,
      message: 'User successfully signed in',
      data,
    });
  } catch (error) {
    next(error);
  }
};
