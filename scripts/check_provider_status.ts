import dotenv from 'dotenv';
dotenv.config();

import { UniversalScriptWriter } from '../src/brain/universalScriptWriter.js';
import { LLMFactory } from '../src/providers/llm/llmFactory.js';

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openAIKey = process.env.OPENAI_API_KEY;

  console.log('=== LLM PROVIDER STATUS CHECK ===');
  console.log('GEMINI_API_KEY set:', Boolean(geminiKey && geminiKey.trim().length > 0), 'length:', geminiKey ? geminiKey.trim().length : 0);
  console.log('OPENAI_API_KEY set:', Boolean(openAIKey && openAIKey.trim().length > 0));
  console.log('GEMINI_MODEL in env:', process.env.GEMINI_MODEL || '(not set)');
  console.log('LLM_PROVIDER in env:', process.env.LLM_PROVIDER || '(not set)');

  const provider = LLMFactory.create();
  console.log('LLMFactory selected provider:', provider.name, 'model:', provider.model);

  try {
    const isAvail = await provider.isAvailable();
    console.log('provider.isAvailable():', isAvail);
  } catch (err: any) {
    console.log('provider.isAvailable() error:', err.message);
  }

  // Test UniversalScriptWriter directly
  console.log('\n--- Testing UniversalScriptWriter.writeScript ---');
  try {
    const res = await UniversalScriptWriter.writeScript({
      intentSpec: {
        rawPrompt: 'Giới thiệu công ty Cổ phần tin học Tân Dân',
        originalUserRequest: 'Giới thiệu công ty Cổ phần tin học Tân Dân',
        targetSubject: 'Công ty Cổ phần tin học Tân Dân',
        primaryEntities: ['Tân Dân'],
        requestedDurationSeconds: 30,
        targetDurationSeconds: 30,
        style: 'professional',
        tone: 'professional',
        contentMode: 'factual',
        platform: 'shorts',
        aspectRatio: '9:16',
        language: 'vi',
        strictConstraints: [],
        prohibitedElements: [],
      } as any,
      topicContract: {
        coreTopic: 'Công ty Cổ phần tin học Tân Dân',
        primaryEntities: ['Tân Dân'],
        forbiddenDriftTopics: [],
        canonicalKeywords: ['công nghệ'],
        domainType: 'ENTERPRISE',
      } as any,
      knowledge: {
        strongestFacts: [
          { claim: 'Công ty Cổ phần Tin học Tân Dân là đơn vị công nghệ hàng đầu tại Việt Nam.', verified: true } as any
        ],
        supportingFacts: [],
        verifiedEntities: ['Tân Dân'],
        knowledgeCoverageScore: 90,
      } as any,
      contentPlan: {
        sections: [
          { sectionIndex: 1, purpose: 'Mở đầu', targetSeconds: 15, contentCore: 'Giới thiệu Tân Dân' },
          { sectionIndex: 2, purpose: 'Giải pháp', targetSeconds: 15, contentCore: 'Sản phẩm công nghệ' },
        ],
        targetTotalSeconds: 30,
        needCta: false,
      } as any,
    });
    console.log('UniversalScriptWriter SUCCESS! Generated beats:', res.beats.length);
  } catch (err: any) {
    console.error('UniversalScriptWriter FAILED:', err.message);
  }
}

main();
