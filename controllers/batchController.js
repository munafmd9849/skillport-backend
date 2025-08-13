const Batch = require('../models/Batch');
const User = require('../models/User');

// Get batches based on user role and access permissions
exports.getAllBatches = async (req, res) => {
  try {
    const { role } = req.user;
    
    if (role === 'admin') {
      // Admin can see all batches
      const batches = await Batch.find().populate('mentors students');
      res.json(batches);
    } else if (role === 'mentor') {
      // Mentor can only see batches they're assigned to
      const batches = await Batch.find({ mentors: req.user._id }).populate('mentors students');
      res.json(batches);
    } else if (role === 'student') {
      // Student can only see their own batch
      const batches = await Batch.find({ students: req.user._id }).populate('mentors students');
      res.json(batches);
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const { name } = req.body;
    const batch = new Batch({ name });
    await batch.save();
    res.status(201).json(batch);
  } catch (err) {
    res.status(400).json({ message: 'Error creating batch', error: err.message });
  }
};

exports.assignUsers = async (req, res) => {
  const { id } = req.params;
  const { mentors, students } = req.body; // arrays of user IDs
  try {
    const batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    if (mentors) batch.mentors = mentors;
    if (students) batch.students = students;
    await batch.save();
    // Update users' assignedBatches
    if (mentors) await User.updateMany({ _id: { $in: mentors } }, { $addToSet: { assignedBatches: batch._id } });
    if (students) await User.updateMany({ _id: { $in: students } }, { $addToSet: { assignedBatches: batch._id } });
    res.json(batch);
  } catch (err) {
    res.status(400).json({ message: 'Error assigning users', error: err.message });
  }
};