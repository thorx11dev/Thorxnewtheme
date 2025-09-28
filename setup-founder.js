
const axios = require('axios');

async function setupFounder() {
  try {
    const response = await axios.post('http://localhost:5000/api/bootstrap-founder', {
      firstName: 'Aon',
      lastName: 'Imran',
      email: 'thorx11dev@gmail.com',
      password: 'Thorxdidi9426!'
    });
    
    console.log('✅ Founder account created successfully!');
    console.log('Response:', response.data);
    console.log('\n🔑 You can now login with:');
    console.log('Email: thorx11dev@gmail.com');
    console.log('Password: Thorxdidi9426!');
    console.log('\n🚀 Navigate to /auth and login to access the team portal!');
  } catch (error) {
    if (error.response) {
      console.log('❌ Error:', error.response.data.message);
      if (error.response.data.message === 'Founder already exists. Use normal registration.') {
        console.log('ℹ️  A founder account already exists. Try logging in with existing credentials.');
      }
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

setupFounder();
