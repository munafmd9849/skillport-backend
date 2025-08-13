// Admin Users Management JavaScript

// Base URL for API calls
const API_BASE_URL = '/api';

// DOM Elements
let userStatsElements = {};
let userTableBody;
let searchInput;
let statusFilter;
let contestFilter;
let sortBySelect;
let currentUsers = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Users: DOM Content Loaded - Starting initialization...');
    
    // Initialize elements
    console.log('Admin Users: Step 1 - Initializing elements...');
    initializeElements();
    
    // Check authentication
    console.log('Admin Users: Step 2 - Checking authentication...');
    checkAuthentication();
    
    // Load users data
    console.log('Admin Users: Step 3 - Loading users data...');
    loadUsersData();
    
    // Set up event listeners
    console.log('Admin Users: Step 4 - Setting up event listeners...');
    setupEventListeners();
    
    console.log('Admin Users: Initialization complete!');
});

// Initialize DOM elements
function initializeElements() {
    console.log('Admin Users: Initializing DOM elements...');
    
    // Stats cards - match the HTML structure
    const statsCards = document.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-4 .text-2xl.font-bold');
    userStatsElements = {
        totalUsers: statsCards[0],
        activeUsers: statsCards[1],
        inactiveUsers: statsCards[2],
        newUsers: statsCards[3]
    };
    
    console.log('Admin Users: Stats elements found:', {
        totalUsers: !!userStatsElements.totalUsers,
        activeUsers: !!userStatsElements.activeUsers,
        inactiveUsers: !!userStatsElements.inactiveUsers,
        newUsers: !!userStatsElements.newUsers
    });
    
    // Table and filters
    userTableBody = document.querySelector('table tbody');
    searchInput = document.querySelector('input[placeholder="Search users..."]');
    statusFilter = document.querySelector('select:nth-of-type(2)');
    contestFilter = document.querySelector('select:nth-of-type(1)');
    sortBySelect = document.querySelector('select:nth-of-type(3)');
    
    console.log('Admin Users: Table elements found:', {
        tableBody: !!userTableBody,
        searchInput: !!searchInput,
        statusFilter: !!statusFilter,
        contestFilter: !!contestFilter,
        sortBySelect: !!sortBySelect
    });
    
    // Form elements
    addUserForm = document.getElementById('addUserForm');
    console.log('Admin Users: Add user form found:', !!addUserForm);
}

// Check if user is authenticated and has admin role
function checkAuthentication() {
    console.log('Admin Users: Checking authentication...');
    
    // Check if user is authenticated and has admin role
    if (typeof isLoggedIn === 'function' && typeof getCurrentUser === 'function') {
        console.log('Admin Users: Auth functions are available');
        
        const loggedIn = isLoggedIn();
        console.log('Admin Users: isLoggedIn() result:', loggedIn);
        
        if (!loggedIn) {
            console.error('User not logged in');
            window.location.href = '/index.html';
            return;
        }
        
        const currentUser = getCurrentUser();
        console.log('Admin Users: Current user from getCurrentUser():', currentUser);
        
        if (!currentUser || currentUser.role !== 'admin') {
            console.error('User not authorized as admin');
            window.location.href = '/index.html';
            return;
        }
        
        console.log('Admin Users: Authentication successful - user is admin');
    } else {
        console.log('Admin Users: Auth functions not available, skipping authentication check');
    }
}

// Set up event listeners
function setupEventListeners() {
    // Search input
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            console.log('Search input changed:', searchInput.value);
            filterUsers();
        });
    } else {
        console.error('Admin Users: Search input element not found');
    }
    
    // Status filter
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            console.log('Status filter changed:', statusFilter.value);
            filterUsers();
        });
    } else {
        console.error('Admin Users: Status filter element not found');
    }
    
    // Contest filter
    if (contestFilter) {
        contestFilter.addEventListener('change', function() {
            console.log('Contest filter changed:', contestFilter.value);
            filterUsers();
        });
    } else {
        console.error('Admin Users: Contest filter element not found');
    }
    
    // Sort by select
    if (sortBySelect) {
        sortBySelect.addEventListener('change', function() {
            console.log('Sort by changed:', this.value);
            sortUsers(this.value);
        });
    } else {
        console.error('Admin Users: Sort by select element not found');
    }
    
    // Add user form
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Extract form data
            const formData = new FormData(addUserForm);
            const firstName = formData.get('firstName');
            const lastName = formData.get('lastName');
            const email = formData.get('email');
            const username = formData.get('username');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            const role = formData.get('role') || 'student';
            const batchId = formData.get('contest');
            
            // Validate form
            if (!firstName || !lastName || !email || !username || !password) {
                alert('Please fill in all required fields');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Passwords do not match');
                return;
            }
            
            // Create user object
             const userData = {
                 name: `${firstName} ${lastName}`,
                 email,
                 username,
                 password,
                 role // Use the selected role from the form
             };
            
            // Call createUser function with userData and batchId
            createUser(userData, batchId);
        });
    }
    
    console.log('Admin Users: Event listeners setup complete');
}

