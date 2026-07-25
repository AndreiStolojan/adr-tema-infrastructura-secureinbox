import mongoose from 'mongoose';

import createError from '../common/errors/create-error.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const dateFilter = ({ from, to }) => {
  const receivedAt = {};
  if (from) receivedAt.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) receivedAt.$lte = new Date(`${to}T23:59:59.999Z`);
  return Object.keys(receivedAt).length ? { receivedAt } : {};
};

const buildFilter = (userId, params = {}) => {
  const filter = {
    userId: new mongoose.Types.ObjectId(String(userId)),
    ...dateFilter(params),
  };

  if (params.riskBucket) filter.riskBucket = params.riskBucket;

  if (params.search?.trim()) {
    const search = new RegExp(escapeRegex(params.search.trim()), 'i');
    filter.$or = [
      { subject: search },
      { from: search },
      { displayName: search },
      { snippet: search },
    ];
  }

  return filter;
};

export const listEmails = async (userId, params = {}) => {
  const page = Math.max(Number.parseInt(params.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(params.limit, 10) || 10, 1),
    50
  );
  const filter = buildFilter(userId, params);
  const [items, total] = await Promise.all([
    Email.find(filter)
      .sort({ receivedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Email.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
};

export const getEmailById = async (userId, emailId) => {
  if (!mongoose.Types.ObjectId.isValid(emailId)) {
    throw createError('Email not found', 404, [], 'EMAIL_NOT_FOUND');
  }

  const email = await Email.findOne({ _id: emailId, userId }).lean();

  if (!email) {
    throw createError('Email not found', 404, [], 'EMAIL_NOT_FOUND');
  }

  return email;
};

export const getEmailRawById = async (userId, emailId) => {
  const email = await getEmailById(userId, emailId);
  return {
    htmlBody: email.htmlBody,
    textBody: email.textBody,
    links: email.links,
    attachmentExtensions: email.attachmentExtensions,
    rawHeaders: email.rawHeaders,
  };
};

export const getDashboardSummary = async (userId) => {
  const objectUserId = new mongoose.Types.ObjectId(String(userId));
  const [emails, topRules] = await Promise.all([
    Email.find({ userId: objectUserId }).sort({ receivedAt: -1 }).lean(),
    Scan.aggregate([
      { $match: { userId: objectUserId } },
      { $unwind: '$triggeredRules' },
      {
        $group: {
          _id: '$triggeredRules.rule',
          count: { $sum: 1 },
          totalPoints: { $sum: '$triggeredRules.points' },
        },
      },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 6 },
      {
        $project: {
          _id: 0,
          rule: '$_id',
          count: 1,
          totalPoints: 1,
        },
      },
    ]),
  ]);

  const distribution = {
    safe: 0,
    needs_review: 0,
    quarantine: 0,
    unscanned: 0,
  };

  emails.forEach((email) => {
    distribution[email.riskBucket] =
      (distribution[email.riskBucket] || 0) + 1;
  });

  return {
    counts: {
      total: emails.length,
      safe: distribution.safe,
      suspicious: distribution.needs_review,
      likelyPhishing: distribution.quarantine,
      unscanned: distribution.unscanned,
    },
    distribution,
    topRules,
    recentEmails: emails.slice(0, 5),
  };
};
