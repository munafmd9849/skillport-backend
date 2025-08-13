const mongoose = require('mongoose');

const ContestSubmissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contest: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest', required: true },
  problem: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true
  },
  code: { type: String, required: true },
  language: { 
    type: String, 
    enum: ['javascript', 'python', 'java', 'cpp', 'c'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'runtime_error', 'compilation_error'], 
    default: 'pending' 
  },
  score: { type: Number, default: 0 },
  executionTime: { type: Number }, // in milliseconds
  memory: { type: Number }, // in KB
  testCasesPassed: { type: Number, default: 0 },
  totalTestCases: { type: Number, default: 0 },
  feedback: { type: String },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ContestSubmission', ContestSubmissionSchema);