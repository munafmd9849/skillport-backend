// SkillPort Authentication and Routing

// Function to check if user is logged in
function isLoggedIn() {
    return localStorage.getItem('token') !== null;
}

// Function to get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Function to logout user
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Function to protect routes based on role
function checkAuth() {
    console.log('Checking auth...');
    // Check if user is logged in
    if (!isLoggedIn()) {
        console.log('Not logged in, redirecting to index.html');
        window.location.href = '../index.html';
        return;
    }
    
    const user = getCurrentUser();
    const currentPath = window.location.pathname;
    console.log('Current path:', currentPath);
    console.log('User role:', user?.role);
    
    // If no user data found, redirect to login
    if (!user) {
        console.log('No user data found, redirecting to index.html');
        window.location.href = '../index.html';
        return;
    }
    
    // Route based on role
    if (user.role === 'student') {
        // If not in student section, redirect to student dashboard
        if (!currentPath.includes('/student/')) {
            console.log('Student not in student section, redirecting to student dashboard');
            window.location.href = '../student/student-dashboard.html';
        }
    } else if (user.role === 'mentor') {
        // If not in mentor section, redirect to mentor dashboard
        if (!currentPath.includes('/community/mentor/')) {
            console.log('Mentor not in mentor section, redirecting to mentor dashboard');
            window.location.href = '../community/mentor/mentor-dashboard.html';
        }
    } else if (user.role === 'admin') {
        // If not in admin section, redirect to admin dashboard
        if (!currentPath.includes('/community/admin/')) {
            console.log('Admin not in admin section, redirecting to admin dashboard');
            window.location.href = '../community/admin/admin-dashboard.html';
        }
    }
}

// Function to initialize auth on page load
function initAuth() {
    console.log('Initializing auth...');
    // Check if user is logged in and route accordingly
    if (isLoggedIn()) {
        console.log('User is logged in');
        const user = getCurrentUser();
        console.log('Current user:', user);
        if (user) {
            // If on index page, redirect to appropriate dashboard
            const path = window.location.pathname;
            console.log('Current path:', path);
            if (path.endsWith('index.html') || path.endsWith('/') || path.endsWith('/client/')) {
                console.log('On index page, redirecting based on role');
                if (user.role === 'student') {
                    console.log('Redirecting student to dashboard');
                    window.location.href = 'student/student-dashboard.html';
                } else if (user.role === 'mentor') {
                    console.log('Redirecting mentor to dashboard');
                    window.location.href = 'community/mentor/mentor-dashboard.html';
                } else if (user.role === 'admin') {
                    console.log('Redirecting admin to dashboard');
                    window.location.href = 'community/admin/admin-dashboard.html';
                }
            } else {
                console.log('Not on index page, no redirection needed');
            }
        }
    } else {
        console.log('User is not logged in');
    }
}

// Mock login function (for testing without backend)
function mockLogin(email, password) {
    console.log('Mock login attempt:', email, password);
    
    // Mock users for testing
    const mockUsers = {
        'student@example.com': { id: 1, name: 'Test Student', email: 'student@example.com', role: 'student', username: 'teststudent' },
        'mentor@example.com': { id: 2, name: 'Test Mentor', email: 'mentor@example.com', role: 'mentor', username: 'testmentor' },
        'admin@example.com': { id: 3, name: 'Test Admin', email: 'admin@example.com', role: 'admin', username: 'testadmin' }
    };
    
    // Check if email exists in mock users
    if (mockUsers[email]) {
        // In a real app, you would verify the password here
        // For demo purposes, we'll accept any password
        const user = mockUsers[email];
        const token = 'mock-jwt-token-' + Math.random().toString(36).substring(2);
        
        console.log('Login successful:', user.role);
        return {
            success: true,
            token: token,
            user: user
        };
    }
    
    return {
        success: false,
        message: 'Invalid email or password'
    };
}

// Update login form submission to use proper routing
function updateLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.onsubmit = function(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const errorDiv = document.getElementById('login-error');
            errorDiv.classList.add('d-none');
            
            // Use mock login instead of API call
            const result = mockLogin(email, password);
            console.log('Login result:', result);
            
            if (result.success) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                console.log('User stored in localStorage:', result.user);
                
                // Redirect based on role
                if (result.user.role === 'student') {
                    console.log('Redirecting to student dashboard');
                    window.location.href = 'student/student-dashboard.html';
                } else if (result.user.role === 'mentor') {
                    console.log('Redirecting to mentor dashboard');
                    window.location.href = 'community/mentor/mentor-dashboard.html';
                } else if (result.user.role === 'admin') {
                    console.log('Redirecting to admin dashboard');
                    window.location.href = 'community/admin/admin-dashboard.html';
                }
            } else {
                console.log('Login failed:', result.message);
                errorDiv.textContent = result.message;
                errorDiv.classList.remove('d-none');
            }
        };
    }
}

