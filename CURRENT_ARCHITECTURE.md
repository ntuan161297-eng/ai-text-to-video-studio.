# CURRENT ARCHITECTURE AUDIT REPORT
**Engine**: AI Text-to-Video Engine (ai-text-to-video)  
**Date**: September 2026  
**Auditor**: Antigravity AI Engine Architect  

---

## 1. Executive Summary
An in-depth codebase audit was conducted across the current video generation engine, including CLI (`src/cli.ts`), pipeline coordinators (`src/pipeline.ts`, `src/engine/pipelineCoordinator.ts`), server/worker pipelines (`src/services/videoGenerator.ts`, `src/worker/videoWorker.ts`), research and facts engines (`src/services/researchEngine.ts`, `src/services/factLayer.ts`), creative modules (`src/engine/*`), and rendering templates (`src/hyperframes/template.ts`, `src/remotion/*`).

While individual modules exist, the pipeline suffers from major architectural compromises, synthetic score inflation, lack of real entity asset retrieval, hardcoded template phrases, silent audio padding, and leaky data boundaries.

---

## 2. Current End-to-End Pipeline Map

```
USER INPUT (Prompt / URL / Duration)
   │
   ▼
[VideoGenerator.generateVideo] (src/services/videoGenerator.ts)
   │
   ├─► [URL Provided?]
   │      ├─ Yes: CheerioArticleExtractor / EcommerceExtractor
   │      └─ No:  ResearchEngine.conductResearch (Bing search + Wikipedia API)
   │                 └─► fetchAndCleanSource (Axios + Cheerio paragraph grab)
   │
   ├─► [Fact Extraction]
   │      └─ FactLayer.extractFacts (Heuristic keyword/number matching)
   │      └─ FactLayer.buildApprovedContext: formats string with "[Fact #1 - ... (95%)]"
   │
   ├─► [Engine Branching]
   │      ├─ Engine == 'remotion':
   │      │     └─► VideoPipeline.run: RuleBasedLLM / OpenAI / Gemini -> Edge TTS -> Remotion renderMedia
   │      │
   │      └─ Engine == 'hyperframes' (Default):
   │            └─► PipelineCoordinator.execute:
   │                   ├─ CreativeDirector.createBrief (Regex classifier: REAL_ESTATE, TRAVEL, etc.)
   │                   ├─ HookEngine.generateAndSelectHook
   │                   ├─ StoryArchitect.constructStoryboard (Templated voiceover construction)
   │                   ├─ EntityGroundingEngine.evaluateAssetGrounding
   │                   ├─ SoundDirector.planAudio (BGM genre selection)
   │                   ├─ VideoCopywriter.craftSceneCopy (Headline & badge formatting)
   │                   ├─ RetentionEditor.optimizeStoryboard (Trims scenes > 38 words)
   │                   ├─ ContentReviewer.reviewContent (Checks keyword coverage & junk text)
   │                   └─ QualityScorer.evaluateQuality (Hardcoded base scores: 7, 14, 10, 9, 9, 9...)
   │
   ├─► [Audio Generation & Sync]
   │      ├─ TTSFactory (Edge-TTS) generates MP3 per scene
   │      ├─ Duration calculation: compares total audio duration with target duration
   │      └─ CRITICAL ISSUE: If total audio < target duration, spreads time delta and runs:
   │            `ffmpeg -i ... -af apad=pad_dur=X ...` (Injects silent padding into each scene!)
   │
   ├─► [Visual Selection]
   │      └─ downloadRealisticVisuals:
   │            Selects from HARDCODED Unsplash static photo URLs based on coarse category (vehicle, travel, sports, etc.)
   │
   ├─► [HTML Generation & Sanitization]
   │      ├─ FinalContentSanitizer.sanitizeScene: regex cleans "[Fact #1]", URLs, percentages
   │      └─ generateHyperFramesHtml: generates HTML/CSS/JS with 3D transforms & SVG icons
   │
   ├─► [Rendering]
   │      └─ `npx hyperframes render` via Chrome/Puppeteer -> MP4
   │
   └─► [Post-Render QA & Debug]
          ├─ VideoQaAndDebug.runPostRenderQa (Technical checks: file exists, duration, resolution)
          └─ VideoQaAndDebug.saveDebugArtifacts (14 JSON files in temp/video-jobs/{jobId}/debug)
```

---

## 3. Detailed Audit of Specific Flaws

