# SkillPort Client - Frontend Implementation

This directory contains the frontend for SkillPort, built with HTML, CSS, Bootstrap, and Tailwind CSS.

## 📁 File Structure

```
client/
├── index.html          # Main landing page HTML file
├── styles.css          # Custom CSS styles
├── script.js           # JavaScript functionality
├── auth.js             # Authentication and routing logic
├── README.md           # This file
├── student/            # Student dashboard and related pages
│   ├── student-dashboard.html
│   ├── profile.html
│   ├── communities.html
│   ├── posts.html
│   ├── projects.html
│   ├── stats.html
│   └── tracker.html
├── community/          # Community-related pages
│   ├── mentor/         # Mentor dashboard and related pages
│   │   ├── mentor-dashboard.html
│   │   ├── mentor-contests.html
│   │   ├── mentor-feedback.html
│   │   └── mentor-leaderboard.html
│   └── admin/          # Admin dashboard and related pages
│       ├── admin-dashboard.html
│       ├── admin-users.html
│       ├── admin-mentors.html
│       ├── admin-contests.html
│       └── admin-analytics.html
```

## 🎨 Design Features

### Technologies Used
- **HTML5** - Semantic markup structure
- **Bootstrap 5** - Responsive grid system and components
- **Tailwind CSS** - Utility-first CSS framework
- **Font Awesome** - Icon library
- **Google Fonts** - Inter font family
- **Vanilla JavaScript** - Interactive functionality

### Key Features
- **Responsive Design** - Works on all device sizes
- **Modern UI/UX** - Clean, professional design
- **Smooth Animations** - CSS transitions and JavaScript animations
- **Interactive Elements** - Hover effects, scroll animations, counters
- **Accessibility** - Semantic HTML and ARIA labels
- **Performance** - Optimized loading and lazy loading

## 🚀 Sections

### 1. Navigation Bar
- Fixed top navigation
- Responsive mobile menu
- Smooth scroll navigation
- Login/Signup buttons

### 2. Hero Section
- Compelling headline and description
- Call-to-action buttons
- Statistics display
- Hero image
- Gradient background with pattern overlay

### 3. Features Section
- 6 feature cards with icons
- Hover animations
- Responsive grid layout

### 4. How It Works
- 4-step process explanation
- Numbered steps with icons
- Animated step cards

### 5. User Roles
- 3 role cards (Student, Mentor, Admin)
- Feature lists for each role
- Interactive hover effects

### 6. Call-to-Action
- Gradient background
- Compelling messaging
- Action buttons

### 7. Footer
- Company information
- Navigation links
- Social media links
- Copyright notice

## 🎯 Interactive Features

### JavaScript Functionality
- **Navbar Scroll Effect** - Changes appearance on scroll
- **Smooth Scrolling** - Smooth navigation between sections
- **Scroll Animations** - Elements animate when scrolled into view
- **Counter Animations** - Statistics count up when visible
- **Back to Top Button** - Appears after scrolling
- **Mobile Menu Toggle** - Responsive navigation
- **Form Handling** - Demo form submission with loading states
- **Parallax Effects** - Subtle parallax on hero section
- **Typing Effect** - Hero title types out on load
- **Ripple Effects** - Button click animations
- **Progress Bar** - Scroll progress indicator

### CSS Animations
- **Hover Effects** - Cards lift and scale on hover
- **Fade Animations** - Elements fade in on scroll
- **Transform Effects** - Smooth transitions and transforms
- **Gradient Backgrounds** - Beautiful color gradients
- **Custom Scrollbar** - Styled scrollbar
- **Loading Animations** - Spinner for loading states

## 🔐 Authentication and Routing

### Overview
The authentication and routing system directs users to their respective dashboards based on their roles (student, mentor, or admin) after successful login.

### Key Files
- **auth.js**: Central authentication and routing logic
  - Functions for checking login status, getting current user, and logout
  - Role-based route protection
  - Login and signup form handling

