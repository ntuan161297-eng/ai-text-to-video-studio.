import { InputUnderstandingEngine } from '../src/brain/inputUnderstandingEngine.js';
import { ResearchQueryPlanner } from '../src/brain/researchQueryPlanner.js';
import { KnowledgeBriefBuilder } from '../src/brain/knowledgeBriefBuilder.js';
import { ContentStrategist } from '../src/brain/contentStrategist.js';
import { CreativeAngleEngine } from '../src/brain/creativeAngleEngine.js';
import { HookCandidateEngine } from '../src/brain/hookCandidateEngine.js';
import { SeniorScriptWriter } from '../src/brain/seniorScriptWriter.js';
import { IndependentScriptReviewer } from '../src/brain/independentScriptReviewer.js';
import { ScriptQualityGate } from '../src/brain/scriptQualityGate.js';
import { ShotPlanner } from '../src/production/shotPlanner.js';
import { EntityAssetEngine } from '../src/production/entityAssetEngine.js';
import { TimelineEngine } from '../src/production/timelineEngine.js';
import { CaptionDirector } from '../src/production/captionDirector.js';
import { SceneCompositionEngine } from '../src/production/sceneCompositionEngine.js';
import { PreRenderQualityGate } from '../src/production/preRenderQualityGate.js';
import { ResearchEngine } from '../src/services/researchEngine.js';
import { FactLayer } from '../src/services/factLayer.js';
import { FactVerificationEngine } from '../src/brain/factVerificationEngine.js';
import { downloadRealisticVisuals } from '../src/utils/realisticVisuals.js';
import { CreativeHistory } from '../src/engine/creativeHistory.js';
import fs from 'fs';
import path from 'path';

async function runTrace() {
  console.log('--- STARTING CONTAMINATION TRACE A -> B ---');
  
  const promptA = 'Tạo video 60 giây về xe máy điện.';
  const promptB = 'Tạo video 60 giây về các hành tinh trong hệ Mặt Trời.';
  
  console.log('\n=== RUNNING JOB A ===');
  const briefA = InputUnderstandingEngine.analyze(promptA, { duration: 60 });
  console.log('Brief A topic:', briefA.topic, 'entities:', briefA.primaryEntities, 'contentType:', briefA.contentType);
  
  const queryPlanA = ResearchQueryPlanner.plan(briefA);
  console.log('QueryPlan A queries count:', queryPlanA.queries.length);
  
  console.log('\n=== RUNNING JOB B ===');
  const briefB = InputUnderstandingEngine.analyze(promptB, { duration: 60 });
  console.log('Brief B topic:', briefB.topic, 'entities:', briefB.primaryEntities, 'contentType:', briefB.contentType);
  
  const queryPlanB = ResearchQueryPlanner.plan(briefB);
  console.log('QueryPlan B queries:', queryPlanB.queries.map(q => q.query));
  
  // Check Stage: downloadRealisticVisuals
  const tempDir = path.resolve('./temp/test_trace');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  console.log('\n=== Testing Visual Download for Job A ===');
  const visualsA = await downloadRealisticVisuals(promptA, 4, tempDir, undefined, undefined, undefined, briefA.contentType.toLowerCase());
  console.log('Visuals A generated:', fs.readdirSync(tempDir));
  
  console.log('\n=== Testing Visual Download for Job B (in same or different folder) ===');
  // If tempDir is reused or if output folder has visual_scene_1.jpg:
  console.log('Files currently in tempDir:', fs.readdirSync(tempDir));
  const visualsB = await downloadRealisticVisuals(promptB, 4, tempDir, undefined, undefined, undefined, briefB.contentType.toLowerCase());
  console.log('Visuals B result:', visualsB);
  console.log('Files in tempDir after B:', fs.readdirSync(tempDir));
}

runTrace().catch(console.error);
