const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const { authenticateToken } = require('../middleware/auth');

// Get all communities
router.get('/', authenticateToken, communityController.getAllCommunities);

// Get communities for current user (must come before /:communityId)
router.get('/user/me', authenticateToken, communityController.getMyCommunities);

// Get community by ID
router.get('/:communityId', authenticateToken, communityController.getCommunityById);

// Create a new community
router.post('/', authenticateToken, communityController.createCommunity);

// Update community
router.put('/:communityId', authenticateToken, communityController.updateCommunity);

// Delete community
router.delete('/:communityId', authenticateToken, communityController.deleteCommunity);

// Join community
router.post('/:communityId/join', authenticateToken, communityController.joinCommunity);

// Leave community
router.post('/:communityId/leave', authenticateToken, communityController.leaveCommunity);

// Add admin to community
router.post('/:communityId/admins', authenticateToken, communityController.addAdmin);

// Remove admin from community
router.delete('/:communityId/admins', authenticateToken, communityController.removeAdmin);

module.exports = router;