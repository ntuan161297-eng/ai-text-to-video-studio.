import axios from 'axios';

async function checkStatus() {
  try {
    const res = await axios.get('http://localhost:4000/api/config/status');
    console.log('Config status from API server:', res.data);
  } catch (err: any) {
    console.error('Error contacting API server:', err.message);
  }
}

checkStatus();
