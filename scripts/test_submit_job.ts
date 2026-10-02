import axios from 'axios';

async function testSubmit() {
  try {
    // 1. Login or register
    let token = '';
    try {
      const loginRes = await axios.post('http://localhost:4000/api/auth/login', {
        email: 'creator@local.ai',
        password: 'password123'
      });
      token = loginRes.data.token;
    } catch {
      const regRes = await axios.post('http://localhost:4000/api/auth/register', {
        email: 'creator@local.ai',
        password: 'password123',
        name: 'Nhà sáng tạo'
      });
      token = regRes.data.token;
    }

    console.log('Logged in successfully!');

    // 2. Submit a video job
    const createRes = await axios.post(
      'http://localhost:4000/api/videos',
      {
        operation: 'CREATE_NEW',
        prompt: 'Giới thiệu công nghệ bán dẫn và vi mạch thế hệ mới',
        duration: 30,
        aspectRatio: '9:16',
        voice: 'vi-VN-HoaiMyNeural',
        style: 'Sports / Crimson Flame',
        caption: true,
        bgm: true,
        engine: 'hyperframes'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    console.log('Video Job Created! videoId:', createRes.data.videoId);

    // 3. Poll for progress for 15 seconds
    const videoId = createRes.data.videoId;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await axios.get(`http://localhost:4000/api/videos/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`[Status] Progress: ${statusRes.data.progress}% | Step: ${statusRes.data.currentStep} | Status: ${statusRes.data.status}`);
      if (statusRes.data.status === 'completed' || statusRes.data.status === 'failed') {
        if (statusRes.data.error) console.error('Error:', statusRes.data.error);
        if (statusRes.data.outputUrl) console.log('Final Video URL:', statusRes.data.outputUrl);
        break;
      }
    }
  } catch (err: any) {
    console.error('Submit failed:', err.response?.data || err.message);
  }
}

testSubmit();
