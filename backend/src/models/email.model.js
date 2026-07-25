import mongoose from 'mongoose';

const emailSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    demoId: {
      type: String,
      required: true,
      trim: true,
    },
    subject: { type: String, default: '', trim: true },
    from: { type: String, default: '', trim: true },
    to: { type: String, default: '', trim: true },
    replyTo: { type: String, default: '', trim: true, lowercase: true },
    displayName: { type: String, default: '', trim: true },
    senderDomain: { type: String, default: '', trim: true, lowercase: true },
    replyToDomain: { type: String, default: '', trim: true, lowercase: true },
    snippet: { type: String, default: '' },
    textBody: { type: String, default: '' },
    htmlBody: { type: String, default: '' },
    links: { type: [String], default: [] },
    linkDomains: { type: [String], default: [] },
    attachmentExtensions: { type: [String], default: [] },
    rawHeaders: { type: mongoose.Schema.Types.Mixed, default: null },
    receivedAt: { type: Date, required: true, index: true },
    riskBucket: {
      type: String,
      enum: ['safe', 'needs_review', 'quarantine', 'unscanned'],
      default: 'unscanned',
      index: true,
    },
    effectiveVerdict: {
      type: String,
      enum: ['safe', 'suspicious', 'likely_phishing'],
      default: null,
    },
  },
  { timestamps: true }
);

emailSchema.index({ userId: 1, demoId: 1 }, { unique: true });
emailSchema.index({ userId: 1, receivedAt: -1 });

export default mongoose.model('Email', emailSchema);
