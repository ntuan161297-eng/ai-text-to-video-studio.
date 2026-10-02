# COMPREHENSIVE GAP ANALYSIS
**Current Architecture vs. Target Master Architecture**  
**AI Content Research → Creative Script → Video Production Engine**

---

## 1. High-Level Comparison Matrix

| Component / Requirement | Current State | Target State | Gap Severity | Primary Affected Files |
| :--- | :--- | :--- | :--- | :--- |
| **Pipeline Separation** | Monolithic execution in `PipelineCoordinator` & `videoGenerator.ts`. Research data floats in global scope. | Strict boundary: Content Brain must approve script package before Production starts. | **CRITICAL** | `src/services/videoGenerator.ts`, `src/engine/pipelineCoordinator.ts` |
| **Input Intelligence** | Coarse regex classification into 12 basic categories (`CreativeDirector.classifyContentType`). | `InputUnderstandingEngine` producing formal `ContentBrief` across 19 content types. | **HIGH** | `src/engine/creativeDirector.ts` |
| **Research Query Planner** | Generates 2-3 basic search queries. Single intent. | `ResearchQueryPlanner` generating multi-intent queries: DISCOVERY, OFFICIAL, FACT CHECK, RECENT NEWS, ENTITY, VISUAL. | **HIGH** | `src/services/researchEngine.ts` |
| **Source Fetch & Cleaning** | Strips common tags, but leaves raw paragraphs and passes snippets into context. | Strips all 18 noise categories; explicitly stores `rawContent` and `cleanContent` separately. | **HIGH** | `src/services/researchEngine.ts`, `src/providers/scraper/cheerioExtractor.ts` |
| **Research Leak Prevention** | Formats `[Fact #1 - Source (95%)]` into context string. Late regex sanitize at render. | Code-level isolation. ScriptWriter receives only clean synthesized briefs. Zero markup in narration. | **CRITICAL** | `src/services/factLayer.ts:174`, `src/engine/finalContentSanitizer.ts` |
| **Fact Layer & Verification** | Heuristic regex matching sentences with numbers. Confidence scores are synthetic. | Formal `VerifiedFact` schema with evidence text, cross-checking >= 2 sources, conflict marking. | **HIGH** | `src/services/factLayer.ts` |
| **Knowledge Brief** | None. Directly dumps facts or raw article paragraphs. | `KnowledgeBriefBuilder` synthesizing raw facts into viewer-centric briefing document. | **HIGH** | *New module required* |
| **Digital Content Strategist** | Basic template string for target audience and viewer promise. | `ContentStrategist` generating viewer problem, promise, takeaway, emotional direction. | **HIGH** | `src/engine/creativeDirector.ts` |
| **Creative Angle Engine** | 3 hardcoded angle candidates with static IDs. | 3–5 dynamically generated angles evaluated on novelty, visual potential, retention fit. | **HIGH** | `src/engine/creativeDirector.ts` |
| **Hook Engine** | Selects from formulaic hooks. Fallback uses generic "Bạn có biết...". | Generates >= 5 distinct mechanism hooks. Hard ban on generic clichés. | **HIGH** | `src/engine/hookEngine.ts`, `src/providers/llm/ruleBasedLLM.ts` |
| **Duration & Script Writing** | Hardcoded transition strings (`Không chỉ dừng lại ở đó`, `Đặc biệt hơn`, `Chính vì vậy`). | `SeniorScriptWriter` writing natural spoken Vietnamese (1 sentence ≈ 1 idea) adapted to duration. | **CRITICAL** | `src/engine/storyArchitect.ts`, `src/providers/llm/ruleBasedLLM.ts` |
| **Independent Script Review** | `ContentReviewer` performs shallow checks (junk regex and keyword match rate). | `IndependentScriptReviewer` scoring 14 distinct dimensions with CRITICAL / MAJOR / MINOR tickets. | **HIGH** | `src/services/qualityControlEngine.ts` |
| **Approved Script Package** | None. Scenes are generated with visual and copy merged from the start. | Strict typed contract `ApprovedScriptPackage`. Renderer cannot access research data. | **CRITICAL** | `src/engine/pipelineCoordinator.ts` |
| **Storyboard & Shot Planning** | 1 scene = 1 static visual. | Multi-shot planner (e.g. 7s beat = establishing + closeup + detail). | **HIGH** | `src/engine/storyArchitect.ts`, `src/hyperframes/template.ts` |
| **Media Policy Router** | Picks static Unsplash stock by category regardless of entity. | REAL ASSET FIRST for factual topics (people, places, products). Strict ban on fake cartoon/anime. | **CRITICAL** | `src/utils/realisticVisuals.ts` |
| **Real Asset Retrieval** | Static Unsplash URLs dictionary. | Entity-specific image search engine finding genuine product/person/place imagery. | **CRITICAL** | `src/utils/realisticVisuals.ts` |
| **Video Copywriter** | Basic truncation of voiceover into headline. | Clear separation: spoken narration vs. screen headline (2–7 words), supporting (<=12 words). | **MEDIUM** | `src/engine/videoCopywriter.ts` |
| **Voice-First Timeline & Sync** | **Injects silent padding (`apad`) into audio** if total voice < target duration! | Actual audio duration is truth. Mismatches trigger script length optimizer, NOT silent padding! | **CRITICAL** | `src/services/videoGenerator.ts:340-394` |
| **Composition & Layouts** | Single generic HyperFrames layout with CSS transforms. | 14 Layout archetypes (FULL_BLEED, PRODUCT_HERO, DETAIL_CLOSEUP, SPLIT_SCREEN, etc.). | **HIGH** | `src/hyperframes/template.ts`, `src/engine/sceneCompositionEngine.ts` |
| **Quality Scoring Integrity** | Hardcoded baseline numbers (7, 14, 10, 9, 9, 9...) generating fake 92–96% scores. | Evidence-backed scoring. Negative test cases must realistically fail. | **CRITICAL** | `src/services/qualityControlEngine.ts:182-247` |
| **Observability (Artifacts)** | Saves 14 debug JSON files. | Saves 25 discrete pipeline stage artifacts (`01_input` to `25_post_render_qa`). | **MEDIUM** | `src/services/videoQaAndDebug.ts` |