// Load users data from API
async function loadUsersData() {
    try {
        // Check if user is authenticated and has admin role
        if (typeof isLoggedIn === 'function' && typeof getCurrentUser === 'function') {
            if (!isLoggedIn()) {
                console.error('User not logged in');
                window.location.href = '/index.html';
                return;
            }
            
            const currentUser = getCurrentUser();
            if (!currentUser || currentUser.role !== 'admin') {
                console.error('User not authorized as admin');
                window.location.href = '/index.html';
                return;
            }
        }
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            loadMockData();
            return;
        }
        
        // Show loading state
        document.body.classList.add('cursor-wait');
        if (userTableBody) {
            userTableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center">Loading users data...</td></tr>';
        }
        
        // Fetch users data
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Remove loading state
        document.body.classList.remove('cursor-wait');
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.error('Authentication error:', response.status);
                window.location.href = '/index.html';
                return;
            }
            
            const errorText = await response.text();
            console.error('API error response:', errorText);
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const users = data.users || data; // Handle both formats: {users: [...]} or directly [...]        
        currentUsers = users;
        
        if (!Array.isArray(users)) {
            console.error('Invalid users data format:', users);
            throw new Error('Invalid users data format');
        }
        
        console.log(`Loaded ${users.length} users from API`);
        
        // Update UI with users data
        updateUserStats(users);
        renderUsersTable(users);
        
        // Populate contest filter with unique batch names
        populateContestFilter(users);
        
    } catch (error) {
        console.error('Error loading users data:', error);
        // Show error message in the table
        if (userTableBody) {
            userTableBody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-red-600">Error loading users: ${error.message}</td></tr>`;
        }
        // Fall back to mock data for development
        loadMockData();
    }
}

// Load mock data for development
function loadMockData() {
    console.log('Admin Users: Loading mock data for development');
    
    // Generate current date and dates for the last week
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);
    
    // Create dates within the last week for "new" users
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(now.getDate() - 3);
    
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(now.getDate() - 5);
    
    const mockUsers = [
        {
            _id: 'user1',
            name: 'Rahul Kumar',
            username: 'rahulkumar',
            email: 'rahul.kumar@email.com',
            role: 'student',
            status: 'active',
            assignedBatches: [{ _id: 'batch1', name: 'DSA Contest #1' }],
            createdAt: '2024-12-15T00:00:00.000Z'
        },
        {
            _id: 'user2',
            name: 'Priya Sharma',
            username: 'priyasharma',
            email: 'priya.sharma@email.com',
            role: 'student',
            status: 'active',
            assignedBatches: [{ _id: 'batch2', name: 'Python Contest #1' }],
            createdAt: '2024-12-10T00:00:00.000Z'
        },
        {
            _id: 'user3',
            name: 'Amit Patel',
            username: 'amitpatel',
            email: 'amit.patel@email.com',
            role: 'student',
            status: 'inactive',
            assignedBatches: [],
            createdAt: '2024-12-08T00:00:00.000Z'
        },
        {
            _id: 'user4',
            name: 'Neha Gupta',
            username: 'nehagupta',
            email: 'neha.gupta@email.com',
            role: 'mentor',
            status: 'active',
            assignedBatches: [{ _id: 'batch1', name: 'DSA Contest #1' }, { _id: 'batch2', name: 'Python Contest #1' }],
            createdAt: '2024-11-20T00:00:00.000Z'
        },
        {
            _id: 'user5',
            name: 'Vikram Singh',
            username: 'vikramsingh',
            email: 'vikram.singh@email.com',
            role: 'admin',
            status: 'active',
            assignedBatches: [],
            createdAt: '2024-11-01T00:00:00.000Z'
        },
        {
            _id: 'user6',
            name: 'Ananya Reddy',
            username: 'ananyareddy',
            email: 'ananya.reddy@email.com',
            role: 'student',
            status: 'active',
            batchId: 'batch3',
            batchName: 'React Fundamentals',
            createdAt: threeDaysAgo.toISOString()
        },
        {
            _id: 'user7',
            name: 'Rohan Joshi',
            username: 'rohanjoshi',
            email: 'rohan.joshi@email.com',
            role: 'student',
            status: 'active',
            batch: { _id: 'batch4', name: 'Node.js Basics' },
            createdAt: fiveDaysAgo.toISOString()
        }
    ];
    
    console.log('Admin Users: Mock users data:', mockUsers);
    
    currentUsers = mockUsers;
    updateUserStats(mockUsers);
    renderUsersTable(mockUsers);
    populateContestFilter(mockUsers);
    
    console.log('Admin Users: Mock data loaded and displayed successfully');
}

