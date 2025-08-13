// Admin Dashboard JavaScript

// Base URL for API calls
const API_BASE_URL = '/api';

// DOM Elements
let statsElements = {};
let systemStatusElements = {};
let recentActivityElement;
let recentUsersElement;
let recentMentorsElement;

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Dashboard: Initializing...');
    
    // Initialize elements
    initializeElements();
    
    // Load dashboard data
    loadDashboardData();
    
    // Set up event listeners
    setupEventListeners();
});

// Initialize DOM elements
function initializeElements() {
    console.log('Admin Dashboard: Initializing DOM elements...');
    
    // Stats cards
    statsElements = {
        totalUsers: document.querySelector('.stats-total-users'),
        totalMentors: document.querySelector('.stats-total-mentors'),
        totalContests: document.querySelector('.stats-total-contests'),
        totalProblemsSolved: document.querySelector('.stats-total-problems')
    };
    
    // System status elements
    systemStatusElements = {
        systemStatus: document.querySelector('.system-status'),
        serverLoad: document.querySelector('.server-load'),
        database: document.querySelector('.database-usage'),
        uptime: document.querySelector('.system-uptime')
    };
    
    // Recent activity and users/mentors lists
    recentActivityElement = document.querySelector('.recent-activity-list');
    recentUsersElement = document.querySelector('.recent-users-list');
    recentMentorsElement = document.querySelector('.recent-mentors-list');
    
    // Log what we found
    console.log('Admin Dashboard: Elements found:', {
        stats: Object.keys(statsElements).filter(key => statsElements[key]),
        system: Object.keys(systemStatusElements).filter(key => systemStatusElements[key]),
        recent: {
            activity: !!recentActivityElement,
            users: !!recentUsersElement,
            mentors: !!recentMentorsElement
        }
    });
}

// Set up event listeners
function setupEventListeners() {
    console.log('Admin Dashboard: Setting up event listeners...');
    
    // Quick action buttons
    const quickActions = document.querySelectorAll('.quick-action');
    console.log('Admin Dashboard: Found quick actions:', quickActions.length);
    
    quickActions.forEach(action => {
        action.addEventListener('click', function(e) {
            const actionType = this.dataset.action;
            console.log('Admin Dashboard: Quick action clicked:', actionType);
            handleQuickAction(actionType);
        });
    });
}

