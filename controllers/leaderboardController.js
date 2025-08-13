const Leaderboard = require('../models/Leaderboard');
const Contest = require('../models/Contest');
const Community = require('../models/Community');
const User = require('../models/User');
const ContestSubmission = require('../models/ContestSubmission');

// Get contest leaderboard
exports.getContestLeaderboard = async (req, res) => {
  try {
    const contestId = req.params.contestId;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Get leaderboard
    const leaderboard = await Leaderboard.findOne({ contest: contestId, timeFrame: 'all' })
      .populate('rankings.user', 'name username');
    
    if (!leaderboard) {
      return res.status(404).json({ message: 'Leaderboard not found' });
    }
    
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error fetching contest leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get community leaderboard
exports.getCommunityLeaderboard = async (req, res) => {
  try {
    const communityId = req.params.communityId;
    
    // Find community
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Get all contests for this community
    const contests = await Contest.find({ community: communityId });
    const contestIds = contests.map(contest => contest._id);
    
    // Get all leaderboards for these contests
    const leaderboards = await Leaderboard.find({
      contest: { $in: contestIds },
      timeFrame: 'all'
    }).populate('rankings.user', 'name username');
    
    // Combine rankings from all leaderboards
    const userScores = {};
    
    leaderboards.forEach(leaderboard => {
      leaderboard.rankings.forEach(ranking => {
        const userId = ranking.user._id.toString();
        
        if (!userScores[userId]) {
          userScores[userId] = {
            user: ranking.user,
            score: 0,
            problemsSolved: 0,
            submissions: 0,
            contests: 0
          };
        }
        
        userScores[userId].score += ranking.score;
        userScores[userId].problemsSolved += ranking.problemsSolved;
        userScores[userId].submissions += ranking.submissions;
        userScores[userId].contests += 1;
      });
    });
    
    // Convert to array and sort
    const rankings = Object.values(userScores).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.problemsSolved !== a.problemsSolved) return b.problemsSolved - a.problemsSolved;
      return a.submissions - b.submissions;
    });
    
    // Add ranks
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });
    
    res.status(200).json({
      community: {
        _id: community._id,
        name: community.name
      },
      rankings,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching community leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get global leaderboard
exports.getGlobalLeaderboard = async (req, res) => {
  try {
    // Get top users by total score
    const users = await User.find({ role: 'student' })
      .sort({ totalScore: -1, problemsSolved: -1 })
      .limit(100)
      .select('name username totalScore problemsSolved');
    
    // Format rankings
    const rankings = users.map((user, index) => ({
      rank: index + 1,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username
      },
      score: user.totalScore,
      problemsSolved: user.problemsSolved
    }));
    
    res.status(200).json({
      rankings,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error fetching global leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Recalculate contest leaderboard
exports.recalculateContestLeaderboard = async (req, res) => {
  try {
    const contestId = req.params.contestId;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if user is authorized
    if (contest.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to recalculate leaderboard' });
    }
    
    // Get leaderboard
    let leaderboard = await Leaderboard.findOne({ contest: contestId, timeFrame: 'all' });
    
    if (!leaderboard) {
      leaderboard = new Leaderboard({
        contest: contestId,
        community: contest.community,
        timeFrame: 'all',
        rankings: []
      });
    } else {
      leaderboard.rankings = [];
    }
    
    // Get all participants
    const participants = contest.participants;
    
    // For each participant, calculate their score and ranking
    for (const userId of participants) {
      // Get all accepted submissions for this user in this contest
      const submissions = await ContestSubmission.find({
        user: userId,
        contest: contestId,
        status: 'accepted'
      });
      
      // Calculate total score and problems solved
      const uniqueProblems = new Set();
      let totalScore = 0;
      let totalTime = 0;
      
      submissions.forEach(sub => {
        uniqueProblems.add(sub.problem.toString());
        totalScore += sub.score;
        totalTime += sub.executionTime;
      });
      
      const problemsSolved = uniqueProblems.size;
      const averageTime = submissions.length > 0 ? totalTime / submissions.length : 0;
      const accuracy = submissions.length > 0 ? 
        (submissions.filter(s => s.status === 'accepted').length / submissions.length) * 100 : 0;
      
      // Add to rankings
      leaderboard.rankings.push({
        user: userId,
        score: totalScore,
        problemsSolved,
        submissions: submissions.length,
        accuracy,
        averageTime,
        rank: 0 // Will be calculated below
      });
    }
    
    // Sort rankings by score (descending) and update ranks
    leaderboard.rankings.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.problemsSolved !== a.problemsSolved) return b.problemsSolved - a.problemsSolved;
      if (a.averageTime !== b.averageTime) return a.averageTime - b.averageTime;
      return a.submissions - b.submissions;
    });
    
    // Update ranks
    leaderboard.rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });
    
    leaderboard.lastUpdated = new Date();
    await leaderboard.save();
    
    res.status(200).json({ message: 'Leaderboard recalculated successfully' });
  } catch (error) {
    console.error('Error recalculating contest leaderboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
};