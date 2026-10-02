# MASTER SYSTEM REFACTOR IMPLEMENTATION PLAN
**Project**: AI Text-to-Video Engine Refactor  
**Architecture**: Content Brain → Creative Script → Video Production Engine  
**Execution Standard**: Incremental Milestones with Typecheck, Unit Tests, and Regression Validation.  

---

## Roadmap Overview

```
Milestone 1: Strict Data Contracts & Schema Boundaries (Parts 1, 6, 7, 8, 21, 42)
     │
     ▼
Milestone 2: High-Fidelity Research & Clean Content Isolation (Parts 2, 3, 4, 5, 20)
     │
     ▼
Milestone 3: Fact Engine & Knowledge Brief Synthesis (Parts 6, 7)
     │
     ▼
Milestone 4: Strategic Direction & Creative Angles (Parts 8, 9, 10)
     │
     ▼
Milestone 5: Senior Script Writer & Spoken Vietnamese Storytelling (Parts 11, 12, 13, 14, 15, 16, 17, 18)
     │
     ▼
Milestone 6: Independent Script Reviewer & Script Quality Gate (Parts 19, 21, 38)
     │
     ▼
Milestone 7: Media Policy Router & Real Entity Asset Retrieval (Parts 22, 23, 24, 25)
     │
     ▼
Milestone 8: Voice-First Timeline, Audio Measurement & Anti-Padding (Parts 26, 27, 28, 29)
     │
     ▼
Milestone 9: Scene Composition, Visual Hierarchy & Motion Director (Parts 30, 31, 32, 33, 34, 35)
     │
     ▼
Milestone 10: Pre-Render & Post-Render Quality Gates & Real Evidence Scoring (Parts 36, 37, 38, 44)
     │
     ▼
Milestone 11: End-to-End Observability (25 Debug Stages) & Regression Test Suite (Parts 39, 40)
```

---

## Detailed Milestone Breakdown

### Milestone 1: Strict Data Contracts & Core Boundaries
- **Goals**: Define typed interfaces in `src/types/contentBrain.ts` and `src/types/productionEngine.ts`.
- **Contracts**:
  - `ContentBrief`: 19 content types, audience, intent, factual sensitivity, freshness requirement.
  - `VerifiedFact`: claim, evidence text, source URL, confidence, category.
  - `KnowledgeBrief`: topic summary, key entities, numbers, visual opportunities, facts to avoid.
  - `CreativeAngleCandidate` & `HookCandidate`.
  - `ApprovedScriptPackage`: strict handover structure containing only approved narration and display copy.
- **Verification**: `npx tsc --noEmit`. No circular dependencies.

---

### Milestone 2: High-Fidelity Research & Clean Content Isolation
- **Goals**:
  - Implement `InputUnderstandingEngine` to parse user prompt into a structured `ContentBrief`.
  - Implement `ResearchQueryPlanner`: Generate DISCOVERY, OFFICIAL, FACT_CHECK, RECENT_NEWS, ENTITY, VISUAL queries.
  - Rewrite source fetching to completely isolate `rawContent` from `cleanContent`.
  - Eliminate all 18 noise categories (nav, footer, login, Gmail, cookies, sidebars, ads, auth modals).
  - Implement code-level `AntiResearchLeak` sanitizer so that `[FACT #1]`, `(95%)`, and URLs can never enter downstream copy.
- **Verification**: Run unit test on dirty web pages (news with ads, cookies, login links). Verify `cleanContent` has zero junk and zero metadata leak.

---

### Milestone 3: Fact Engine & Knowledge Brief Synthesis
- **Goals**:
  - Implement `FactEngine`: Extract claims supported strictly by `evidenceText`.
  - Cross-check sensitive numbers (prices, dates, statistics) across multiple sources. Flag conflicts.
  - Implement `KnowledgeBriefBuilder`: Aggregate verified facts into a synthesized creator brief (highlighting surprising facts, key figures, and visual opportunities) without writing the script.
- **Verification**: Test with multi-source topics. Verify `KnowledgeBrief` contains zero markdown citations or leak tokens.

---

### Milestone 4: Strategic Direction & Creative Angles
- **Goals**:
  - Implement `ContentStrategist`: Determine `viewerProblem`, `viewerPromise`, `mainTakeaway`, and `emotionalDirection`. Reject video generation if `viewerPromise` is empty.
  - Implement `CreativeAngleEngine`: Generate 3–5 genuinely diverse angles (e.g. Discovery, Problem → Solution, Myth → Reality, Data → Meaning). Score on evidence strength, visual potential, and retention.
  - Implement `HookEngine`: Generate >= 5 candidate hooks with distinct psychological triggers (curiosity, contradiction, specific fact, visual hook). Disallow generic clichés ("Bạn có biết...").
- **Verification**: Test with diverse prompts (product, history, travel, finance). Confirm angle and hook diversity.

---

