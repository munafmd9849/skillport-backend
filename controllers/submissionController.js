const Submission = require('../models/Submission');
const User = require('../models/User');
const Batch = require('../models/Batch');

exports.addSubmission = async (req, res) => {
  try {
    const { 
      email, 
      platform, 
      problem, 
      slug, 
      username, 
      url, 
      attempts, 
      timestamp 
    } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find user's batch (students belong to one batch)
    const batch = await Batch.findOne({ students: user._id });
    if (!batch) {
      return res.status(400).json({ message: 'User not assigned to any batch' });
    }
    
    // Determine verdict based on attempts (simplified logic)
    const verdict = attempts === 1 ? 'Solved' : 'Reattempt';
    
    // Use slug as problemName if available, otherwise use problem
    const problemName = slug || problem || 'Unknown Problem';
    
    const submission = new Submission({
      user: user._id,
      batch: batch._id,
      platform,
      problemName,
      username,
      url,
      slug,
      verdict,
      attempts,
      timestamp: timestamp || new Date()
    });
    
    await submission.save();
    res.status(201).json(submission);
  } catch (err) {
    console.error('Submission error:', err);
    res.status(400).json({ message: 'Error adding submission', error: err.message });
  }
};

exports.getSubmissions = async (req, res) => {
  try {
    const { role } = req.user;
    const { platform, verdict, from, to, minAttempts, maxAttempts } = req.query;
    
    let filter = {};
    
    // Role-based access control
    if (role === 'admin') {
      // Admin can see all submissions
    } else if (role === 'mentor') {
      // Mentor can only see submissions from their assigned batches
      const mentorBatches = await Batch.find({ mentors: req.user._id });
      const batchIds = mentorBatches.map(batch => batch._id);
      filter.batch = { $in: batchIds };
    } else if (role === 'student') {
      // Student can only see their own submissions
      filter.user = req.user._id;
    }
    
    // Apply filters
    if (platform) filter.platform = platform;
    if (verdict) filter.verdict = verdict;
    if (from || to) filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
    if (minAttempts) filter.attempts = { ...filter.attempts, $gte: Number(minAttempts) };
    if (maxAttempts) filter.attempts = { ...filter.attempts, $lte: Number(maxAttempts) };
    
    const submissions = await Submission.find(filter).populate('user batch');
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching submissions', error: err.message });
  }
};