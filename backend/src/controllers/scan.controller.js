import { getLatestScanForEmail } from '../services/scan.service.js';

export const getLatestScan = async (req, res, next) => {
  try {
    const data = await getLatestScanForEmail(
      req.user._id,
      req.params.emailId
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
