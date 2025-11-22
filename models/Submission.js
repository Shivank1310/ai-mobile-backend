const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  email: { type: String, required: true },
  test: { type: String, required: true },
  analysis: { type: Object, required: false },
  cheatFlag: { type: Boolean, default: false },
  videoPath: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  serverVerification: { type: Object, default: null },
  reprocessMetrics: { type: Object, default: null }
});

module.exports = mongoose.model('Submission', SubmissionSchema);
