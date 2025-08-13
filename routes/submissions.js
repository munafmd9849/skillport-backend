const express = require('express');
const { body, validationResult } = require('express-validator');
const Submission = require('../models/Submission');
const { authenticateToken, canAccessSubmission, requireMentorOrAdmin } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateSubmission = [
  body('platform')
    .isIn(['leetcode', 'geeksforgeeks', 'hackerrank', 'codeforces'])
    .withMessage('Platform must be leetcode, geeksforgeeks, hackerrank, or codeforces'),
  body('url')
    .optional()
    .isURL()
    .withMessage('URL must be valid'),
  body('slug')
    .optional()
    .isString()
    .withMessage('Slug must be a string'),
  body('problemTitle')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Problem title must be between 1 and 200 characters'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
  body('status')
    .optional()
    .isIn(['solved', 'reattempt', 'doubt', 'in-progress'])
    .withMessage('Status must be solved, reattempt, doubt, or in-progress'),
  body('attempts')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Attempts must be a positive integer'),
  body('username')
    .optional()
    .isString()
    .withMessage('Username must be a string')
];

// @route   POST /api/submissions
// @desc    Create a new submission
// @access  Private
router.post('/', authenticateToken, validateSubmission, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    // Process the submission to ensure it has all required fields
    const submissionData = {
      ...req.body,
      email: req.user.email,
      timestamp: req.body.timestamp || new Date()
    };
    
    // If we have a URL but no problemUrl, copy it
    if (req.body.url && !req.body.problemUrl) {
      submissionData.problemUrl = req.body.url;
    }
    
    // If we have a slug but no problemTitle, use it as a fallback
    if (req.body.slug && !req.body.problemTitle) {
      submissionData.problemTitle = req.body.slug.replace(/-/g, ' ');
    }

    const submission = new Submission(submissionData);
    await submission.save();

    res.status(201).json({
      message: 'Submission created successfully',
      submission
    });

  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ 
      error: 'Server error while creating submission' 
    });
  }
});

// @route   GET /api/submissions
// @desc    Get user's submissions with filters
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      platform, 
      difficulty, 
      status, 
      page = 1, 
      limit = 10,
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const query = { email: req.user.email };
    if (platform) query.platform = platform;
    if (difficulty) query.difficulty = difficulty;
    if (status) query.status = status;

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const submissions = await Submission.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Submission.countDocuments(query);

    res.json({
      submissions,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalSubmissions: total
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching submissions' 
    });
  }
});

// @route   GET /api/submissions/:submissionId
// @desc    Get a specific submission
// @access  Private
router.get('/:submissionId', authenticateToken, canAccessSubmission, async (req, res) => {
  try {
    res.json({
      submission: req.submission
    });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching submission' 
    });
  }
});

// @route   PUT /api/submissions/:submissionId
// @desc    Update a submission
// @access  Private
router.put('/:submissionId', authenticateToken, canAccessSubmission, validateSubmission, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const updatedSubmission = await req.submission.updateSubmission(req.body);

    res.json({
      message: 'Submission updated successfully',
      submission: updatedSubmission
    });

  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({ 
      error: 'Server error while updating submission' 
    });
  }
});

// @route   DELETE /api/submissions/:submissionId
// @desc    Delete a submission
// @access  Private
router.delete('/:submissionId', authenticateToken, canAccessSubmission, async (req, res) => {
  try {
    await req.submission.remove();

    res.json({
      message: 'Submission deleted successfully'
    });

  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ 
      error: 'Server error while deleting submission' 
    });
  }
});

// @route   GET /api/submissions/stats/user
// @desc    Get user's submission statistics
// @access  Private
router.get('/stats/user', authenticateToken, async (req, res) => {
  try {
    const stats = await Submission.getUserStats(req.user.email);
    const platformStats = await Submission.getPlatformStats(req.user.email);

    res.json({
      stats,
      platformStats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching user statistics' 
    });
  }
});

