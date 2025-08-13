const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// GET /api/tasks - Get all tasks (role-based access)
router.get('/', authenticateToken, taskController.getAllTasks);

// GET /api/tasks/stats - Get task statistics
router.get('/stats', authenticateToken, taskController.getTaskStats);

// POST /api/tasks - Create new task (all authenticated users)
router.post('/', authenticateToken, taskController.createTask);

// PUT /api/tasks/:id - Update task
router.put('/:id', authenticateToken, taskController.updateTask);

// DELETE /api/tasks/:id - Delete task (admin and creator only)
router.delete('/:id', authenticateToken, taskController.deleteTask);

module.exports = router;