const Task = require('../models/Task');
const User = require('../models/User');
const Batch = require('../models/Batch');

// Get all tasks based on user role and access
exports.getAllTasks = async (req, res) => {
  try {
    const { role } = req.user;
    let filter = { status: 'active' };
    
    if (role === 'admin') {
      // Admin can see all tasks
    } else if (role === 'mentor') {
      // Mentor can only see tasks from their assigned batches
      const mentorBatches = await Batch.find({ mentors: req.user._id });
      const batchIds = mentorBatches.map(batch => batch._id);
      filter.batch = { $in: batchIds };
    } else if (role === 'student') {
      // Student can only see tasks assigned to them or their batch
      const studentBatches = await Batch.find({ students: req.user._id });
      const batchIds = studentBatches.map(batch => batch._id);
      filter.$or = [
        { assignedTo: req.user._id },
        { batch: { $in: batchIds } }
      ];
    }
    
    const tasks = await Task.find(filter)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('batch', 'name')
      .sort('-createdAt');
    
    res.json(tasks);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Error fetching tasks', error: err.message });
  }
};

// Create a new task
exports.createTask = async (req, res) => {
  try {
    const { title, description, platform, link, deadline, dueDate, difficulty, points, assignedTo, batch, category, priority, tags, status } = req.body;
    
    const task = new Task({
      title,
      description,
      platform,
      link,
      deadline: deadline ? new Date(deadline) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
      difficulty,
      points: points || 10,
      category,
      priority,
      tags,
      status,
      createdBy: req.user._id,
      assignedTo: assignedTo || [],
      batch: batch || null
    });
    
    await task.save();
    
    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('batch', 'name');
    
    res.status(201).json(populatedTask);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(400).json({ message: 'Error creating task', error: err.message });
  }
};

// Update a task
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, platform, link, deadline, dueDate, difficulty, points, assignedTo, batch, status, category, priority, tags } = req.body;
    
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check permissions - users can edit their own tasks, mentors/admins can edit any task
    const { role } = req.user;
    if (task.createdBy.toString() !== req.user._id.toString() && role !== 'mentor' && role !== 'admin') {
      return res.status(403).json({ message: 'You can only edit your own tasks' });
    }
    
    // If mentor, they can only edit tasks they created or tasks in their batches
    if (role === 'mentor' && task.createdBy.toString() !== req.user._id.toString()) {
      const mentorBatches = await Batch.find({ mentors: req.user._id });
      const batchIds = mentorBatches.map(batch => batch._id);
      
      if (!task.batch || !batchIds.includes(task.batch.toString())) {
        return res.status(403).json({ message: 'You can only edit tasks you created or tasks in your batches' });
      }
    }
    
    // Update fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (platform) task.platform = platform;
    if (link !== undefined) task.link = link;
    if (deadline !== undefined) task.deadline = deadline ? new Date(deadline) : null;
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (difficulty) task.difficulty = difficulty;
    if (points) task.points = points;
    if (category) task.category = category;
    if (priority) task.priority = priority;
    if (tags !== undefined) task.tags = tags;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (batch !== undefined) task.batch = batch;
    if (status) task.status = status;
    
    await task.save();
    
    const updatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email')
      .populate('assignedTo', 'name email')
      .populate('batch', 'name');
    
    res.json(updatedTask);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(400).json({ message: 'Error updating task', error: err.message });
  }
};

// Delete a task
exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check permissions - users can delete their own tasks, mentors/admins can delete any task
    const { role } = req.user;
    if (task.createdBy.toString() !== req.user._id.toString() && role !== 'mentor' && role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete your own tasks' });
    }
    
    // If mentor, they can only delete tasks they created or tasks in their batches
    if (role === 'mentor' && task.createdBy.toString() !== req.user._id.toString()) {
      const mentorBatches = await Batch.find({ mentors: req.user._id });
      const batchIds = mentorBatches.map(batch => batch._id);
      
      if (!task.batch || !batchIds.includes(task.batch.toString())) {
        return res.status(403).json({ message: 'You can only delete tasks you created or tasks in your batches' });
      }
    }
    
    await Task.findByIdAndDelete(id);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(400).json({ message: 'Error deleting task', error: err.message });
  }
};

// Get task statistics
exports.getTaskStats = async (req, res) => {
  try {
    const { role } = req.user;
    let filter = {};
    
    if (role === 'mentor') {
      const mentorBatches = await Batch.find({ mentors: req.user._id });
      const batchIds = mentorBatches.map(batch => batch._id);
      filter.batch = { $in: batchIds };
    } else if (role === 'student') {
      const studentBatches = await Batch.find({ students: req.user._id });
      const batchIds = studentBatches.map(batch => batch._id);
      filter.$or = [
        { assignedTo: req.user._id },
        { batch: { $in: batchIds } }
      ];
    }
    
    const totalTasks = await Task.countDocuments(filter);
    const activeTasks = await Task.countDocuments({ ...filter, status: 'active' });
    const completedTasks = await Task.countDocuments({ ...filter, status: 'completed' });
    
    res.json({
      total: totalTasks,
      active: activeTasks,
      completed: completedTasks
    });
  } catch (err) {
    console.error('Error fetching task stats:', err);
    res.status(500).json({ message: 'Error fetching task stats', error: err.message });
  }
};