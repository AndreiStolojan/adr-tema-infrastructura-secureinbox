import mongoose from 'mongoose';

const triggeredRuleSchema = new mongoose.Schema(
  {
    rule: { type: String, required: true, trim: true },
    points: { type: Number, required: true, min: 0 },
    details: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const scanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    emailId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Email',
      required: true,
      index: true,
    },
    score: { type: Number, required: true, min: 0, max: 100 },
    ruleScore: { type: Number, required: true, min: 0, max: 100 },
    verdict: {
      type: String,
      enum: ['safe', 'suspicious', 'likely_phishing'],
      required: true,
    },
    triggeredRules: { type: [triggeredRuleSchema], default: [] },
    explanation: { type: String, default: '' },
    scannedAt: { type: Date, default: Date.now, required: true },
  },
  { timestamps: true }
);

scanSchema.index({ userId: 1, emailId: 1 }, { unique: true });

export default mongoose.model('Scan', scanSchema);
