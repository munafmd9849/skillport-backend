const User = require('../models/User');
const Batch = require('../models/Batch');

// Get users based on role and access permissions
exports.getAllUsers = async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role === 'admin') {
      // Admin can see all users
      const users = await User.find().populate('batch');
      // Remove password from response
      const usersResponse = users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        batch: user.batch,
        createdAt: user.createdAt
      }));
      res.json(usersResponse);
    } else if (role === 'mentor') {
      // Mentor can only see students in their assigned batches
      const mentorBatches = await Batch.find({ mentors: req.user._id });
      const batchIds = mentorBatches.map(batch => batch._id);
      const students = await User.find({ 
        role: 'student', 
        batch: { $in: batchIds } 
      }).populate('batch');
      // Remove password from response
      const studentsResponse = students.map(student => ({
        _id: student._id,
        name: student.name,
        email: student.email,
        username: student.username,
        role: student.role,
        batch: student.batch,
        createdAt: student.createdAt
      }));
      res.json(studentsResponse);
    } else {
      // Students can only see themselves
      const user = await User.findById(req.user._id).populate('batch');
      // Remove password from response
      const userResponse = {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        batch: user.batch,
        createdAt: user.createdAt
      };
      res.json([userResponse]);
    }
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Update user (admin only)
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, username, role, password } = req.body;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if email is being changed and is unique
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }
    
    // Check if username is being changed and is unique
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already in use' });
      }
      user.username = username;
    }
    
    // Update other fields
    if (name) user.name = name;
    if (role) user.role = role;
    
    // Update password if provided
    if (password) {
      const bcrypt = require('bcrypt');
      user.password = await bcrypt.hash(password, 10);
    }
    
    await user.save();
    
    // Return user info without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      assignedBatches: user.assignedBatches,
      createdAt: user.createdAt
    };
    
    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove user from any batches they're assigned to
    await Batch.updateMany(
      { mentors: userId },
      { $pull: { mentors: userId } }
    );
    
    await Batch.updateMany(
      { students: userId },
      { $pull: { students: userId } }
    );
    
    // Delete user
    await User.findByIdAndDelete(userId);
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get users by batch (for admin and mentors)
exports.getUsersByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { role } = req.user;
    
    if (role === 'admin') {
      const batch = await Batch.findById(batchId).populate('mentors students');
      
      // Remove password from response
      const mentorsResponse = batch.mentors.map(mentor => ({
        _id: mentor._id,
        name: mentor.name,
        email: mentor.email,
        username: mentor.username,
        role: mentor.role,
        assignedBatches: mentor.assignedBatches,
        createdAt: mentor.createdAt
      }));
      
      const studentsResponse = batch.students.map(student => ({
        _id: student._id,
        name: student.name,
        email: student.email,
        username: student.username,
        role: student.role,
        assignedBatches: student.assignedBatches,
        createdAt: student.createdAt
      }));
      
      res.json({
        mentors: mentorsResponse,
        students: studentsResponse
      });
    } else if (role === 'mentor') {
      const batch = await Batch.findById(batchId);
      if (!batch.mentors.includes(req.user._id)) {
        return res.status(403).json({ message: 'Access denied to this batch' });
      }
      const populatedBatch = await Batch.findById(batchId).populate('students');
      
      // Remove password from response
      const studentsResponse = populatedBatch.students.map(student => ({
        _id: student._id,
        name: student.name,
        email: student.email,
        username: student.username,
        role: student.role,
        assignedBatches: student.assignedBatches,
        createdAt: student.createdAt
      }));
      
      res.json({ students: studentsResponse });
    } else {
      res.status(403).json({ message: 'Insufficient permissions' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }
    
    // Check if user already exists
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Check if username is provided and unique
    if (username) {
      existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already in use' });
      }
    }
    
    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = new User({
      name,
      email,
      username,
      password: hashedPassword,
      role,
      createdAt: new Date()
    });
    
    await user.save();
    
    // Return user info without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role
    };
    
    res.status(201).json(userResponse);
  } catch (err) {
    res.status(400).json({ message: 'Error creating user', error: err.message });
  }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedBatches');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user info without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      assignedBatches: user.assignedBatches,
      createdAt: user.createdAt
    };
    
    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile (own data for students, others for admin/mentor)
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.user;
    
    if (role === 'student' && userId !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Students can only view their own profile' });
    }
    
    const user = await User.findById(userId).populate('assignedBatches');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user info without password
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      assignedBatches: user.assignedBatches,
      createdAt: user.createdAt
    };
    
    res.json(userResponse);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};