### 3.1 Where Raw Research Leaks into Downstream
1. **`FactLayer.buildApprovedContext` (src/services/factLayer.ts:174)**:
   ```typescript
   return facts.map((f, idx) => `[Fact #${idx + 1} - ${f.sourceName} (${f.confidence}%)]: ${f.evidence}`).join('\n\n');
   ```
   This string containing `[Fact #1 ...]`, source names, and percentages is assigned directly to `extractedContext` and passed to LLM and StoryArchitect.
2. **`RuleBasedLLMProvider.generateScript` (src/providers/llm/ruleBasedLLM.ts:22-26)**:
   Splits `contextText` into raw sentences and directly feeds them into `voiceOver`. When web noise survives scraping, it appears verbatim in the voiceover.
3. **`StoryArchitect.constructStoryboard` (src/engine/storyArchitect.ts:120-218)**:
   Directly pastes `facts[i].claim` or `facts[i].evidence` into `voiceText`. If the fact evidence contains web snippets, they enter the narration.

### 3.2 What ScriptWriter Currently Receives
There is no unified `SeniorScriptWriter` in the primary pipeline (`PipelineCoordinator`). Instead:
- `StoryArchitect` assembles scenes by hardcoded string templates:
  - Scene 2: `Điểm đáng chú ý đầu tiên của ${coreTopic} chính là...`
  - Scene 3: `Không chỉ dừng lại ở đó, ${fact2Text}`
  - Scene 4: `Đặc biệt hơn, ${fact3Text}`
  - Scene 5: `Chính vì vậy, ${fact4Text}`
  - Final CTA: `Nếu thấy thông tin về ${coreTopic} này hữu ích, hãy thả tim, lưu video và bấm theo dõi kênh...`
- When `RuleBasedLLMProvider` is called (in `src/pipeline.ts`), it uses generic stock lines:
  - `"Bạn có biết điều này không? ... Hãy xem hết video để không bỏ lỡ."`
  - `"Đa số mọi người đều hiểu nhầm về vấn đề này..."`

### 3.3 What Renderer Can Access
- In `src/services/videoGenerator.ts`, `HyperVideoProject` receives sanitized scene fields, but the function scope holds raw `researchOutput`, `pipelineResult`, and scraped buffers.
- In `src/pipeline.ts` (Remotion), the raw unverified `script` from LLM is passed directly into the React bundler.
- Data boundaries are convention-based rather than enforced by strict TypeScript packages.

### 3.4 How Scene Duration is Currently Calculated
- TTS generates audio per scene and measures `audioResult.durationInSeconds`.
- If `totalVideoDuration < targetDuration`:
  ```typescript
  const diff = targetDuration - totalVideoDuration;
  // Spreads diff across scenes
  scenes[i].duration += addPerContentScene;
  // Injects silent padding using ffmpeg:
  ['-i', rawAudioPath, '-af', `apad=pad_dur=${padSeconds}`, ...]
  ```
- **Consequence**: When a script is too short for a 60s target, the speaker abruptly pauses or has 2–3 seconds of dead silence per scene. If too long, it risks getting cut. Duration is handled via audio manipulation rather than content scripting.

### 3.5 How Visual Providers are Chosen
- `downloadRealisticVisuals` (`src/utils/realisticVisuals.ts:7-64`):
  Uses hardcoded static photo arrays:
  - `vehicle`: 6 fixed Unsplash photos of sports cars and charging stations. (A video about DatBike gets a sports car or random EV charger).
  - `travel`: 5 fixed Unsplash photos including Ha Long Bay. (A video about Hà Tĩnh gets Ha Long Bay).
  - `sports`: 6 fixed football stadium photos.
- **Consequence**: Visuals are completely decoupled from actual entities. Real people, products, and locations are represented by generic stock photography.

### 3.6 How Quality Score is Calculated
- `QualityScorer.evaluateQuality` (`src/services/qualityControlEngine.ts:192-247`):
  Uses hardcoded default baseline numbers:
  - `sourceQuality = 7` (or 10 if approved >= 3)
  - `factualAccuracy = 14 / 15`
  - `topicRelevance = 10 / 10`
  - `hookStrength = 9 / 10`
  - `storytelling = 9 / 10`
  - `retentionPotential = 9 / 10`
  - `visualRelevance = 9 / 10`
  - `visualVariety = 4.5 / 5`
  - `voiceQuality = 4.8 / 5`
  - `subtitleReadability = 5 / 5`
  - `informationDensity = 4.5 / 5`
  - `mobileReadability = 5 / 5`
- The total almost always lands at **92–96 / 100**, creating an illusion of high quality without actually validating the content, audio, or visual fidelity.
