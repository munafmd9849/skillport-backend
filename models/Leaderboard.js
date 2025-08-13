const mongoose = require('mongoose');

const LeaderboardSchema = new mongoose.Schema({
  contest: { type: mongoose.Schema.Types.ObjectId, ref: 'Contest' },
  community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community' },
  timeFrame: { 
    type: String, 
    enum: ['weekly', 'monthly', 'all_time', 'contest_specific'],
    default: 'all_time'
  },
  rankings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    score: { type: Number, default: 0 },
    problemsSolved: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    acceptedSubmissions: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 }, // Percentage
    averageTime: { type: Number }, // Average time in milliseconds
    rank: { type: Number }
  }],
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Leaderboard', LeaderboardSchema);