// Update user statistics
function updateUserStats(users) {
    console.log('Admin Users: Updating user stats with', users.length, 'users');
    
    if (!userStatsElements.totalUsers) {
        console.error('Admin Users: Stats elements not found, cannot update stats');
        return;
    }
    
    const totalUsers = users.length;
    // Check for status field, default to active if not specified
    const activeUsers = users.filter(user => !user.status || user.status === 'active').length;
    const inactiveUsers = users.filter(user => user.status === 'inactive').length;
    const newUsers = users.filter(user => {
        if (!user.createdAt) return false;
        const createdDate = new Date(user.createdAt);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return !isNaN(createdDate) && createdDate >= oneWeekAgo;
    }).length;
    
    console.log('Admin Users: Calculated stats:', {
        totalUsers,
        activeUsers,
        inactiveUsers,
        newUsers
    });
    
    userStatsElements.totalUsers.textContent = totalUsers;
    userStatsElements.activeUsers.textContent = activeUsers;
    userStatsElements.inactiveUsers.textContent = inactiveUsers; // Show inactive users count correctly
    userStatsElements.newUsers.textContent = newUsers;
    
    console.log('Admin Users: Stats updated successfully');
}

// Render users table
function renderUsersTable(users) {
    console.log('Admin Users: Rendering users table with', users?.length || 0, 'users');
    
    if (!userTableBody) {
        console.error('Admin Users: Table body element not found, cannot render table');
        return;
    }
    
    console.log('Admin Users: Clearing existing table content');
    userTableBody.innerHTML = '';
    
    // Check if users array is empty or undefined
    if (!users || users.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="7" class="px-6 py-4 text-center">No users found</td></tr>';
        return;
    }
    
    // Define gradients array here so it's available for all users
    const gradients = [
        'from-amber-400 to-orange-500',
        'from-blue-400 to-indigo-500',
        'from-green-400 to-emerald-500',
        'from-purple-400 to-pink-500'
    ];
    
    users.forEach((user, index) => {
        console.log(`Admin Users: Rendering user ${index + 1}:`, user);
        
        const row = document.createElement('tr');
        row.className = 'hover:bg-slate-50';
        
        // Generate initials and random gradient for avatar
        const initials = user.name ? user.name.charAt(0) : 'U';
        const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
        
        // Format date - handle invalid dates gracefully
        let formattedDate = 'N/A';
        if (user.createdAt) {
            const createdDate = new Date(user.createdAt);
            if (!isNaN(createdDate.getTime())) {
                formattedDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            }
        }
        
        // Determine batch/contest info
        let batchInfo = '<span class="text-sm text-slate-500">No Contest</span>';
        if (user.assignedBatches && user.assignedBatches.length > 0) {
            const batch = user.assignedBatches[0];
            const batchInitial = batch.name ? batch.name.charAt(0) : 'B';
            batchInfo = `
                <div class="flex items-center">
                    <div class="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-2">
                        ${batchInitial}
                    </div>
                    <span class="text-sm text-slate-900">${batch.name}</span>
                </div>
            `;
        }
        
        // Determine status badge - check for inactive status
        let statusBadge = '<span class="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">Active</span>';
        if (user.status === 'inactive') {
            statusBadge = '<span class="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">Inactive</span>';
        }
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gradient-to-br ${randomGradient} rounded-full flex items-center justify-center text-white font-semibold mr-3">
                        ${initials}
                    </div>
                    <div>
                        <div class="text-sm font-medium text-slate-900">${user.name || 'Unknown User'}</div>
                        <div class="text-sm text-slate-500">@${user.username || 'username'}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900">${user.email || 'email@example.com'}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${batchInfo}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${statusBadge}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-semibold text-slate-900">${user.role || 'student'}</div>
                <div class="text-xs text-slate-500">Role</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-slate-900">${formattedDate}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div class="flex gap-2">
                    <button onclick="editUser('${user._id || ''}')" class="text-blue-600 hover:text-blue-900">Edit</button>
                    <button onclick="viewUserProfile('${user._id || ''}')" class="text-green-600 hover:text-green-900">View</button>
                    <button onclick="deleteUser('${user._id || ''}')" class="text-red-600 hover:text-red-900">Delete</button>
                </div>
            </td>
        `;
        
        userTableBody.appendChild(row);
    });
}

// Populate contest filter dropdown with unique batch names
function populateContestFilter(users) {
    if (!contestFilter) {
        console.error('Contest filter element not found');
        return;
    }
    
    // Get edit and add user form contest dropdowns
    const editContestSelect = document.querySelector('#editUserForm [name="contest"]');
    const addContestSelect = document.querySelector('#addUserForm [name="contest"]');
    
    // Clear existing options except the first one (All Contests)
    while (contestFilter.options.length > 1) {
        contestFilter.remove(1);
    }
    
    // Add 'Unassigned' option
    const unassignedOption = document.createElement('option');
    unassignedOption.value = 'Unassigned';
    unassignedOption.textContent = 'Unassigned';
    contestFilter.appendChild(unassignedOption);
    
    // Get unique batch names and IDs
    const batches = [];
    const batchIds = new Set();
    
    users.forEach(user => {
        // Handle assignedBatches array structure
        if (user.assignedBatches && user.assignedBatches.length > 0) {
            user.assignedBatches.forEach(batch => {
                if (batch.name && batch._id && !batchIds.has(batch._id)) {
                    batches.push({
                        id: batch._id,
                        name: batch.name
                    });
                    batchIds.add(batch._id);
                }
            });
        }
        // Handle single batch object structure
        else if (user.batch && user.batch._id && !batchIds.has(user.batch._id)) {
            batches.push({
                id: user.batch._id,
                name: user.batch.name || `Batch ${user.batch._id}`
            });
            batchIds.add(user.batch._id);
        }
        // Handle batchId property structure
        else if (user.batchId && !batchIds.has(user.batchId)) {
            batches.push({
                id: user.batchId,
                name: user.batchName || `Batch ${user.batchId}`
            });
            batchIds.add(user.batchId);
        }
    });
    
    console.log('Found batches:', batches);
    
    // Sort batches by name
    batches.sort((a, b) => a.name.localeCompare(b.name));
    
    // Add batch names as options to main filter
    batches.forEach(batch => {
        const option = document.createElement('option');
        option.value = batch.name;
        option.textContent = batch.name;
        contestFilter.appendChild(option);
    });
    
    // Update edit user form contest dropdown
    if (editContestSelect) {
        // Clear existing options except the first one
        while (editContestSelect.options.length > 1) {
            editContestSelect.remove(1);
        }
        
        // Add batch options
        batches.forEach(batch => {
            const option = document.createElement('option');
            option.value = batch.id;
            option.textContent = batch.name;
            editContestSelect.appendChild(option);
        });
    }
    
    // Update add user form contest dropdown
    if (addContestSelect) {
        // Clear existing options except the first one
        while (addContestSelect.options.length > 1) {
            addContestSelect.remove(1);
        }
        
        // Add batch options
        batches.forEach(batch => {
            const option = document.createElement('option');
            option.value = batch.id;
            option.textContent = batch.name;
            addContestSelect.appendChild(option);
        });
    }
}

// Filter users based on search input and filters
function filterUsers() {
    if (!currentUsers || !currentUsers.length) return;
    
    let filteredUsers = [...currentUsers];
    
    console.log('Applying filters with', filteredUsers.length, 'users');
    
    // Apply search filter
    if (searchInput && searchInput.value) {
        const searchTerm = searchInput.value.toLowerCase();
        filteredUsers = filteredUsers.filter(user => {
            // Handle potential undefined values and different name formats
            const userName = (user.name || '').toLowerCase();
            const firstName = userName.split(' ')[0] || '';
            const lastName = userName.split(' ').slice(1).join(' ') || '';
            const email = (user.email || '').toLowerCase();
            const username = (user.username || '').toLowerCase();
            
            return firstName.includes(searchTerm) ||
                lastName.includes(searchTerm) ||
                userName.includes(searchTerm) ||
                email.includes(searchTerm) ||
                username.includes(searchTerm);
        });
        console.log('After search filter:', filteredUsers.length, 'users');
    }
    
    // Apply status filter
    if (statusFilter && statusFilter.value !== 'All Status') {
        const status = statusFilter.value.toLowerCase();
        filteredUsers = filteredUsers.filter(user => {
            // Default to active if status is not specified
            const userStatus = user.status || 'active';
            return userStatus.toLowerCase() === status;
        });
        console.log('After status filter:', filteredUsers.length, 'users');
    }
    
    // Apply contest filter
    if (contestFilter && contestFilter.value !== 'All Contests') {
        if (contestFilter.value === 'Unassigned') {
            filteredUsers = filteredUsers.filter(user => {
                // Check all possible batch reference formats
                return (!user.assignedBatches || user.assignedBatches.length === 0) && 
                       (!user.batch || !user.batch._id) && 
                       (!user.batchId);
            });
        } else {
            const contestName = contestFilter.value;
            filteredUsers = filteredUsers.filter(user => {
                // Check all possible batch reference formats
                return (user.assignedBatches && 
                        user.assignedBatches.some(batch => batch.name === contestName)) ||
                       (user.batch && user.batch.name === contestName) ||
                       (user.batchName === contestName);
            });
        }
        console.log('After contest filter:', filteredUsers.length, 'users');
    }
    
    // Apply current sort
    if (sortBySelect) {
        sortUsers(sortBySelect.value, filteredUsers);
    } else {
        renderUsersTable(filteredUsers);
    }
}

// Sort users based on selected criteria
function sortUsers(criteria, users = null) {
    const usersToSort = users || [...currentUsers];
    
    switch(criteria) {
        case 'Name':
            usersToSort.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'Join Date':
            usersToSort.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            break;
        case 'Performance':
            usersToSort.sort((a, b) => (b.performance || 0) - (a.performance || 0));
            break;
        case 'Contest':
            usersToSort.sort((a, b) => {
                const aContest = a.assignedBatches && a.assignedBatches.length > 0 ? a.assignedBatches[0].name : '';
                const bContest = b.assignedBatches && b.assignedBatches.length > 0 ? b.assignedBatches[0].name : '';
                return aContest.localeCompare(bContest);
            });
            break;
    }
    
    renderUsersTable(usersToSort);
}

// Show toast notification
function showToast(message, type = 'success') {
    // Check if toast-js is available
    if (typeof toast === 'function') {
        toast[type](message);
    } else {
        // Fallback to alert
        alert(message);
    }
    console.log(`Toast (${type}):`, message);
}

// Handle API errors consistently
async function handleApiError(response, defaultErrorMessage = 'An error occurred') {
    if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401) {
            console.error('Authentication error: User not authenticated');
            showToast('Session expired. Please log in again.', 'error');
            localStorage.removeItem('token');
            window.location.href = '/index.html';
            return null;
        }
        
        if (response.status === 403) {
            console.error('Authorization error: User not authorized');
            showToast('You do not have permission to perform this action.', 'error');
            return null;
        }
        
        // Try to get error message from response
        let errorMessage = defaultErrorMessage;
        try {
            const errorData = await response.json();
            // Prefer specific error details if provided by the backend
            if (errorData.error) {
                errorMessage = errorData.error;
            } else if (errorData.message && errorData.message !== defaultErrorMessage) {
                errorMessage = errorData.message;
            }
        } catch (e) {
            try {
                errorMessage = await response.text() || defaultErrorMessage;
            } catch (textError) {
                console.error('Could not parse error response:', textError);
            }
        }
        
        console.error(`API Error (${response.status}):`, errorMessage);
        showToast(errorMessage, 'error');
        return null;
    }
    
    return response;
}

// Assign user to a batch/contest
async function assignUserToBatch(userId, batchId) {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            showToast('Authentication error. Please log in again.', 'error');
            return null;
        }
        
        console.log(`Assigning user ${userId} to batch ${batchId}`);
        
        // Assign user to batch
        const response = await fetch(`${API_BASE_URL}/batches/${batchId}/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
        });
        
        // Handle API errors
        const processedResponse = await handleApiError(response, 'Error assigning user to batch');
        if (!processedResponse) return null;
        
        const result = await processedResponse.json();
        console.log('User assigned to batch successfully:', result);
        return result;
        
    } catch (error) {
        console.error('Error assigning user to batch:', error);
        showToast(`Error assigning user to batch: ${error.message}`, 'error');
        return null;
    }
}

