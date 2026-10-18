import * as authService from '../services/auth.service.js';
import { setTokenCookie, clearTokenCookie } from '../utils/jwt.js';

export const register = async (req, res, next) => {
  try {
    const { user, token } = await authService.registerUser(req.body);
    setTokenCookie(res, token);
    res.status(201).json({ success: true, message: 'Registered successfully', data: { user, token } });
  } catch (err) { next(err); }
};

export const login = async (req, res, next) => {
  try {
    const { user, token } = await authService.loginUser(req.body);
    setTokenCookie(res, token);
    res.json({ success: true, message: 'Logged in successfully', data: { user, token } });
  } catch (err) { next(err); }
};

export const logout = async (req, res, next) => {
  try {
    clearTokenCookie(res);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

export const me = async (req, res, next) => {
  try {
    const user = await authService.getUserProfile(req.user._id);
    res.json({ success: true, data: { user } });
  } catch (err) { next(err); }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = req.user;
    Object.assign(user, req.body);
    await user.save();
    res.json({ success: true, message: 'Profile updated', data: { user: user.toJSON() } });
  } catch (err) { next(err); }
};
