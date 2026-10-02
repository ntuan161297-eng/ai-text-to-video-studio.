import { UniversalIntentEngine } from '../src/brain/universalIntentEngine.js';

const res = UniversalIntentEngine.resolve('Tôi muốn tạo video giới thiệu về công ty Cổ phần tin học Tân Dân Công ty công nghệ phần mềm');
console.log('cleanSubject:', res.intentSpec.primarySubject);
console.log('coreTopic:', res.topicContract.coreTopic);
console.log('requiredEntities:', res.topicContract.requiredEntities);