---

## 2. Root Cause Analysis of User's Top 20 Production Failures

1. **"Search snippet/rác Internet lọt vào script" & "Gmail/Login/Help lọt vào video"**:
   - *Root Cause*: `CheerioArticleExtractor` and `ResearchEngine` grab raw DOM paragraphs without multi-layer CSS exclusion. Fallback LLM (`RuleBasedLLMProvider`) slices sentences directly from raw page content.
2. **"Research metadata như [FACT #1], [VERIFIED], Wikipedia 95% bị hiển thị"**:
   - *Root Cause*: `FactLayer.buildApprovedContext` intentionally injected `[Fact #${idx + 1} - ${f.sourceName} (${f.confidence}%)]` into the downstream string context!
3. **"Kịch bản giống tóm tắt bài báo thay vì nội dung social media"**:
   - *Root Cause*: `StoryArchitect.constructStoryboard` literally stitches fact claims into predefined slots with transition words (`Điểm đáng chú ý đầu tiên... Không chỉ dừng lại ở đó... Đặc biệt hơn...`).
4. **"Voice bị cắt vì scene duration không khớp audio thật" & "Silent padding"**:
   - *Root Cause*: `videoGenerator.ts` artificially expands scene durations and pads WAV files with ffmpeg `apad=pad_dur=X` to artificially hit the 60s target.
5. **"Visual sai entity / Factual video dùng ảnh cartoon/stock không liên quan"**:
   - *Root Cause*: `realisticVisuals.ts` picks from a fixed array of 5–6 Unsplash stock photos per category. A DatBike motorcycle gets a sports car; Hà Tĩnh gets Ha Long Bay.
6. **"Quality score cao nhưng video thực tế vẫn kém"**:
   - *Root Cause*: `QualityScorer` starts with hardcoded baseline points (88+ points out of 100) before any inspection happens.

---

## 3. Necessary Refactoring Phases
To fix these systemic issues without destabilizing the system, the refactoring must be broken down into phased, self-testing milestones.
