const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { authenticateToken } = require('../middleware/auth');

// Get global leaderboard
router.get('/global', authenticateToken, leaderboardController.getGlobalLeaderboard);

// Get community leaderboard
router.get('/communities/:communityId', authenticateToken, leaderboardController.getCommunityLeaderboard);

module.exports = router;