const Community = require('../models/Community');
const User = require('../models/User');

// Get all communities
exports.getAllCommunities = async (req, res) => {
  try {
    const communities = await Community.find()
      .populate('createdBy', 'name username')
      .populate('admins', 'name username')
      .select('-members');
    
    res.status(200).json(communities);
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get community by ID
exports.getCommunityById = async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId)
      .populate('createdBy', 'name username')
      .populate('admins', 'name username')
      .populate('members', 'name username');
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    res.status(200).json(community);
  } catch (error) {
    console.error('Error fetching community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new community
exports.createCommunity = async (req, res) => {
  try {
    const { name, description, isPublic, tags } = req.body;
    
    // Validate required fields
    if (!name || !description) {
      return res.status(400).json({ message: 'Name and description are required' });
    }
    
    // Create new community
    const newCommunity = new Community({
      name,
      description,
      createdBy: req.user.id,
      admins: [req.user.id],
      members: [req.user.id],
      isPublic: isPublic !== undefined ? isPublic : true,
      tags: tags || []
    });
    
    const community = await newCommunity.save();
    
    // Add community to user's communities
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { communities: community._id } }
    );
    
    res.status(201).json(community);
  } catch (error) {
    console.error('Error creating community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update community
exports.updateCommunity = async (req, res) => {
  try {
    const { name, description, isPublic, tags } = req.body;
    const communityId = req.params.communityId;
    
    // Find community
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if user is admin or creator
    if (community.createdBy.toString() !== req.user.id && 
        !community.admins.includes(req.user.id) && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this community' });
    }
    
    // Update fields
    if (name) community.name = name;
    if (description) community.description = description;
    if (isPublic !== undefined) community.isPublic = isPublic;
    if (tags) community.tags = tags;
    
    const updatedCommunity = await community.save();
    
    res.status(200).json(updatedCommunity);
  } catch (error) {
    console.error('Error updating community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete community
exports.deleteCommunity = async (req, res) => {
  try {
    const communityId = req.params.communityId;
    
    // Find community
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if user is creator or admin
    if (community.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this community' });
    }
    
    // Remove community from all users
    await User.updateMany(
      { communities: communityId },
      { $pull: { communities: communityId } }
    );
    
    // Delete community
    await Community.findByIdAndDelete(communityId);
    
    res.status(200).json({ message: 'Community deleted successfully' });
  } catch (error) {
    console.error('Error deleting community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Join community
exports.joinCommunity = async (req, res) => {
  try {
    const communityId = req.params.communityId;
    const userId = req.user.id;
    
    // Find community
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if community is public or user is already a member
    if (!community.isPublic && !community.members.includes(userId)) {
      return res.status(403).json({ message: 'This is a private community' });
    }
    
    // Check if user is already a member
    if (community.members.includes(userId)) {
      return res.status(400).json({ message: 'Already a member of this community' });
    }
    
    // Add user to community members
    community.members.push(userId);
    await community.save();
    
    // Add community to user's communities
    await User.findByIdAndUpdate(
      userId,
      { $push: { communities: communityId } }
    );
    
    res.status(200).json({ message: 'Successfully joined community' });
  } catch (error) {
    console.error('Error joining community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Leave community
exports.leaveCommunity = async (req, res) => {
  try {
    const communityId = req.params.communityId;
    const userId = req.user.id;
    
    // Find community
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if user is a member
    if (!community.members.includes(userId)) {
      return res.status(400).json({ message: 'Not a member of this community' });
    }
    
    // Check if user is the creator
    if (community.createdBy.toString() === userId) {
      return res.status(400).json({ message: 'Creator cannot leave the community. Transfer ownership or delete the community instead.' });
    }
    
    // Remove user from community members and admins
    community.members = community.members.filter(member => member.toString() !== userId);
    community.admins = community.admins.filter(admin => admin.toString() !== userId);
    await community.save();
    
    // Remove community from user's communities
    await User.findByIdAndUpdate(
      userId,
      { $pull: { communities: communityId } }
    );
    
    res.status(200).json({ message: 'Successfully left community' });
  } catch (error) {
    console.error('Error leaving community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add admin to community
exports.addAdmin = async (req, res) => {
  try {
    const { userId } = req.body;
    const communityId = req.params.communityId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Find community
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if requester is creator or admin
    if (community.createdBy.toString() !== req.user.id && 
        !community.admins.includes(req.user.id) && 
        req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to add admins' });
    }
    
    // Check if user is a member
    if (!community.members.includes(userId)) {
      return res.status(400).json({ message: 'User must be a member to become an admin' });
    }
    
    // Check if user is already an admin
    if (community.admins.includes(userId)) {
      return res.status(400).json({ message: 'User is already an admin' });
    }
    
    // Add user to admins
    community.admins.push(userId);
    await community.save();
    
    res.status(200).json({ message: 'Admin added successfully' });
  } catch (error) {
    console.error('Error adding admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Remove admin from community
exports.removeAdmin = async (req, res) => {
  try {
    const { userId } = req.body;
    const communityId = req.params.communityId;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Find community
    const community = await Community.findById(communityId);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if requester is creator or admin
    if (community.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only the creator or platform admin can remove admins' });
    }
    
    // Check if user is the creator
    if (community.createdBy.toString() === userId) {
      return res.status(400).json({ message: 'Cannot remove creator from admins' });
    }
    
    // Check if user is an admin
    if (!community.admins.includes(userId)) {
      return res.status(400).json({ message: 'User is not an admin' });
    }
    
    // Remove user from admins
    community.admins = community.admins.filter(admin => admin.toString() !== userId);
    await community.save();
    
    res.status(200).json({ message: 'Admin removed successfully' });
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get communities for current user
exports.getMyCommunities = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).populate({
      path: 'communities',
      select: 'name description tags isPublic createdAt',
      populate: {
        path: 'createdBy',
        select: 'name username'
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user.communities);
  } catch (error) {
    console.error('Error fetching user communities:', error);
    res.status(500).json({ message: 'Server error' });
  }
};