// Create a new user
async function createUser(userData, batchId) {
    try {
        // If userData is not provided, get it from the form
        if (!userData) {
            const form = document.getElementById('addUserForm');
            const formData = new FormData(form);
            
            // Extract form values
            const firstName = formData.get('firstName');
            const lastName = formData.get('lastName');
            const email = formData.get('email');
            const username = formData.get('username');
            const password = formData.get('password');
            const confirmPassword = formData.get('confirmPassword');
            const role = formData.get('role') || 'student';
            batchId = formData.get('contest');
            
            // Validate form
            if (!firstName || !lastName || !email || !username || !password) {
                showToast('Please fill in all required fields', 'error');
                return;
            }
            
            if (password !== confirmPassword) {
                showToast('Passwords do not match', 'error');
                return;
            }
            
            // Prepare user data
            userData = {
                name: `${firstName} ${lastName}`,
                email,
                username,
                password,
                role
            };
        }
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            showToast('Authentication error. Please log in again.', 'error');
            return;
        }
        
        // Show loading state
        showToast('Creating user...', 'info');
        
        // Send API request to create user
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        // Handle API errors
        const processedResponse = await handleApiError(response, 'Error creating user');
        if (!processedResponse) return;
        
        const newUser = await processedResponse.json();
        
        // If batch/contest is selected, assign user to batch
        if (batchId && batchId !== 'none') {
            // Use the assignUserToBatch function instead of direct API call
            const assignResult = await assignUserToBatch(newUser._id, batchId);
            if (!assignResult) {
                console.warn('User created but not assigned to batch');
                showToast('User created but could not be assigned to contest', 'warning');
            }
        }
        
        showToast('User created successfully!', 'success');
        closeAddUserModal();
        
        // Reload users data
        loadUsersData();
        
    } catch (error) {
        console.error('Error creating user:', error);
        showToast(`Error creating user: ${error.message}`, 'error');
    }
}

