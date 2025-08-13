const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/users/me - Current user profile
router.get('/me', authenticateToken, userController.getCurrentUser);

// GET /api/users - All users (admin), assigned students (mentor), self (student)
router.get('/', authenticateToken, userController.getAllUsers);

// GET /api/users/:userId - User profile
router.get('/:userId', authenticateToken, userController.getUserProfile);

// GET /api/users/batch/:batchId - Users in specific batch
router.get('/batch/:batchId', authenticateToken, requireRole(['admin', 'mentor']), userController.getUsersByBatch);

// POST /api/users - Create user (admin only)
router.post('/', authenticateToken, requireRole(['admin']), userController.createUser);

// PUT /api/users/:userId - Update user (admin only)
router.put('/:userId', authenticateToken, requireRole(['admin']), userController.updateUser);

// DELETE /api/users/:userId - Delete user (admin only)
router.delete('/:userId', authenticateToken, requireRole(['admin']), userController.deleteUser);

module.exports = router;