const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No token provided.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid token. User not found.' 
      });
    }

    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token.' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired.' 
      });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Internal server error during authentication.' 
    });
  }
};

// Middleware to check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required.' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }

    next();
  };
};

// Middleware to check if user is admin
const requireAdmin = requireRole(['admin']);

// Middleware to check if user is mentor or admin
const requireMentorOrAdmin = requireRole(['mentor', 'admin']);

// Middleware to check if user is student
const requireStudent = requireRole(['student']);

// Middleware to check if user can access batch
const canAccessBatch = async (req, res, next) => {
  try {
    const batchId = req.params.batchId || req.body.batchId;
    
    if (!batchId) {
      return res.status(400).json({ 
        error: 'Batch ID is required.' 
      });
    }

    const Batch = require('../models/Batch');
    const batch = await Batch.findById(batchId);
    
    if (!batch) {
      return res.status(404).json({ 
        error: 'Batch not found.' 
      });
    }

    // Admin can access any batch
    if (req.user.role === 'admin') {
      req.batch = batch;
      return next();
    }

    // Mentor can access batches they're assigned to
    if (req.user.role === 'mentor' && batch.mentors.includes(req.user._id)) {
      req.batch = batch;
      return next();
    }

    // Student can access batches they're in
    if (req.user.role === 'student' && batch.students.includes(req.user._id)) {
      req.batch = batch;
      return next();
    }

    return res.status(403).json({ 
      error: 'Access denied. You are not authorized to access this batch.' 
    });
  } catch (error) {
    console.error('Batch access check error:', error);
    res.status(500).json({ 
      error: 'Internal server error during batch access check.' 
    });
  }
};

// Middleware to check if user can access submission
const canAccessSubmission = async (req, res, next) => {
  try {
    const submissionId = req.params.submissionId || req.body.submissionId;
    
    if (!submissionId) {
      return res.status(400).json({ 
        error: 'Submission ID is required.' 
      });
    }

    const Submission = require('../models/Submission');
    const submission = await Submission.findById(submissionId);
    
    if (!submission) {
      return res.status(404).json({ 
        error: 'Submission not found.' 
      });
    }

    // Admin and mentors can access any submission
    if (req.user.role === 'admin' || req.user.role === 'mentor') {
      req.submission = submission;
      return next();
    }

    // Students can only access their own submissions
    if (req.user.role === 'student' && submission.email === req.user.email) {
      req.submission = submission;
      return next();
    }

    return res.status(403).json({ 
      error: 'Access denied. You are not authorized to access this submission.' 
    });
  } catch (error) {
    console.error('Submission access check error:', error);
    res.status(500).json({ 
      error: 'Internal server error during submission access check.' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireMentorOrAdmin,
  requireStudent,
  canAccessBatch,
  canAccessSubmission
}; 