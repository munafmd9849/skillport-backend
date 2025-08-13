const Contest = require('../models/Contest');
const User = require('../models/User');
const Community = require('../models/Community');
const ContestSubmission = require('../models/ContestSubmission');
const Leaderboard = require('../models/Leaderboard');

// Get all contests
exports.getAllContests = async (req, res) => {
  try {
    const contests = await Contest.find()
      .populate('creator', 'name username')
      .populate('community', 'name')
      .select('-participants -problems.testCases');
    
    res.status(200).json(contests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get contest by ID
exports.getContestById = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.contestId)
      .populate('creator', 'name username')
      .populate('community', 'name')
      .populate('participants', 'name username');
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // If user is not creator or admin, hide test cases
    if (contest.creator._id.toString() !== req.user.id && req.user.role !== 'admin') {
      contest.problems.forEach(problem => {
        problem.testCases = [];
      });
    }
    
    res.status(200).json(contest);
  } catch (error) {
    console.error('Error fetching contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new contest
exports.createContest = async (req, res) => {
  try {
    const { title, description, startDate, endDate, problems, communityId } = req.body;
    
    // Validate required fields
    if (!title || !description || !startDate || !endDate || !problems || problems.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }
    
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    // If community is specified, check if it exists and user is admin
    if (communityId) {
      const community = await Community.findById(communityId);
      
      if (!community) {
        return res.status(404).json({ message: 'Community not found' });
      }
      
      // Check if user is admin or creator of the community
      if (community.createdBy.toString() !== req.user.id && 
          !community.admins.includes(req.user.id) && 
          req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to create contests for this community' });
      }
    }
    
    // Create new contest
    const newContest = new Contest({
      title,
      description,
      startDate,
      endDate,
      creator: req.user.id,
      problems,
      status: start <= new Date() && end >= new Date() ? 'active' : 'upcoming',
      community: communityId
    });
    
    const contest = await newContest.save();
    
    // Add contest to user's created contests
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { contestsCreated: contest._id } }
    );
    
    // If community is specified, add contest to community
    if (communityId) {
      await Community.findByIdAndUpdate(
        communityId,
        { $push: { contests: contest._id } }
      );
    }
    
    // Initialize leaderboard
    const newLeaderboard = new Leaderboard({
      contest: contest._id,
      community: communityId,
      timeFrame: 'all',
      rankings: []
    });
    
    await newLeaderboard.save();
    
    res.status(201).json(contest);
  } catch (error) {
    console.error('Error creating contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update contest
exports.updateContest = async (req, res) => {
  try {
    const { title, description, startDate, endDate, problems, status } = req.body;
    const contestId = req.params.contestId;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if user is creator or admin
    if (contest.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this contest' });
    }
    
    // Check if contest has already ended
    if (new Date(contest.endDate) < new Date()) {
      return res.status(400).json({ message: 'Cannot update a contest that has already ended' });
    }
    
    // Update fields
    if (title) contest.title = title;
    if (description) contest.description = description;
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ message: 'Invalid start date format' });
      }
      contest.startDate = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({ message: 'Invalid end date format' });
      }
      contest.endDate = end;
    }
    if (problems) contest.problems = problems;
    if (status) contest.status = status;
    
    // Validate dates
    if (new Date(contest.startDate) >= new Date(contest.endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }
    
    // Update status based on dates
    const now = new Date();
    if (new Date(contest.startDate) <= now && new Date(contest.endDate) >= now) {
      contest.status = 'active';
    } else if (new Date(contest.startDate) > now) {
      contest.status = 'upcoming';
    } else {
      contest.status = 'completed';
    }
    
    const updatedContest = await contest.save();
    
    res.status(200).json(updatedContest);
  } catch (error) {
    console.error('Error updating contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete contest
exports.deleteContest = async (req, res) => {
  try {
    const contestId = req.params.contestId;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if user is creator or admin
    if (contest.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this contest' });
    }
    
    // Remove contest from all users' participated and created contests
    await User.updateMany(
      { $or: [{ contestsParticipated: contestId }, { contestsCreated: contestId }] },
      { 
        $pull: { 
          contestsParticipated: contestId,
          contestsCreated: contestId 
        } 
      }
    );
    
    // If contest is associated with a community, remove it from the community
    if (contest.community) {
      await Community.findByIdAndUpdate(
        contest.community,
        { $pull: { contests: contestId } }
      );
    }
    
    // Delete all submissions for this contest
    await ContestSubmission.deleteMany({ contest: contestId });
    
    // Delete leaderboard for this contest
    await Leaderboard.deleteMany({ contest: contestId });
    
    // Delete contest
    await Contest.findByIdAndDelete(contestId);
    
    res.status(200).json({ message: 'Contest deleted successfully' });
  } catch (error) {
    console.error('Error deleting contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Join contest
exports.joinContest = async (req, res) => {
  try {
    const contestId = req.params.contestId;
    const userId = req.user.id;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if contest has already ended
    if (new Date(contest.endDate) < new Date()) {
      return res.status(400).json({ message: 'Cannot join a contest that has already ended' });
    }
    
    // Check if user is already a participant
    if (contest.participants.includes(userId)) {
      return res.status(400).json({ message: 'Already participating in this contest' });
    }
    
    // If contest is associated with a community, check if user is a member
    if (contest.community) {
      const community = await Community.findById(contest.community);
      
      if (!community.members.includes(userId)) {
        return res.status(403).json({ message: 'You must be a member of the community to join this contest' });
      }
    }
    
    // Add user to contest participants
    contest.participants.push(userId);
    await contest.save();
    
    // Add contest to user's participated contests
    await User.findByIdAndUpdate(
      userId,
      { $push: { contestsParticipated: contestId } }
    );
    
    res.status(200).json({ message: 'Successfully joined contest' });
  } catch (error) {
    console.error('Error joining contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Leave contest
exports.leaveContest = async (req, res) => {
  try {
    const contestId = req.params.contestId;
    const userId = req.user.id;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if contest has already started
    if (new Date(contest.startDate) <= new Date()) {
      return res.status(400).json({ message: 'Cannot leave a contest that has already started' });
    }
    
    // Check if user is a participant
    if (!contest.participants.includes(userId)) {
      return res.status(400).json({ message: 'Not participating in this contest' });
    }
    
    // Remove user from contest participants
    contest.participants = contest.participants.filter(participant => participant.toString() !== userId);
    await contest.save();
    
    // Remove contest from user's participated contests
    await User.findByIdAndUpdate(
      userId,
      { $pull: { contestsParticipated: contestId } }
    );
    
    res.status(200).json({ message: 'Successfully left contest' });
  } catch (error) {
    console.error('Error leaving contest:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get contests for current user
exports.getMyContests = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get participated contests
    const participatedContests = await Contest.find({
      _id: { $in: user.contestsParticipated }
    })
    .populate('creator', 'name username')
    .populate('community', 'name')
    .select('-problems.testCases');
    
    // Get created contests if user is mentor or admin
    let createdContests = [];
    if (user.role === 'mentor' || user.role === 'admin') {
      createdContests = await Contest.find({
        creator: userId
      })
      .populate('creator', 'name username')
      .populate('community', 'name')
      .select('-problems.testCases');
    }
    
    res.status(200).json({
      participated: participatedContests,
      created: createdContests
    });
  } catch (error) {
    console.error('Error fetching user contests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active contests
exports.getActiveContests = async (req, res) => {
  try {
    const now = new Date();
    
    const contests = await Contest.find({
      startDate: { $lte: now },
      endDate: { $gte: now },
      status: 'active'
    })
    .populate('creator', 'name username')
    .populate('community', 'name')
    .select('-problems.testCases');
    
    res.status(200).json(contests);
  } catch (error) {
    console.error('Error fetching active contests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get upcoming contests
exports.getUpcomingContests = async (req, res) => {
  try {
    const now = new Date();
    
    const contests = await Contest.find({
      startDate: { $gt: now },
      status: 'upcoming'
    })
    .populate('creator', 'name username')
    .populate('community', 'name')
    .select('-problems.testCases');
    
    res.status(200).json(contests);
  } catch (error) {
    console.error('Error fetching upcoming contests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get completed contests
exports.getCompletedContests = async (req, res) => {
  try {
    const now = new Date();
    
    const contests = await Contest.find({
      endDate: { $lt: now },
      status: 'completed'
    })
    .populate('creator', 'name username')
    .populate('community', 'name')
    .select('-problems.testCases');
    
    res.status(200).json(contests);
  } catch (error) {
    console.error('Error fetching completed contests:', error);
    res.status(500).json({ message: 'Server error' });
  }
};