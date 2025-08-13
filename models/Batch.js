const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Batch name is required'],
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  mentors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: function(v) {
        return this.model('User').findOne({ _id: v, role: 'mentor' }).then(user => !!user);
      },
      message: 'User must be a mentor'
    }
  }],
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: function(v) {
        return this.model('User').findOne({ _id: v, role: 'student' }).then(user => !!user);
      },
      message: 'User must be a student'
    }
  }],
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    validate: {
      validator: function(v) {
        return this.model('User').findOne({ _id: v, role: 'admin' }).then(user => !!user);
      },
      message: 'Only admins can create batches'
    }
  },
  settings: {
    allowStudentSubmission: {
      type: Boolean,
      default: true
    },
    requireMentorApproval: {
      type: Boolean,
      default: false
    },
    maxStudents: {
      type: Number,
      default: 50,
      min: [1, 'Maximum students must be at least 1']
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
batchSchema.index({ name: 1 });
batchSchema.index({ isActive: 1 });
batchSchema.index({ mentors: 1 });
batchSchema.index({ students: 1 });

// Virtual for batch size
batchSchema.virtual('studentCount').get(function() {
  return this.students.length;
});

batchSchema.virtual('mentorCount').get(function() {
  return this.mentors.length;
});

// Method to add student to batch
batchSchema.methods.addStudent = async function(studentId) {
  if (this.students.includes(studentId)) {
    throw new Error('Student is already in this batch');
  }
  
  if (this.students.length >= this.settings.maxStudents) {
    throw new Error('Batch is full');
  }
  
  this.students.push(studentId);
  return await this.save();
};

// Method to remove student from batch
batchSchema.methods.removeStudent = async function(studentId) {
  const index = this.students.indexOf(studentId);
  if (index === -1) {
    throw new Error('Student is not in this batch');
  }
  
  this.students.splice(index, 1);
  return await this.save();
};

// Method to add mentor to batch
batchSchema.methods.addMentor = async function(mentorId) {
  if (this.mentors.includes(mentorId)) {
    throw new Error('Mentor is already in this batch');
  }
  
  this.mentors.push(mentorId);
  return await this.save();
};

// Method to remove mentor from batch
batchSchema.methods.removeMentor = async function(mentorId) {
  const index = this.mentors.indexOf(mentorId);
  if (index === -1) {
    throw new Error('Mentor is not in this batch');
  }
  
  this.mentors.splice(index, 1);
  return await this.save();
};

// Static method to get batch statistics
batchSchema.statics.getBatchStats = async function(batchId) {
  const Submission = mongoose.model('Submission');
  
  const batch = await this.findById(batchId).populate('students', 'email name');
  if (!batch) {
    throw new Error('Batch not found');
  }
  
  const studentEmails = batch.students.map(student => student.email);
  
  const stats = await Submission.aggregate([
    { $match: { email: { $in: studentEmails } } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } },
        reattempts: { $sum: { $cond: [{ $eq: ['$status', 'reattempt'] }, 1, 0] } },
        doubts: { $sum: { $cond: [{ $eq: ['$status', 'doubt'] }, 1, 0] } },
        easy: { $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$difficulty', 'medium'] }, 1, 0] } },
        hard: { $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] } }
      }
    }
  ]);
  
  return {
    batch: batch,
    stats: stats[0] || {
      totalSubmissions: 0,
      solved: 0,
      reattempts: 0,
      doubts: 0,
      easy: 0,
      medium: 0,
      hard: 0
    }
  };
};

module.exports = mongoose.model('Batch', batchSchema); 