// Mock signup function (for testing without backend)
function mockSignup(name, email, password, role, username) {
    // Check if email already exists in mock users
    if (email === 'student@example.com' || email === 'mentor@example.com' || email === 'admin@example.com') {
        return {
            success: false,
            message: 'Email already in use'
        };
    }
    
    // Create new user
    const user = {
        id: Math.floor(Math.random() * 1000) + 10, // Random ID
        name: name,
        email: email,
        role: role,
        username: username
    };
    
    const token = 'mock-jwt-token-' + Math.random().toString(36).substring(2);
    
    return {
        success: true,
        token: token,
        user: user
    };
}

// Update signup form submission to use proper routing
function updateSignupForm() {
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.onsubmit = function(e) {
            e.preventDefault();
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const role = document.getElementById('signup-role').value;
            const username = document.getElementById('signup-username').value.trim();
            const errorDiv = document.getElementById('signup-error');
            errorDiv.classList.add('d-none');
            
            console.log('Signup attempt:', { name, email, role, username });
            
            // Use mock signup instead of API call
            const result = mockSignup(name, email, password, role, username);
            console.log('Signup result:', result);
            
            if (result.success) {
                localStorage.setItem('token', result.token);
                localStorage.setItem('user', JSON.stringify(result.user));
                console.log('User stored in localStorage:', result.user);
                
                // Redirect based on role
                if (result.user.role === 'student') {
                    console.log('Redirecting to student dashboard');
                    window.location.href = 'student/student-dashboard.html';
                } else if (result.user.role === 'mentor') {
                    console.log('Redirecting to mentor dashboard');
                    window.location.href = 'community/mentor/mentor-dashboard.html';
                } else if (result.user.role === 'admin') {
                    console.log('Redirecting to admin dashboard');
                    window.location.href = 'community/admin/admin-dashboard.html';
                }
            } else {
                console.log('Signup failed:', result.message);
                errorDiv.textContent = result.message;
                errorDiv.classList.remove('d-none');
            }
        };
    }
}

// Add a demo login button to quickly test different roles
function addDemoLoginButtons() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        // Create demo login container
        const demoContainer = document.createElement('div');
        demoContainer.className = 'mt-4 pt-3 border-top';
        demoContainer.innerHTML = `
            <p class="text-center text-muted mb-3">Quick Login Options</p>
            <div class="d-flex flex-column gap-2">
                <button type="button" class="btn btn-light d-flex align-items-center justify-content-between px-3 py-2 border shadow-sm" id="demo-student">
                    <div class="d-flex align-items-center">
                        <div class="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                            <i class="fas fa-user-graduate text-primary"></i>
                        </div>
                        <span>Student Account</span>
                    </div>
                    <span class="badge bg-primary bg-opacity-10 text-primary">Test</span>
                </button>
                <button type="button" class="btn btn-light d-flex align-items-center justify-content-between px-3 py-2 border shadow-sm" id="demo-mentor">
                    <div class="d-flex align-items-center">
                        <div class="bg-success bg-opacity-10 rounded-circle p-2 me-2">
                            <i class="fas fa-chalkboard-teacher text-success"></i>
                        </div>
                        <span>Mentor Account</span>
                    </div>
                    <span class="badge bg-success bg-opacity-10 text-success">Test</span>
                </button>
                <button type="button" class="btn btn-light d-flex align-items-center justify-content-between px-3 py-2 border shadow-sm" id="demo-admin">
                    <div class="d-flex align-items-center">
                        <div class="bg-danger bg-opacity-10 rounded-circle p-2 me-2">
                            <i class="fas fa-user-shield text-danger"></i>
                        </div>
                        <span>Admin Account</span>
                    </div>
                    <span class="badge bg-danger bg-opacity-10 text-danger">Test</span>
                </button>
            </div>
        `;
        loginForm.appendChild(demoContainer);
        
        // Add event listeners
        document.getElementById('demo-student').addEventListener('click', function() {
            document.getElementById('login-email').value = 'student@example.com';
            document.getElementById('login-password').value = 'password';
            // Auto-submit the form
            setTimeout(() => {
                document.querySelector('#login-form button[type="submit"]').click();
            }, 500);
        });
        
        document.getElementById('demo-mentor').addEventListener('click', function() {
            document.getElementById('login-email').value = 'mentor@example.com';
            document.getElementById('login-password').value = 'password';
            // Auto-submit the form
            setTimeout(() => {
                document.querySelector('#login-form button[type="submit"]').click();
            }, 500);
        });
        
        document.getElementById('demo-admin').addEventListener('click', function() {
            document.getElementById('login-email').value = 'admin@example.com';
            document.getElementById('login-password').value = 'password';
            // Auto-submit the form
            setTimeout(() => {
                document.querySelector('#login-form button[type="submit"]').click();
            }, 500);
        });
    }
}

// Initialize auth when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initAuth();
    updateLoginForm();
    updateSignupForm();
    addDemoLoginButtons();
});