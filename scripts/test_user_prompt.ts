import axios from 'axios';

async function testRetry() {
  try {
    const loginRes = await axios.post('http://localhost:4000/api/auth/login', {
      email: 'ntuan161297@gmail.com',
      password: 'password123'
    }).catch(async () => {
      // If password differs, login as creator@local.ai
      return await axios.post('http://localhost:4000/api/auth/login', {
        email: 'creator@local.ai',
        password: 'password123'
      });
    });

    const token = loginRes.data.token;
    console.log('Login success, user:', loginRes.data.user.email);

    // Let's create a video with prompt:
    const createRes = await axios.post('http://localhost:4000/api/videos', {
      operation: 'CREATE_NEW',
      prompt: 'Tạo video giới thiệu Giải pháp Điều hành bay FlyCam của công ty Tân Dân',
      duration: 30,
      aspectRatio: '9:16',
      voice: 'vi-VN-NamMinhNeural',
      style: 'Modern Tech',
      caption: true,
      bgm: true,
      engine: 'hyperframes'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Created video:', createRes.data.videoId);
    const videoId = createRes.data.videoId;

    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const res = await axios.get(`http://localhost:4000/api/videos/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`[Status] ${res.data.progress}% | ${res.data.currentStep} | ${res.data.status}`);
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        if (res.data.error) console.error('Error:', res.data.error);
        if (res.data.outputUrl) console.log('Video URL:', res.data.outputUrl);
        break;
      }
    }
  } catch (err: any) {
    console.error('Failed:', err.response?.data || err.message);
  }
}

testRetry();