### Authentication Flow (Mock Implementation)
1. User logs in through the login form on index.html
2. The system uses a mock authentication system (no backend required):
   - Pre-configured test accounts:
     - Student: student@example.com (any password)
     - Mentor: mentor@example.com (any password)
     - Admin: admin@example.com (any password)
   - Demo login buttons are provided for quick testing
3. Upon successful login:
   - Token and user data are stored in localStorage
   - User is redirected to the appropriate dashboard based on their role:
     - Students → student/student-dashboard.html
     - Mentors → community/mentor/mentor-dashboard.html
     - Admins → community/admin/admin-dashboard.html

### Route Protection
- Each dashboard page checks if the user is logged in
- Each dashboard page verifies the user has the correct role
- If authentication or authorization fails, user is redirected to the login page

### Helper Functions
- `isLoggedIn()`: Checks if user has a valid token
- `getCurrentUser()`: Retrieves user data from localStorage
- `logout()`: Removes user data and redirects to login page
- `checkAuth()`: Verifies user is authorized for current page
- `initAuth()`: Initializes authentication on page load

## 🎨 Color Scheme

### Primary Colors
- **Primary**: `#6366f1` (Indigo)
- **Primary Dark**: `#4f46e5` (Dark Indigo)
- **Secondary**: `#f59e0b` (Amber)
- **Success**: `#10b981` (Emerald)
- **Danger**: `#ef4444` (Red)
- **Warning**: `#f59e0b` (Amber)
- **Info**: `#3b82f6` (Blue)

### Neutral Colors
- **Dark**: `#1f2937` (Gray 800)
- **Light**: `#f8fafc` (Gray 50)
- **Gray Scale**: 100-900 range

## 📱 Responsive Breakpoints

- **Mobile**: < 576px
- **Tablet**: 576px - 768px
- **Desktop**: 768px - 992px
- **Large Desktop**: > 992px

## 🚀 Getting Started

1. **Open the landing page**:
   ```bash
   # Simply open index.html in a web browser
   open client/index.html
   ```

2. **Local Development Server** (optional):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **View the page**:
   - Navigate to `http://localhost:8000` (if using server)
   - Or open `index.html` directly in your browser

## 🔧 Customization

### Colors
Edit the CSS custom properties in `styles.css`:
```css
:root {
    --primary-color: #6366f1;
    --secondary-color: #f59e0b;
    /* ... other colors */
}
```

### Content
Modify the HTML content in `index.html`:
- Update text content
- Change images
- Modify navigation links
- Update contact information

### Styling
Customize the design in `styles.css`:
- Modify animations
- Change layouts
- Update typography
- Adjust spacing

### Functionality
Enhance interactivity in `script.js`:
- Add new animations
- Implement form validation
- Add more interactive features
- Integrate with backend APIs

## 📊 Performance Optimizations

- **Lazy Loading** - Images load when scrolled into view
- **CSS Optimization** - Efficient selectors and properties
- **JavaScript Optimization** - Debounced scroll events
- **Font Loading** - Google Fonts with display=swap
- **Icon Optimization** - Font Awesome CDN
- **Minification Ready** - Clean, readable code structure

## 🌐 Browser Support

- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+
- **Mobile Browsers**: iOS Safari 14+, Chrome Mobile 90+

## 📝 Notes

- The landing page is designed to be standalone and doesn't require a build process
- All dependencies are loaded from CDNs for simplicity
- The design follows modern web standards and best practices
- The code is well-commented and organized for easy maintenance
- The page is optimized for both desktop and mobile viewing

## 🔗 Integration

This landing page can be easily integrated with:
- **React App** - Convert to React components
- **Backend API** - Connect to the SkillPort server
- **CMS** - Use with content management systems
- **Analytics** - Add Google Analytics or other tracking
- **Forms** - Connect to form handling services