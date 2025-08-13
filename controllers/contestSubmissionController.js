const ContestSubmission = require('../models/ContestSubmission');
const Contest = require('../models/Contest');
const User = require('../models/User');
const Leaderboard = require('../models/Leaderboard');

// Submit solution to a contest problem
exports.submitSolution = async (req, res) => {
  try {
    const { contestId, problemId, code, language } = req.body;
    const userId = req.user.id;
    
    if (!contestId || !problemId || !code || !language) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Find contest
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if contest is active
    const now = new Date();
    if (now < new Date(contest.startDate) || now > new Date(contest.endDate)) {
      return res.status(400).json({ message: 'Contest is not active' });
    }
    
    // Check if user is a participant
    if (!contest.participants.includes(userId)) {
      return res.status(403).json({ message: 'Not participating in this contest' });
    }
    
    // Find problem in contest
    const problem = contest.problems.find(p => p._id.toString() === problemId);
    
    if (!problem) {
      return res.status(404).json({ message: 'Problem not found in this contest' });
    }
    
    // Create submission
    const submission = new ContestSubmission({
      user: userId,
      contest: contestId,
      problem: problemId,
      code,
      language,
      status: 'pending',
      score: 0,
      executionTime: 0,
      memory: 0,
      testCasesPassed: 0,
      totalTestCases: problem.testCases.length
    });
    
    // Save submission
    await submission.save();
    
    // In a real application, we would now send the code to a judge system
    // For this demo, we'll simulate judging with a timeout
    setTimeout(async () => {
      try {
        // Simulate judging
        const testCasesPassed = Math.floor(Math.random() * (problem.testCases.length + 1));
        const executionTime = Math.floor(Math.random() * 1000); // ms
        const memory = Math.floor(Math.random() * 100); // MB
        const status = testCasesPassed === problem.testCases.length ? 'accepted' : 'wrong_answer';
        const score = Math.floor((testCasesPassed / problem.testCases.length) * problem.points);
        
        // Update submission
        submission.status = status;
        submission.score = score;
        submission.executionTime = executionTime;
        submission.memory = memory;
        submission.testCasesPassed = testCasesPassed;
        submission.feedback = status === 'accepted' ? 'All test cases passed!' : 'Some test cases failed.';
        
        await submission.save();
        
        // If accepted, update user stats
        if (status === 'accepted') {
          // Check if user has already solved this problem
          const previousAccepted = await ContestSubmission.findOne({
            user: userId,
            contest: contestId,
            problem: problemId,
            status: 'accepted',
            _id: { $ne: submission._id }
          });
          
          if (!previousAccepted) {
            // Update user stats
            await User.findByIdAndUpdate(userId, {
              $inc: { totalScore: score, problemsSolved: 1 }
            });
            
            // Update leaderboard
            await updateLeaderboard(contestId, userId);
          }
        }
      } catch (error) {
        console.error('Error in judging process:', error);
        submission.status = 'error';
        submission.feedback = 'An error occurred during judging.';
        await submission.save();
      }
    }, 2000); // Simulate 2 second judging time
    
    res.status(201).json({
      message: 'Submission received and is being processed',
      submissionId: submission._id
    });
  } catch (error) {
    console.error('Error submitting solution:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get submission by ID
exports.getSubmissionById = async (req, res) => {
  try {
    const submissionId = req.params.submissionId;
    
    const submission = await ContestSubmission.findById(submissionId)
      .populate('user', 'name username')
      .populate('contest', 'title');
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    
    // Check if user is authorized to view this submission
    if (submission.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      // Check if user is creator of the contest
      const contest = await Contest.findById(submission.contest);
      if (!contest || contest.creator.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to view this submission' });
      }
    }
    
    res.status(200).json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all submissions for a contest
exports.getContestSubmissions = async (req, res) => {
  try {
    const contestId = req.params.contestId;
    
    // Find contest
    const contest = await Contest.findById(contestId);
    
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    
    // Check if user is authorized to view all submissions
    if (contest.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view all submissions' });
    }
    
    const submissions = await ContestSubmission.find({ contest: contestId })
      .populate('user', 'name username')
      .sort({ createdAt: -1 });
    
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching contest submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all submissions for a user in a contest
exports.getUserContestSubmissions = async (req, res) => {
  try {
    const { contestId } = req.params;
    const userId = req.user.id;
    
    const submissions = await ContestSubmission.find({
      contest: contestId,
      user: userId
    }).sort({ createdAt: -1 });
    
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching user contest submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all submissions for a problem in a contest
exports.getProblemSubmissions = async (req, res) => {
  try {
    const { contestId, problemId } = req.params;
    const userId = req.user.id;
    
    const submissions = await ContestSubmission.find({
      contest: contestId,
      problem: problemId,
      user: userId
    }).sort({ createdAt: -1 });
    
    res.status(200).json(submissions);
  } catch (error) {
    console.error('Error fetching problem submissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to update leaderboard
async function updateLeaderboard(contestId, userId) {
  try {
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
    
    // Get contest
    const contest = await Contest.findById(contestId);
    
    // Update leaderboard
    const leaderboard = await Leaderboard.findOne({ contest: contestId, timeFrame: 'all' });
    
    if (!leaderboard) {
      // Create new leaderboard if it doesn't exist
      const newLeaderboard = new Leaderboard({
        contest: contestId,
        community: contest.community,
        timeFrame: 'all',
        rankings: [{
          user: userId,
          score: totalScore,
          problemsSolved,
          submissions: submissions.length,
          accuracy,
          averageTime,
          rank: 1
        }]
      });
      
      await newLeaderboard.save();
    } else {
      // Update existing leaderboard
      const userRankIndex = leaderboard.rankings.findIndex(r => r.user.toString() === userId);
      
      if (userRankIndex >= 0) {
        // Update existing user ranking
        leaderboard.rankings[userRankIndex].score = totalScore;
        leaderboard.rankings[userRankIndex].problemsSolved = problemsSolved;
        leaderboard.rankings[userRankIndex].submissions = submissions.length;
        leaderboard.rankings[userRankIndex].accuracy = accuracy;
        leaderboard.rankings[userRankIndex].averageTime = averageTime;
      } else {
        // Add new user ranking
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
    }
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
}