// Load dashboard data from API
async function loadDashboardData() {
    console.log('Admin Dashboard: Loading dashboard data...');
    
    try {
        // Check if user is authenticated and has admin role
        if (typeof isLoggedIn === 'function' && typeof getCurrentUser === 'function') {
            if (!isLoggedIn()) {
                console.error('Admin Dashboard: User not logged in');
                window.location.href = '/index.html';
                return;
            }
            
            const currentUser = getCurrentUser();
            
            if (!currentUser || currentUser.role !== 'admin') {
                console.error('Admin Dashboard: User not authorized as admin');
                window.location.href = '/index.html';
                return;
            }
        }
        
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('Admin Dashboard: No authentication token found');
            loadMockData();
            return;
        }
        
        // Update system status elements while loading
        updateSystemStatus('Loading...', 'text-amber-600');
        
        // Fetch dashboard overview data
        const response = await fetch(`${API_BASE_URL}/dashboard/overview`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                console.error('Admin Dashboard: Authentication error:', response.status);
                window.location.href = '/index.html';
                return;
            }
            
            const errorText = await response.text();
            console.error('Admin Dashboard: API error response:', errorText);
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Admin Dashboard: Overview data received:', data);
        
        // Fetch system status data (admin only)
        const systemResponse = await fetch(`${API_BASE_URL}/dashboard/system-status`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (systemResponse.ok) {
            const systemData = await systemResponse.json();
            // Add system data to the dashboard data
            data.system = systemData;
        } else {
            console.error('Admin Dashboard: Error fetching system status:', systemResponse.status);
        }
        
        // Update the dashboard with the fetched data
        updateDashboard(data.overview || data);
        
        // Update system status based on fetched data
        if (data.system && data.system.systemStatus) {
            const status = data.system.systemStatus;
            let colorClass = 'text-green-600';
            
            if (status === 'Degraded') {
                colorClass = 'text-amber-600';
            } else if (status === 'Outage') {
                colorClass = 'text-red-600';
            }
            
            updateSystemStatus(status, colorClass);
        } else {
            updateSystemStatus('Operational', 'text-green-600');
        }
        
        console.log('Admin Dashboard: Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('Admin Dashboard: Error loading dashboard data:', error);
        console.log('Admin Dashboard: Loading mock data due to error');
        // For demo purposes, load mock data if API fails
        loadMockData();
        updateSystemStatus('Degraded', 'text-amber-600');
    }
}

// Update system status display
function updateSystemStatus(status, colorClass) {
    if (systemStatusElements.systemStatus) {
        systemStatusElements.systemStatus.textContent = status;
        
        // Remove existing color classes
        systemStatusElements.systemStatus.classList.remove('text-green-600', 'text-amber-600', 'text-red-600');
        
        // Add new color class
        if (colorClass) {
            systemStatusElements.systemStatus.classList.add(colorClass);
        }
    }
}

// Update dashboard with data
async function updateDashboard(data) {
    console.log('Admin Dashboard: Updating dashboard with data:', data);
    
    // Update stats cards with real data
    if (statsElements.totalUsers) {
        statsElements.totalUsers.textContent = data.totalUsers || '0';
    }
    if (statsElements.totalMentors) {
        statsElements.totalMentors.textContent = data.totalMentors || '0';
    }
    if (statsElements.totalContests) {
        // Use totalBatches from API (which represents contests)
        statsElements.totalContests.textContent = data.totalBatches || '0';
    }
    if (statsElements.totalProblemsSolved) {
        const overallStats = data.overallStats || {};
        // Use solved count from API instead of totalSubmissions
        statsElements.totalProblemsSolved.textContent = overallStats.solved || '0';
    }
    
    // Update system overview if available
    if (data.system) {
        updateSystemOverview(data.system);
    }
    
    // Update recent batches/contests if available
    if (data.recentBatches && recentActivityElement) {
        updateRecentActivity(data.recentBatches);
    } else if (data.recentActivity && recentActivityElement) {
        updateRecentActivity(data.recentActivity);
    }
    
    // Fetch and update recent users directly from API
    try {
        await fetchRecentUsers();
    } catch (error) {
        console.error('Admin Dashboard: Error fetching recent users:', error);
        // If API fails and we have data from the dashboard overview, use that
        if (data.recentUsers) {
            updateRecentUsers(data.recentUsers);
        }
    }
    
    // Fetch and update recent mentors directly from API
    try {
        await fetchRecentMentors();
    } catch (error) {
        console.error('Admin Dashboard: Error fetching recent mentors:', error);
        // If API fails and we have data from the dashboard overview, use that
        if (data.recentMentors) {
            updateRecentMentors(data.recentMentors);
        }
    }
    
    // Log what data was actually used
    console.log('Admin Dashboard: Stats updated - Users:', data.totalUsers, 'Mentors:', data.totalMentors, 'Batches:', data.totalBatches, 'Solved:', data.overallStats?.solved);
}

// Update system overview section
function updateSystemOverview(system) {
    if (!system) return;
    
    // Update system status
    if (systemStatusElements.systemStatus) {
        // Use systemStatus for the API response or status for mock data
        const status = system.systemStatus || system.status || 'Operational';
        systemStatusElements.systemStatus.textContent = status;
        
        // Add color based on status
        systemStatusElements.systemStatus.classList.remove('text-green-600', 'text-amber-600', 'text-red-600');
        
        if (status === 'Operational') {
            systemStatusElements.systemStatus.classList.add('text-green-600');
        } else if (status === 'Degraded') {
            systemStatusElements.systemStatus.classList.add('text-amber-600');
        } else if (status === 'Outage') {
            systemStatusElements.systemStatus.classList.add('text-red-600');
        }
    }
    
    // Update server load
    if (systemStatusElements.serverLoad) {
        systemStatusElements.serverLoad.textContent = system.serverLoad || '42%';
    }
    
    // Update database usage
    if (systemStatusElements.database) {
        systemStatusElements.database.textContent = system.databaseUsage || '38%';
    }
    
    // Update system uptime
    if (systemStatusElements.uptime) {
        systemStatusElements.uptime.textContent = system.uptime || '24 days';
    }
}

// Update recent activity list
function updateRecentActivity(activities) {
    if (!recentActivityElement) return;
    
    console.log('Admin Dashboard: Updating recent activity with:', activities);
    recentActivityElement.innerHTML = '';
    
    if (!activities || activities.length === 0) {
        recentActivityElement.innerHTML = `
            <div class="text-center py-4 text-slate-500">
                <i data-lucide="info" class="w-6 h-6 mx-auto mb-2"></i>
                <p class="text-sm">No recent batches found</p>
            </div>
        `;
        return;
    }
    
    activities.slice(0, 4).forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'flex items-start gap-3';
        
        // For batches, we'll show batch creation activity
        const iconClass = 'trophy';
        const bgColorClass = 'bg-blue-100';
        const textColorClass = 'text-blue-600';
        
        // Get batch name and student count
        const batchName = activity.name || 'Unnamed Batch';
        const studentCount = activity.students ? activity.students.length : 0;
        const mentorCount = activity.mentors ? activity.mentors.length : 0;
        
        // Format creation date
        const createdAt = activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : 'Unknown date';
        
        activityItem.innerHTML = `
            <div class="w-8 h-8 ${bgColorClass} rounded-full flex items-center justify-center">
                <i data-lucide="${iconClass}" class="w-4 h-4 ${textColorClass}"></i>
            </div>
            <div class="flex-1">
                <p class="text-sm font-medium text-slate-900">${batchName}</p>
                <p class="text-xs text-slate-500">${studentCount} students, ${mentorCount} mentors • Created ${createdAt}</p>
            </div>
        `;
        
        recentActivityElement.appendChild(activityItem);
    });
    
    // Initialize Lucide icons for the new elements
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Fetch recent users from the database
async function fetchRecentUsers() {
    if (!recentUsersElement) return;
    
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('Admin Dashboard: No authentication token found for fetching recent users');
            return;
        }
        
        // Fetch recent users data
        const response = await fetch(`${API_BASE_URL}/users?limit=3&sort=-createdAt`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const users = await response.json();
        console.log('Admin Dashboard: Fetched recent users:', users);
        
        // Update the UI with the fetched users
        updateRecentUsers(users);
        
    } catch (error) {
        console.error('Admin Dashboard: Error fetching recent users:', error);
    }
}

