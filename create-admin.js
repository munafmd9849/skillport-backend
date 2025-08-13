const axios = require('axios');

// Helper function to wait for a specified time
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const createAdmin = async () => {
  try {
    // Generate a unique timestamp for email and username with additional random string
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const email = `admin_${timestamp}_${randomStr}@example.com`;
    const username = `admin_${timestamp}_${randomStr}`;
    
    console.log(`Attempting to create admin with email: ${email}`);
    console.log(`Waiting 2 seconds before making the request...`);
    
    // Wait for 2 seconds to avoid any potential race conditions
    await sleep(2000);
    
    // Create the admin user
    const response = await axios.post('http://localhost:5000/api/auth/signup', {
      name: 'Unique Admin',
      email: email,
      username: username,
      password: 'Admin123!',
      role: 'admin'
    });
    
    console.log('Admin user created successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error creating admin user:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Request body:', error.config.data);
    } else {
      console.error(error.message);
    }
  }
};

createAdmin();