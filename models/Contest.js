const mongoose = require('mongoose');

const ContestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  problems: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    points: { type: Number, required: true },
    sampleInput: { type: String },
    sampleOutput: { type: String },
    testCases: [{
      input: { type: String, required: true },
      expectedOutput: { type: String, required: true }
    }]
  }],
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Contest', ContestSchema);