const express = require('express');
const { body, validationResult } = require('express-validator');
const Batch = require('../models/Batch');
const User = require('../models/User');
const { authenticateToken, requireAdmin, canAccessBatch } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateBatch = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Batch name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('maxStudents')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Maximum students must be between 1 and 100')
];

// @route   POST /api/batches
// @desc    Create a new batch (Admin only)
// @access  Private/Admin
router.post('/', authenticateToken, requireAdmin, validateBatch, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { name, description, mentors, students, settings } = req.body;

    // Check if batch name already exists
    const existingBatch = await Batch.findOne({ name });
    if (existingBatch) {
      return res.status(400).json({ 
        error: 'Batch with this name already exists' 
      });
    }

    const batchData = {
      name,
      description,
      createdBy: req.user._id,
      settings: {
        allowStudentSubmission: true,
        requireMentorApproval: false,
        maxStudents: 50,
        ...settings
      }
    };

    const batch = new Batch(batchData);
    await batch.save();

    // Add mentors and students if provided
    if (mentors && Array.isArray(mentors)) {
      for (const mentorId of mentors) {
        try {
          await batch.addMentor(mentorId);
        } catch (error) {
          console.warn(`Could not add mentor ${mentorId}:`, error.message);
        }
      }
    }

    if (students && Array.isArray(students)) {
      for (const studentId of students) {
        try {
          await batch.addStudent(studentId);
        } catch (error) {
          console.warn(`Could not add student ${studentId}:`, error.message);
        }
      }
    }

    const populatedBatch = await Batch.findById(batch._id)
      .populate('mentors', 'name email')
      .populate('students', 'name email')
      .populate('createdBy', 'name email');

    res.status(201).json({
      message: 'Batch created successfully',
      batch: populatedBatch
    });

  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ 
      error: 'Server error while creating batch' 
    });
  }
});

// @route   GET /api/batches
// @desc    Get all batches (filtered by user role)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { isActive, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Filter based on user role
    if (req.user.role === 'student') {
      query.students = req.user._id;
    } else if (req.user.role === 'mentor') {
      query.mentors = req.user._id;
    }
    // Admin can see all batches

    const batches = await Batch.find(query)
      .populate('mentors', 'name email')
      .populate('students', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Batch.countDocuments(query);

    res.json({
      batches,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalBatches: total
    });

  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching batches' 
    });
  }
});

// @route   GET /api/batches/:batchId
// @desc    Get a specific batch
// @access  Private
router.get('/:batchId', authenticateToken, canAccessBatch, async (req, res) => {
  try {
    const populatedBatch = await Batch.findById(req.batch._id)
      .populate('mentors', 'name email role')
      .populate('students', 'name email role')
      .populate('createdBy', 'name email');

    res.json({
      batch: populatedBatch
    });

  } catch (error) {
    console.error('Get batch error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching batch' 
    });
  }
});

// @route   PUT /api/batches/:batchId
// @desc    Update a batch (Admin only)
// @access  Private/Admin
router.put('/:batchId', authenticateToken, requireAdmin, validateBatch, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { name, description, settings } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (settings) updates.settings = { ...req.batch.settings, ...settings };

    const updatedBatch = await Batch.findByIdAndUpdate(
      req.batch._id,
      { $set: updates },
      { new: true, runValidators: true }
    )
    .populate('mentors', 'name email')
    .populate('students', 'name email')
    .populate('createdBy', 'name email');

    res.json({
      message: 'Batch updated successfully',
      batch: updatedBatch
    });

  } catch (error) {
    console.error('Update batch error:', error);
    res.status(500).json({ 
      error: 'Server error while updating batch' 
    });
  }
});

// @route   DELETE /api/batches/:batchId
// @desc    Delete a batch (Admin only)
// @access  Private/Admin
router.delete('/:batchId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await req.batch.remove();

    res.json({
      message: 'Batch deleted successfully'
    });

  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({ 
      error: 'Server error while deleting batch' 
    });
  }
});

// @route   POST /api/batches/:batchId/mentors
// @desc    Add mentor to batch (Admin only)
// @access  Private/Admin
router.post('/:batchId/mentors', authenticateToken, requireAdmin, [
  body('mentorId')
    .notEmpty()
    .withMessage('Mentor ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { mentorId } = req.body;

    // Verify user is a mentor
    const mentor = await User.findOne({ _id: mentorId, role: 'mentor' });
    if (!mentor) {
      return res.status(400).json({ 
        error: 'User is not a mentor' 
      });
    }

    await req.batch.addMentor(mentorId);

    const updatedBatch = await Batch.findById(req.batch._id)
      .populate('mentors', 'name email')
      .populate('students', 'name email');

    res.json({
      message: 'Mentor added to batch successfully',
      batch: updatedBatch
    });

  } catch (error) {
    console.error('Add mentor error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error while adding mentor' 
    });
  }
});

// @route   DELETE /api/batches/:batchId/mentors/:mentorId
// @desc    Remove mentor from batch (Admin only)
// @access  Private/Admin
router.delete('/:batchId/mentors/:mentorId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { mentorId } = req.params;

    await req.batch.removeMentor(mentorId);

    const updatedBatch = await Batch.findById(req.batch._id)
      .populate('mentors', 'name email')
      .populate('students', 'name email');

    res.json({
      message: 'Mentor removed from batch successfully',
      batch: updatedBatch
    });

  } catch (error) {
    console.error('Remove mentor error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error while removing mentor' 
    });
  }
});

// @route   POST /api/batches/:batchId/students
// @desc    Add student to batch (Admin only)
// @access  Private/Admin
router.post('/:batchId/students', authenticateToken, requireAdmin, [
  body('studentId')
    .notEmpty()
    .withMessage('Student ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array() 
      });
    }

    const { studentId } = req.body;

    // Verify user is a student
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) {
      return res.status(400).json({ 
        error: 'User is not a student' 
      });
    }

    await req.batch.addStudent(studentId);

    const updatedBatch = await Batch.findById(req.batch._id)
      .populate('mentors', 'name email')
      .populate('students', 'name email');

    res.json({
      message: 'Student added to batch successfully',
      batch: updatedBatch
    });

  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error while adding student' 
    });
  }
});

// @route   DELETE /api/batches/:batchId/students/:studentId
// @desc    Remove student from batch (Admin only)
// @access  Private/Admin
router.delete('/:batchId/students/:studentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { studentId } = req.params;

    await req.batch.removeStudent(studentId);

    const updatedBatch = await Batch.findById(req.batch._id)
      .populate('mentors', 'name email')
      .populate('students', 'name email');

    res.json({
      message: 'Student removed from batch successfully',
      batch: updatedBatch
    });

  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({ 
      error: error.message || 'Server error while removing student' 
    });
  }
});

// @route   GET /api/batches/:batchId/stats
// @desc    Get batch statistics
// @access  Private
router.get('/:batchId/stats', authenticateToken, canAccessBatch, async (req, res) => {
  try {
    const stats = await Batch.getBatchStats(req.batch._id);

    res.json({
      batch: stats.batch,
      stats: stats.stats
    });

  } catch (error) {
    console.error('Get batch stats error:', error);
    res.status(500).json({ 
      error: 'Server error while fetching batch statistics' 
    });
  }
});

module.exports = router; 