// @route   GET /api/submissions/stats/all
// @desc    Get all submissions statistics (Mentor/Admin only)
// @access  Private/Mentor/Admin
router.get('/stats/all', authenticateToken, requireMentorOrAdmin, async (req, res) => {
  try {
    const { batchId, startDate, endDate } = req.query;
    
    const matchStage = {};
    if (batchId) {
      const Batch = require('../models/Batch');
      const batch = await Batch.findById(batchId).populate('students', 'email');
      if (batch) {
        matchStage.email = { $in: batch.students.map(s => s.email) };
      }
    }
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }

    const pipeline = [];
    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    pipeline.push({
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        solved: { $sum: { $cond: [{ $eq: ['$status', 'solved'] }, 1, 0] } },
        reattempts: { $sum: { $cond: [{ $eq: ['$status', 'reattempt'] }, 1, 0] } },
        doubts: { $sum: { $cond: [{ $eq: ['$status', 'doubt'] }, 1, 0] } },
        easy: { $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$difficulty', 'medium'] }, 1, 0] } },
        hard: { $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] } },
        totalAttempts: { $sum: '$attempts' }
      }
    });

    const stats = await Submission.aggregate(pipeline);
    const result = stats[0] || {
      totalSubmissions: 0,
      solved: 0,
      reattempts: 0,
      doubts: 0,
      easy: 0,
      medium: 0,
      hard: 0,
      totalAttempts: 0
    };

    res.json({
      stats: result
    });

  } catch (error) {
    console.error('Get all stats error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching statistics' 
    });
  }
});

// @route   POST /api/submissions/bulk
// @desc    Create multiple submissions (for browser extension)
// @access  Private
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { submissions } = req.body;

    if (!Array.isArray(submissions) || submissions.length === 0) {
      return res.status(400).json({ 
        error: 'Submissions array is required and must not be empty' 
      });
    }

    const submissionData = submissions.map(sub => {
      // Process each submission to ensure it has all required fields
      const processedSub = {
        ...sub,
        email: req.user.email,
        timestamp: sub.timestamp || new Date(),
      };
      
      // If we have a URL but no problemUrl, copy it
      if (sub.url && !sub.problemUrl) {
        processedSub.problemUrl = sub.url;
      }
      
      // If we have a slug but no problemTitle, use it as a fallback
      if (sub.slug && !sub.problemTitle) {
        processedSub.problemTitle = sub.slug.replace(/-/g, ' ');
      }
      
      return processedSub;
    });

    const createdSubmissions = await Submission.insertMany(submissionData);

    res.status(201).json({
      message: `${createdSubmissions.length} submissions created successfully`,
      submissions: createdSubmissions
    });

  } catch (error) {
    console.error('Bulk create submissions error:', error);
    res.status(500).json({ 
      error: 'Server error while creating submissions' 
    });
  }
});

// @route   POST /api/submissions/extension
// @desc    Create a new submission from browser extension (simplified format)
// @access  Public (no auth required for extension submissions)
router.post('/extension', async (req, res) => {
  try {
    // Validate minimal required fields
    const { email, platform, url, slug, timestamp, username } = req.body;
    
    if (!email || !platform || !url) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, platform, and url are required' 
      });
    }

    // Process the submission to ensure it has all required fields
    const submissionData = {
      ...req.body,
      timestamp: timestamp || new Date(),
      status: 'solved' // Default for extension submissions
    };
    
    // If we have a URL but no problemUrl, copy it
    if (url && !req.body.problemUrl) {
      submissionData.problemUrl = url;
    }
    
    // If we have a slug but no problemTitle, use it as a fallback
    if (slug && !req.body.problemTitle) {
      submissionData.problemTitle = slug.replace(/-/g, ' ');
    }
    
    // Set platform-specific username fields
    if (username) {
      if (platform === 'leetcode') {
        submissionData.leetcodeUsername = username;
      } else if (platform === 'codeforces') {
        submissionData.codeforcesUsername = username;
      } else if (platform === 'geeksforgeeks') {
        submissionData.gfgUsername = username;
      }
    }

    const submission = new Submission(submissionData);
    await submission.save();

    res.status(201).json({
      message: 'Submission created successfully',
      submission
    });

  } catch (error) {
    console.error('Extension submission error:', error);
    res.status(500).json({ 
      error: 'Server error while creating submission' 
    });
  }
});



module.exports = router;