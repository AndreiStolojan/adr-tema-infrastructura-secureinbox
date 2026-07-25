import {
  getDashboardSummary,
  getEmailById,
  getEmailRawById,
  listEmails,
} from '../services/email.service.js';

export const getEmails = async (req, res, next) => {
  try {
    const data = await listEmails(req.user._id, req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getSummary = async (req, res, next) => {
  try {
    const data = await getDashboardSummary(req.user._id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getEmail = async (req, res, next) => {
  try {
    const data = await getEmailById(req.user._id, req.params.emailId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

export const getEmailRaw = async (req, res, next) => {
  try {
    const data = await getEmailRawById(req.user._id, req.params.emailId);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
