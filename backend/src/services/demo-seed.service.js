import mongoose from 'mongoose';

import { DEMO_MESSAGES } from '../data/demo-dataset.js';
import Email from '../models/email.model.js';
import Scan from '../models/scan.model.js';

const withoutScan = (message) =>
  Object.fromEntries(
    Object.entries(message).filter(([field]) => field !== 'scan')
  );

export const ensureDemoDataForUser = async (userId) => {
  const objectUserId = new mongoose.Types.ObjectId(String(userId));

  await Email.bulkWrite(
    DEMO_MESSAGES.map((fixture) => {
      const message = withoutScan(fixture);

      return {
        updateOne: {
          filter: { userId: objectUserId, demoId: message.demoId },
          update: {
            $setOnInsert: {
              ...message,
              userId: objectUserId,
            },
          },
          upsert: true,
        },
      };
    })
  );

  const savedEmails = await Email.find({
    userId: objectUserId,
    demoId: { $in: DEMO_MESSAGES.map((message) => message.demoId) },
  })
    .select('_id demoId')
    .lean();

  const scansByDemoId = new Map(
    DEMO_MESSAGES.filter((message) => message.scan).map((message) => [
      message.demoId,
      message.scan,
    ])
  );

  const scanOperations = savedEmails
    .filter((email) => scansByDemoId.has(email.demoId))
    .map((email) => {
      const scan = scansByDemoId.get(email.demoId);
      return {
        updateOne: {
          filter: { userId: objectUserId, emailId: email._id },
          update: {
            $setOnInsert: {
              userId: objectUserId,
              emailId: email._id,
              score: scan.score,
              ruleScore: scan.score,
              verdict: scan.verdict,
              triggeredRules: scan.triggeredRules,
              explanation: scan.explanation,
              scannedAt: new Date('2026-07-25T09:00:00.000Z'),
            },
          },
          upsert: true,
        },
      };
    });

  if (scanOperations.length > 0) {
    await Scan.bulkWrite(scanOperations);
  }

  return {
    emails: await Email.countDocuments({ userId: objectUserId }),
    scans: await Scan.countDocuments({ userId: objectUserId }),
  };
};