// Fetch recent users from the database
async function fetchRecentUsers() {
    if (!recentUsersElement) return;
    
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('Admin Dashboard: No authentication token found for fetching recent users');
            return;
        }
        
        // Fetch recent users data
        const response = await fetch(`${API_BASE_URL}/users?limit=3&sort=-createdAt`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const users = await response.json();
        console.log('Admin Dashboard: Fetched recent users:', users);
        
        // Update the UI with the fetched users
        updateRecentUsers(users);
        
    } catch (error) {
        console.error('Admin Dashboard: Error fetching recent users:', error);
    }
}

// Update recent users list
function updateRecentUsers(users) {
    if (!recentUsersElement) return;
    
    recentUsersElement.innerHTML = '';
    
    if (!users || users.length === 0) {
        recentUsersElement.innerHTML = `
            <div class="text-center py-4 text-slate-500">
                <i data-lucide="info" class="w-6 h-6 mx-auto mb-2"></i>
                <p class="text-sm">No recent users found</p>
            </div>
        `;
        return;
    }
    
    users.slice(0, 3).forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg';
        
        // Generate random gradient for avatar
        const gradients = [
            'from-blue-400 to-indigo-500',
            'from-green-400 to-emerald-500',
            'from-purple-400 to-pink-500',
            'from-amber-400 to-orange-500'
        ];
        const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
        
        // Calculate time ago
        const createdAt = new Date(user.createdAt);
        const now = new Date();
        const diffTime = Math.abs(now - createdAt);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        
        let timeAgo;
        if (diffDays > 0) {
            timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        }
        
        userItem.innerHTML = `
            <div class="w-8 h-8 bg-gradient-to-br ${randomGradient} rounded-full flex items-center justify-center text-white text-sm font-semibold">
                ${user.name ? user.name.charAt(0) : 'U'}
            </div>
            <div class="flex-1">
                <p class="text-sm font-medium text-slate-900">${user.name || 'User Name'}</p>
                <p class="text-xs text-slate-500">${user.email || 'user@example.com'}</p>
            </div>
            <span class="text-xs text-green-600">${timeAgo}</span>
        `;
        
        recentUsersElement.appendChild(userItem);
    });
    
    // Initialize Lucide icons for the new elements
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Fetch recent mentors from the database
async function fetchRecentMentors() {
    if (!recentMentorsElement) return;
    
    try {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        if (!token) {
            console.error('Admin Dashboard: No authentication token found for fetching recent mentors');
            return;
        }
        
        // Fetch recent mentors data (users with role='mentor')
        const response = await fetch(`${API_BASE_URL}/users?role=mentor&limit=5&sort=-createdAt`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const mentors = await response.json();
        console.log('Admin Dashboard: Fetched recent mentors:', mentors);
        
        // Update the UI with the fetched mentors
        updateRecentMentors(mentors);
        return mentors;
        
    } catch (error) {
        console.error('Admin Dashboard: Error fetching recent mentors:', error);
        throw error;
    }
}

// Update recent mentors list
function updateRecentMentors(mentors) {
    if (!recentMentorsElement) return;
    
    console.log('Admin Dashboard: Updating recent mentors:', mentors);
    recentMentorsElement.innerHTML = '';
    
    if (!mentors || mentors.length === 0) {
        recentMentorsElement.innerHTML = `
            <div class="text-center py-4 text-slate-500">
                <i data-lucide="info" class="w-6 h-6 mx-auto mb-2"></i>
                <p class="text-sm">No mentors found</p>
            </div>
        `;
        return;
    }
    
    mentors.slice(0, 3).forEach(mentor => {
        const mentorItem = document.createElement('div');
        mentorItem.className = 'flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg';
        
        // Generate random gradient for avatar
        const gradients = [
            'from-amber-400 to-orange-500',
            'from-blue-400 to-cyan-500',
            'from-green-400 to-teal-500',
            'from-purple-400 to-pink-500'
        ];
        const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];
        
        // Calculate number of students based on assigned batches
        const studentCount = mentor.assignedBatches ? 
            mentor.assignedBatches.reduce((total, batch) => total + (batch.students ? batch.students.length : 0), 0) : 0;
        
        // Determine specialty based on mentor profile or default
        const specialty = mentor.specialty || mentor.skills?.join(', ') || 'Coding Expert';
        
        mentorItem.innerHTML = `
            <div class="w-8 h-8 bg-gradient-to-br ${randomGradient} rounded-full flex items-center justify-center text-white text-sm font-semibold">
                ${mentor.name ? mentor.name.charAt(0) : 'M'}
            </div>
            <div class="flex-1">
                <p class="text-sm font-medium text-slate-900">${mentor.name || 'Mentor Name'}</p>
                <p class="text-xs text-slate-500">${specialty} • ${studentCount} students</p>
            </div>
            <span class="text-xs text-green-600">Active</span>
        `;
        
        recentMentorsElement.appendChild(mentorItem);
    });
    
    // Initialize Lucide icons for the new elements
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Handle quick actions
function handleQuickAction(actionType) {
    switch(actionType) {
        case 'add-user':
            window.location.href = 'admin-users.html?action=add';
            break;
        case 'add-mentor':
            window.location.href = 'admin-mentors.html?action=add';
            break;
        case 'create-contest':
            window.location.href = 'admin-contests.html?action=add';
            break;
        case 'view-analytics':
            window.location.href = 'admin-analytics.html';
            break;
        case 'view-leaderboard':
            window.location.href = 'admin-leaderboard.html';
            break;
        default:
            console.log('Unknown action:', actionType);
    }
}

// Load mock data for demo purposes
function loadMockData() {
    const mockData = {
        totalUsers: 247,
        totalMentors: 18,
        totalBatches: 25,
        overallStats: {
            totalSubmissions: 1847,
            solved: 1542,
            reattempts: 245,
            doubts: 60,
            easy: 723,
            medium: 894,
            hard: 230
        },
        system: {
            status: 'Operational',
            serverLoad: '42%',
            databaseUsage: '38%',
            uptime: '24 days'
        },
        recentActivity: [
            {
                type: 'contest',
                title: 'New contest created',
                description: 'DSA Contest #6 by Dr. Smith',
                timeAgo: '4 hours ago'
            },
            {
                type: 'mentor',
                title: 'Mentor assigned',
                description: 'Dr. Johnson assigned to Java Contest',
                timeAgo: '6 hours ago'
            },
            {
                type: 'user',
                title: 'New user registered',
                description: 'Rahul Kumar joined',
                timeAgo: '2 hours ago'
            },
            {
                type: 'contest',
                title: 'Contest completed',
                description: 'Python Contest #3 ended with 45 participants',
                timeAgo: '1 day ago'
            }
        ],
        recentBatches: [
            {
                title: 'New contest created',
                description: 'DSA Contest #6 by Dr. Smith',
                timeAgo: '4 hours ago',
                type: 'contest'
            },
            {
                title: 'Mentor assigned',
                description: 'Dr. Johnson assigned to Java Contest',
                timeAgo: '6 hours ago',
                type: 'mentor'
            },
            {
                title: 'New user registered',
                description: 'Rahul Kumar joined',
                timeAgo: '2 hours ago',
                type: 'user'
            },
            {
                title: 'Contest completed',
                description: 'Python Contest #3 ended with 45 participants',
                timeAgo: '1 day ago',
                type: 'contest'
            }
        ],
        recentUsers: [
            {
                name: 'Rahul Kumar',
                email: 'rahul.kumar@email.com',
                timeAgo: '2 hours ago',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
            },
            {
                name: 'Priya Sharma',
                email: 'priya.sharma@email.com',
                timeAgo: '1 day ago',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
            },
            {
                name: 'Amit Patel',
                email: 'amit.patel@email.com',
                timeAgo: '2 days ago',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() // 2 days ago
            }
        ],
        recentMentors: [
            {
                name: 'Dr. Smith',
                specialty: 'DSA Expert',
                studentCount: 24,
                email: 'smith@example.com',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString() // 1 week ago
            },
            {
                name: 'Dr. Johnson',
                specialty: 'Java Expert',
                studentCount: 18,
                email: 'johnson@example.com',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString() // 2 weeks ago
            },
            {
                name: 'Prof. Wilson',
                specialty: 'Python Expert',
                studentCount: 15,
                email: 'wilson@example.com',
                createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString() // 3 weeks ago
            }
        ]
    };
    
    updateDashboard(mockData);
}