### Milestone 5: Senior Script Writer (Natural Spoken Vietnamese)
- **Goals**:
  - Implement `SeniorScriptWriter`: Consumes only `ContentBrief`, `KnowledgeBrief`, `VerifiedFacts`, `SelectedAngle`, `SelectedHook`.
  - Strictly banned from viewing raw research or web snippets.
  - Write spoken Vietnamese: 1 sentence ≈ 1 idea. Concrete, human, engaging.
  - Eliminate all hardcoded template transitions (`Không chỉ dừng lại ở đó`, `Đặc biệt hơn`, `Chính vì vậy`).
  - Implement dynamic CTA engine: Match CTA to content (COMMENT, SAVE, SHARE, FOLLOW, NONE).
  - Implement `ScriptDurationOptimizer`: Calculate target word count based on natural speaking rate (~2.5 to 2.8 words/sec in Vietnamese) for 30s, 45s, 60s, 90s, 120s, 180s.
- **Verification**: Review generated scripts across 5 diverse topics. Ensure natural phrasing and correct word count.

---

### Milestone 6: Independent Script Reviewer & Script Quality Gate
- **Goals**:
  - Implement `IndependentScriptReviewer`: Independent evaluator assessing script against facts, topic relevance, clarity, natural Vietnamese, progression, ending payoff, and retention.
  - Emit structured issues: `CRITICAL`, `MAJOR`, `MINOR`.
  - Implement `ScriptQualityGate`: Any CRITICAL issue immediately fails the script and triggers a targeted refinement loop (max 3 loops).
  - Produce the signed `ApprovedScriptPackage`.
- **Verification**: Test with deliberately flawed scripts (fake facts, off-topic drift, junk text). Ensure gate FAILS and blocks approval.

---

### Milestone 7: Media Policy Router & Real Entity Asset Retrieval
- **Goals**:
  - Implement `MediaPolicyRouter`:
    - REAL_PERSON, REAL_PRODUCT, REAL_LOCATION, NEWS → REAL ASSET FIRST. Strict prohibition of cartoon/anime/fake avatars.
    - CONCEPTUAL / EXPLAINER → High-quality illustrations / typography permitted.
  - Implement `EntityAssetEngine`: Search actual real-world imagery based on extracted entity queries (e.g., "DatBike Weaver++ official", "Hà Tĩnh ngã ba Đồng Lộc thực tế").
  - Implement `AssetVerifier`: Verify semantic relevance, resolution, and reject mismatched stock.
  - Fallback: Charts, interactive maps, metric cards, typography, rather than generic unrelated stock photos.
- **Verification**: Test with real entities (DatBike, Hà Tĩnh, VinFast, iPhone). Verify fetched images actually depict the subject.

---

### Milestone 8: Voice-First Timeline, Audio Measurement & Anti-Padding
- **Goals**:
  - TTS is synthesized directly from `ApprovedScriptPackage`.
  - Use `ffprobe` to measure exact millisecond audio duration of each beat.
  - **Completely remove silent padding (`apad`)**.
  - If actual audio duration deviates from target duration by >12%, send feedback back to `ScriptDurationOptimizer` to adjust text and re-synthesize before rendering.
  - Align captions to actual audio timestamps (3–9 words per subtitle block).
- **Verification**: Verify exported audio has zero artificial silent gaps and matches the spoken narration seamlessly.

---

### Milestone 9: Scene Composition, Visual Hierarchy & Motion Director
- **Goals**:
  - Implement `SceneCompositionEngine` with 14 archetypes (FULL_BLEED, PRODUCT_HERO, DETAIL_CLOSEUP, SPLIT_SCREEN, STAT_CARD, MAP, CHART, KINETIC_TYPE, etc.).
  - Implement `VideoCopywriter`: Ensure strict text economy on screen.
    - Headline: 2–7 words.
    - Supporting: <= 12 words.
    - Zero duplication between headline, supporting text, and subtitles.
  - Implement `MotionDirector`: Camera movements that serve storytelling (slow push, tracking, whip cut, parallax) without animating everything simultaneously.
- **Verification**: Verify generated HTML/Remotion frames have distinct layouts and strict text limits.

---

### Milestone 10: Pre/Post-Render Quality Gates & Real Evidence Scoring
- **Goals**:
  - Overhaul `QualityScorer`: Remove all hardcoded starting scores (no default 9/10).
  - Every score must have explanatory evidence.
  - Implement `PreRenderQualityGate`: Checks audio integrity, text density, asset presence, and metadata leakage.
  - Implement `PostRenderQA`: Extracts frames from final MP4; checks for black frames, audio clipping, subtitle safe-area violations, and aspect ratio correctness.
- **Verification**: Run negative tests. Ensure flawed videos fail with actionable error reports.

---

### Milestone 11: End-to-End Observability & Regression Test Suite
- **Goals**:
  - Implement 25-stage discrete artifact saving (`01_input.json` to `25_post_render_qa.json`) under `temp/video-jobs/{jobId}/artifacts/`.
  - Create automated regression suite in `tests/masterEngine.test.ts` covering:
    - Factual product (e.g. DatBike)
    - Factual location (e.g. Hà Tĩnh)
    - News / current event
    - Abstract explainer / finance
    - URL article extraction
    - Negative test: Crawled text with Gmail/login junk must be 100% rejected or cleaned.
  - Ensure existing CLI (`src/cli.ts`), worker (`src/worker/videoWorker.ts`), and Web API (`src/server/index.ts`) continue working without disruption.
- **Verification**: All unit tests pass, typechecks clean, CLI commands execute flawlessly.
