import mongoose from 'mongoose';

import createError from '../common/errors/create-error.js';
import Scan from '../models/scan.model.js';

export const getLatestScanForEmail = async (userId, emailId) => {
  if (!mongoose.Types.ObjectId.isValid(emailId)) {
    throw createError('Scan not found', 404, [], 'SCAN_NOT_FOUND');
  }

  const scan = await Scan.findOne({ userId, emailId }).lean();

  if (!scan) {
    throw createError('Scan not found', 404, [], 'SCAN_NOT_FOUND');
  }

  return scan;
};
