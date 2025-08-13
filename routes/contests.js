const express = require('express');
const router = express.Router();
const contestController = require('../controllers/contestController');
const contestSubmissionController = require('../controllers/contestSubmissionController');
const leaderboardController = require('../controllers/leaderboardController');
const { authenticateToken } = require('../middleware/auth');

// Contest routes

// Get all contests
router.get('/', authenticateToken, contestController.getAllContests);

// Get contest by ID
router.get('/:contestId', authenticateToken, contestController.getContestById);

// Create a new contest
router.post('/', authenticateToken, contestController.createContest);

// Update contest
router.put('/:contestId', authenticateToken, contestController.updateContest);

// Delete contest
router.delete('/:contestId', authenticateToken, contestController.deleteContest);

// Join contest
router.post('/:contestId/join', authenticateToken, contestController.joinContest);

// Leave contest
router.post('/:contestId/leave', authenticateToken, contestController.leaveContest);

// Get contests for current user
router.get('/user/me', authenticateToken, contestController.getMyContests);

// Get active contests
router.get('/status/active', authenticateToken, contestController.getActiveContests);

// Get upcoming contests
router.get('/status/upcoming', authenticateToken, contestController.getUpcomingContests);

// Get completed contests
router.get('/status/completed', authenticateToken, contestController.getCompletedContests);

// Contest submission routes

// Submit solution to a contest problem
router.post('/:contestId/submit', authenticateToken, contestSubmissionController.submitSolution);

// Get submission by ID
router.get('/submissions/:submissionId', authenticateToken, contestSubmissionController.getSubmissionById);

// Get all submissions for a contest
router.get('/:contestId/submissions', authenticateToken, contestSubmissionController.getContestSubmissions);

// Get all submissions for a user in a contest
router.get('/:contestId/submissions/me', authenticateToken, contestSubmissionController.getUserContestSubmissions);

// Get all submissions for a problem in a contest
router.get('/:contestId/problems/:problemId/submissions', authenticateToken, contestSubmissionController.getProblemSubmissions);

// Leaderboard routes

// Get contest leaderboard
router.get('/:contestId/leaderboard', authenticateToken, leaderboardController.getContestLeaderboard);

// Recalculate contest leaderboard
router.post('/:contestId/leaderboard/recalculate', authenticateToken, leaderboardController.recalculateContestLeaderboard);

module.exports = router;