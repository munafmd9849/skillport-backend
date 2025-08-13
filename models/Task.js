const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  platform: { 
    type: String, 
    enum: ['LeetCode', 'GitHub', 'GFG', 'HackerRank', 'Project', 'Other'],
    default: 'LeetCode'
  },
  link: { type: String },
  deadline: { type: Date },
  dueDate: { type: Date }, // New field for task tracker
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  points: { type: Number, required: true, min: 1 },
  category: { 
    type: String, 
    enum: ['DSA', 'Web Development', 'System Design', 'Database', 'DevOps', 'Other'],
    default: 'DSA'
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  tags: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'archived', 'todo', 'in_progress', 'done'],
    default: 'todo'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
TaskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Task', TaskSchema);