const express = require('express');
const Submission = require('../models/Submission');
const Batch = require('../models/Batch');
const User = require('../models/User');
const { authenticateToken, requireMentorOrAdmin, requireAdmin } = require('../middleware/auth');
const os = require('os');
const mongoose = require('mongoose');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview based on user role
// @access  Private
router.get('/overview', authenticateToken, async (req, res) => {
  try {
    let overview = {};

    if (req.user.role === 'student') {
      // Student dashboard overview
      const stats = await Submission.getUserStats(req.user.email);
      const platformStats = await Submission.getPlatformStats(req.user.email);
      
      // Get recent submissions
      const recentSubmissions = await Submission.find({ email: req.user.email })
        .sort({ timestamp: -1 })
        .limit(5);

      // Get user's batch info
      const batch = req.user.batch ? await Batch.findById(req.user.batch).populate('mentors', 'name email') : null;

      overview = {
        stats,
        platformStats,
        recentSubmissions,
        batch
      };

    } else if (req.user.role === 'mentor') {
      // Mentor dashboard overview
      const batches = await Batch.find({ mentors: req.user._id, isActive: true })
        .populate('students', 'name email')
        .populate('mentors', 'name email');

      const batchStats = [];
      for (const batch of batches) {
        const stats = await Batch.getBatchStats(batch._id);
        batchStats.push({
          batch: batch,
          stats: stats.stats
        });
      }

      // Get total students under this mentor
      const totalStudents = batches.reduce((sum, batch) => sum + batch.students.length, 0);

      overview = {
        batches,
        batchStats,
        totalStudents,
        totalBatches: batches.length
      };

    } else if (req.user.role === 'admin') {
      // Admin dashboard overview
      const totalUsers = await User.countDocuments();
      const totalStudents = await User.countDocuments({ role: 'student' });
      const totalMentors = await User.countDocuments({ role: 'mentor' });
      const totalBatches = await Batch.countDocuments({ isActive: true });

      // Get overall submission stats
      const overallStats = await Submission.aggregate([
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

      // Get recent batches
      const recentBatches = await Batch.find({ isActive: true })
        .populate('students', 'name email')
        .populate('mentors', 'name email')
        .sort({ createdAt: -1 })
        .limit(5);

      // Get platform-wise stats
      const platformStats = await Submission.aggregate([
        {
          $group: {
            _id: '$platform',
            count: { $sum: 1 },
            solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } },
            reattempts: { $sum: { $cond: [{ $eq: ['$status', 'reattempt'] }, 1, 0] } },
            doubts: { $sum: { $cond: [{ $eq: ['$status', 'doubt'] }, 1, 0] } }
          }
        },
        { $sort: { count: -1 } }
      ]);

      overview = {
        totalUsers,
        totalStudents,
        totalMentors,
        totalBatches,
        overallStats: overallStats[0] || {
          totalSubmissions: 0,
          solved: 0,
          reattempts: 0,
          doubts: 0,
          easy: 0,
          medium: 0,
          hard: 0
        },
        recentBatches,
        platformStats
      };
    }

    res.json({
      overview
    });

  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching dashboard overview' 
    });
  }
});

// @route   GET /api/dashboard/system-status
// @desc    Get system status information (Admin only)
// @access  Private/Admin
router.get('/system-status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Calculate uptime in hours and minutes
    const uptimeSeconds = os.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    
    // Get CPU load average (last 1, 5, 15 minutes)
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const serverLoad = Math.round((loadAvg[0] / cpuCount) * 100);
    
    // Get memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = Math.round((usedMemory / totalMemory) * 100);
    
    // Get MongoDB connection status
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    
    // Calculate database usage (mock data as MongoDB doesn't provide this directly)
    const dbUsage = Math.floor(Math.random() * 30) + 20; // Random value between 20-50%
    
    // Determine system status based on server load and database connection
    let systemStatus = 'Operational';
    if (serverLoad > 80 || dbStatus !== 'Connected') {
      systemStatus = 'Degraded';
    }
    if (serverLoad > 95 || memoryUsagePercent > 90) {
      systemStatus = 'Outage';
    }
    
    res.json({
      systemStatus,
      serverLoad: `${serverLoad}%`,
      databaseUsage: `${dbUsage}%`,
      databaseStatus: dbStatus,
      uptime: `${uptimeHours}h ${uptimeMinutes}m`,
      memoryUsage: `${memoryUsagePercent}%`,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ error: 'Failed to retrieve system status' });
  }
});