// Edit user - Open edit modal and populate with user data
async function editUser(userId) {
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            alert('Authentication error. Please log in again.');
            return;
        }
        
        // Find user in currentUsers array
        const user = currentUsers.find(u => u._id === userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        // Populate edit form with user data
        const editForm = document.getElementById('editUserForm');
        if (editForm) {
            // Split name into first and last name
            const nameParts = user.name ? user.name.split(' ') : ['', ''];
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Set form values
            editForm.querySelector('[name="userId"]').value = user._id;
            editForm.querySelector('[name="firstName"]').value = firstName;
            editForm.querySelector('[name="lastName"]').value = lastName;
            editForm.querySelector('[name="email"]').value = user.email || '';
            editForm.querySelector('[name="username"]').value = user.username || '';
            
            // Set role dropdown
            const roleSelect = editForm.querySelector('[name="role"]');
            if (roleSelect) {
                for (let i = 0; i < roleSelect.options.length; i++) {
                    if (roleSelect.options[i].value === user.role) {
                        roleSelect.selectedIndex = i;
                        break;
                    }
                }
            }
            
            // Set batch/contest dropdown if available
            const contestSelect = editForm.querySelector('[name="contest"]');
            if (contestSelect && user.assignedBatches && user.assignedBatches.length > 0) {
                const batchId = user.assignedBatches[0]._id;
                for (let i = 0; i < contestSelect.options.length; i++) {
                    if (contestSelect.options[i].value === batchId) {
                        contestSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }
        
        // Show edit modal
        document.getElementById('editUserModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error editing user:', error);
        alert(`Error editing user: ${error.message}`);
    }
}

// Update user - Save changes from edit form
async function updateUser(event) {
    event.preventDefault();
    
    try {
        const editForm = document.getElementById('editUserForm');
        const formData = new FormData(editForm);
        
        // Extract form values
        const userId = formData.get('userId');
        const firstName = formData.get('firstName');
        const lastName = formData.get('lastName');
        const email = formData.get('email');
        const username = formData.get('username');
        const password = formData.get('password');
        const role = formData.get('role');
        const batchId = formData.get('contest');
        
        // Validate form
        if (!firstName || !lastName || !email || !username) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            showToast('Authentication error. Please log in again.', 'error');
            return;
        }
        
        // Find user in currentUsers array to check current batch assignment
        const user = currentUsers.find(u => u._id === userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        // Get current batch assignment
        const currentBatchId = user.assignedBatches && user.assignedBatches.length > 0 ? 
            user.assignedBatches[0]._id : null;
        
        // Prepare user data
        const userData = {
            name: `${firstName} ${lastName}`,
            email,
            username,
            role
        };
        
        // Add password only if provided
        if (password) {
            userData.password = password;
        }
        
        // Show loading state
        showToast('Updating user...', 'info');
        
        // Send API request to update user
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        // Handle API errors
        const processedResponse = await handleApiError(response, 'Error updating user');
        if (!processedResponse) return;
        
        // Handle batch assignment if changed
        if (batchId !== currentBatchId) {
            // If user was previously assigned to a batch, remove them
            if (currentBatchId) {
                try {
                    const removeResponse = await fetch(`${API_BASE_URL}/batches/${currentBatchId}/users/${userId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (!removeResponse.ok) {
                        console.warn(`Failed to remove user from previous batch: ${currentBatchId}`);
                    }
                } catch (error) {
                    console.warn('Error removing user from previous batch:', error);
                }
            }
            
            // If a new batch is selected, assign user to it
            if (batchId) {
                try {
                    const assignResponse = await fetch(`${API_BASE_URL}/batches/${batchId}/users`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId })
                    });
                    
                    if (!assignResponse.ok) {
                        console.warn(`Failed to assign user to new batch: ${batchId}`);
                    }
                } catch (error) {
                    console.warn('Error assigning user to new batch:', error);
                }
            }
        }
        
        alert('User updated successfully!');
        closeEditUserModal();
        
        // Reload users data
        loadUsersData();
        
    } catch (error) {
        console.error('Error updating user:', error);
        alert(`Error updating user: ${error.message}`);
    }
}

// View user profile
function viewUserProfile(userId) {
    // This would navigate to the user's profile page
    window.open(`student-analytics.html?student=${userId}`, '_blank');
}

// Delete user - Show confirmation modal
async function deleteUser(userId) {
    try {
        // Find user in currentUsers array
        const user = currentUsers.find(u => u._id === userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        // Update the delete confirmation modal
        const userName = user.name || userId;
        document.getElementById('deleteUserName').textContent = userName;
        
        // Store the user ID to delete
        window.userToDelete = userId;
        
        // Show the delete confirmation modal
        document.getElementById('deleteUserModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
    } catch (error) {
        console.error('Error preparing to delete user:', error);
        showToast(`Error: ${error.message}`, 'error');
    }
}

// Confirm delete user - Actually delete the user
async function confirmDeleteUser() {
    try {
        const userId = window.userToDelete;
        if (!userId) {
            throw new Error('No user selected for deletion');
        }
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            showToast('Authentication error. Please log in again.', 'error');
            return;
        }
        
        // Show loading state
        showToast('Deleting user...', 'info');
        
        // Send API request to delete user
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Handle API errors
        const processedResponse = await handleApiError(response, 'Error deleting user');
        if (!processedResponse) {
            closeDeleteUserModal();
            return;
        }
        
        showToast('User deleted successfully!', 'success');
        closeDeleteUserModal();
        
        // Reload users data
        loadUsersData();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast(`Error deleting user: ${error.message}`, 'error');
        closeDeleteUserModal();
    }
}

// Modal functions
function openAddUserModal() {
    document.getElementById('addUserModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeAddUserModal() {
    document.getElementById('addUserModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.getElementById('addUserForm').reset();
}

function closeEditUserModal() {
    document.getElementById('editUserModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    document.getElementById('editUserForm').reset();
}

function closeDeleteUserModal() {
    document.getElementById('deleteUserModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
    window.userToDelete = null;
}