// @route   GET /api/dashboard/analytics
// @desc    Get analytics data (Mentor/Admin only)
// @access  Private/Mentor/Admin
router.get('/analytics', authenticateToken, requireMentorOrAdmin, async (req, res) => {
  try {
    const { batchId, startDate, endDate, groupBy = 'day' } = req.query;

    let matchStage = {};
    
    // Filter by batch if specified
    if (batchId) {
      const batch = await Batch.findById(batchId).populate('students', 'email');
      if (batch) {
        matchStage.email = { $in: batch.students.map(s => s.email) };
      }
    }

    // Filter by date range
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }

    // Date grouping format
    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = { $dateToString: { format: "%Y-%m-%d-%H", date: "$timestamp" } };
        break;
      case 'day':
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
        break;
      case 'week':
        dateFormat = { $dateToString: { format: "%Y-%U", date: "$timestamp" } };
        break;
      case 'month':
        dateFormat = { $dateToString: { format: "%Y-%m", date: "$timestamp" } };
        break;
      default:
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: dateFormat,
            status: "$status",
            difficulty: "$difficulty",
            platform: "$platform"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          submissions: {
            $push: {
              status: "$_id.status",
              difficulty: "$_id.difficulty",
              platform: "$_id.platform",
              count: "$count"
            }
          },
          totalCount: { $sum: "$count" }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const analytics = await Submission.aggregate(pipeline);

    // Get top performers
    const topPerformers = await Submission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$email",
          totalSubmissions: { $sum: 1 },
          solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } },
          successRate: {
            $multiply: [
              { $divide: [
                { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } },
                { $sum: 1 }
              ] },
              100
            ]
          }
        }
      },
      { $sort: { solved: -1, successRate: -1 } },
      { $limit: 10 }
    ]);

    // Populate user names for top performers
    const topPerformersWithNames = await User.populate(topPerformers, {
      path: '_id',
      select: 'name email',
      model: 'User'
    });

    res.json({
      analytics,
      topPerformers: topPerformersWithNames
    });

  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching analytics' 
    });
  }
});

// @route   GET /api/dashboard/leaderboard
// @desc    Get leaderboard data
// @access  Private
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { batchId, timeRange = 'all' } = req.query;

    let matchStage = {};
    
    // Filter by batch if specified
    if (batchId) {
      const batch = await Batch.findById(batchId).populate('students', 'email');
      if (batch) {
        matchStage.email = { $in: batch.students.map(s => s.email) };
      }
    }

    // Filter by time range
    if (timeRange !== 'all') {
      const now = new Date();
      let startDate;
      
      switch (timeRange) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
      
      matchStage.timestamp = { $gte: startDate };
    }

    const leaderboard = await Submission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$email",
          totalSubmissions: { $sum: 1 },
          solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } },
          easy: { $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$difficulty', 'medium'] }, 1, 0] } },
          hard: { $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] } },
          totalAttempts: { $sum: '$attempts' },
          successRate: {
            $multiply: [
              { $divide: [
                { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } },
                { $sum: 1 }
              ] },
              100
            ]
          },
          lastSubmission: { $max: '$timestamp' }
        }
      },
      { $sort: { solved: -1, successRate: -1, totalSubmissions: -1 } },
      { $limit: 50 }
    ]);

    // Populate user names
    const leaderboardWithNames = await User.populate(leaderboard, {
      path: '_id',
      select: 'name email role',
      model: 'User'
    });

    res.json({
      leaderboard: leaderboardWithNames,
      timeRange
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching leaderboard' 
    });
  }
});

// @route   GET /api/dashboard/trends
// @desc    Get trends data
// @access  Private
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const { batchId, days = 30 } = req.query;

    let matchStage = {};
    
    // Filter by batch if specified
    if (batchId) {
      const batch = await Batch.findById(batchId).populate('students', 'email');
      if (batch) {
        matchStage.email = { $in: batch.students.map(s => s.email) };
      }
    }

    // Filter by date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    matchStage.timestamp = { $gte: startDate };

    const trends = await Submission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            status: "$status",
            difficulty: "$difficulty"
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          submissions: {
            $push: {
              status: "$_id.status",
              difficulty: "$_id.difficulty",
              count: "$count"
            }
          },
          totalCount: { $sum: "$count" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get daily active users
    const dailyActiveUsers = await Submission.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            email: "$email"
          }
        }
      },
      {
        $group: {
          _id: "$_id.date",
          activeUsers: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      trends,
      dailyActiveUsers
    });

  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching trends' 
    });
  }
});

module.exports = router;