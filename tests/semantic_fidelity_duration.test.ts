import assert from 'assert';
import { UniversalIntentEngine } from '../src/brain/universalIntentEngine.js';
import { AdaptiveResearchPlanner } from '../src/brain/adaptiveResearchPlanner.js';
import { LiveWebSearcher } from '../src/brain/liveWebSearcher.js';
import { SourceQualityEngine } from '../src/brain/sourceQualityEngine.js';
import { AdaptiveContentPlanner } from '../src/brain/adaptiveContentPlanner.js';
import { UniversalScriptWriter } from '../src/brain/universalScriptWriter.js';
import { UniversalScriptReviewer } from '../src/brain/universalScriptReviewer.js';
import { MasterVideoEngine } from '../src/engine/masterVideoEngine.js';

async function runSemanticFidelityAndDurationTests() {
  console.log('============================================================');
  console.log('TEST SUITE: SEMANTIC FIDELITY & TRUE DURATION FIDELITY');
  console.log('============================================================\n');

  // TEST 1: Section A & B - PRODUCTION_MODE must fail early if no semantic provider is configured
  console.log('--- TEST 1: Production Mode fails early with SEMANTIC_PROVIDER_UNAVAILABLE ---');
  const originalOffline = process.env.TEST_OFFLINE_MODE;
  const originalGemini = process.env.GEMINI_API_KEY;
  const originalOpenAI = process.env.OPENAI_API_KEY;

  delete process.env.TEST_OFFLINE_MODE;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  const samplePrompt = 'Tạo video 60 giây giải thích nghịch lý Fermi';
  const resolved = UniversalIntentEngine.resolve(samplePrompt);
  const intent = resolved.intentSpec;
  const topicContract = resolved.topicContract;

  let failedEarlyWriter = false;
  try {
    await UniversalScriptWriter.writeScript({
      intentSpec: intent,
      topicContract,
      knowledge: {
        coreUnderstanding: 'Nghịch lý Fermi',
        strongestFacts: [],
        supportingFacts: [],
        meaningfulNumbers: [],
        relevantEntities: ['Fermi'],
        nuances: [],
        unansweredQuestions: [],
        visualOpportunities: [],
        informationToAvoid: [],
      },
      contentPlan: {
        requestedSeconds: 60,
        targetDurationSec: 60,
        structureArchetype: 'EXPLANATORY',
        corePremise: 'Nghịch lý Fermi',
        narrationBudgetWords: 159,
        intentionalVisualPauseBudgetSeconds: 0,
        sections: [],
        contentPacing: 'MODERATE',
        bannedGenericFormulas: [],
        domainGuidance: '',
      },
    });
  } catch (err: any) {
    if (err.message.includes('SEMANTIC_PROVIDER_UNAVAILABLE')) {
      failedEarlyWriter = true;
    } else {
      throw err;
    }
  }
  assert.strictEqual(failedEarlyWriter, true, 'Production UniversalScriptWriter must throw SEMANTIC_PROVIDER_UNAVAILABLE');

  let failedEarlyMaster = false;
  try {
    await MasterVideoEngine.execute({
      prompt: samplePrompt,
      duration: 60,
    });
  } catch (err: any) {
    if (err.message.includes('SEMANTIC_PROVIDER_UNAVAILABLE')) {
      failedEarlyMaster = true;
    } else {
      throw err;
    }
  }
  assert.strictEqual(failedEarlyMaster, true, 'Production MasterVideoEngine must fail early at STEP 0 with SEMANTIC_PROVIDER_UNAVAILABLE');
  console.log('✅ TEST 1 PASSED: Production Mode strictly forbids heuristic/template writing and fails early.\n');

  // Restore offline mode for deterministic unit checks
  process.env.TEST_OFFLINE_MODE = 'true';

  // TEST 2: Section C & D - Query generation anchors topic and rejects homonym / single-token splits
  console.log('--- TEST 2: Query Generation must preserve topic anchor (No single-token splits) ---');
  const potResolved = UniversalIntentEngine.resolve('Nghệ thuật làm gốm Bát Tràng truyền thống');
  const potIntent = potResolved.intentSpec;
  const potPlan = AdaptiveResearchPlanner.plan(potIntent, potResolved.topicContract);
  
  assert.ok(potPlan.isTopicAnchored, 'ResearchPlan must be marked isTopicAnchored');
  for (const q of potPlan.queries) {
    assert.ok(
      !/^nghệ$/i.test(q.query.trim()),
      `Query "${q.query}" must not be isolated homonym token "nghệ"`
    );
    assert.ok(
      q.query.toLowerCase().includes('gốm') || q.query.toLowerCase().includes('bát tràng') || q.query.toLowerCase().includes('nghệ thuật'),
      `Query "${q.query}" must anchor to primaryTopic or entity`
    );
  }
  console.log('✅ TEST 2 PASSED: Queries are strictly anchored to full semantic subject.\n');

  // TEST 3: Section E - Search Result Relevance Gate rejects homonym traps
  console.log('--- TEST 3: Search Result Relevance Gate rejects off-topic homonyms ---');
  const potteryContract = potResolved.topicContract;
  
  // Fake search results: one valid pottery, one homonym trap (Curcumin turmeric)
  const validPotteryResult = {
    title: 'Lịch sử và nghệ thuật làm gốm Bát Tràng',
    url: 'https://battrang.vn/nghe-thuat-lam-gom',
    snippet: 'Quy trình sản xuất gốm sứ Bát Tràng truyền thống qua bàn tay nghệ nhân vuốt gốm.',
  };
  const homonymTurmericResult = {
    title: 'Tác dụng của củ nghệ vàng và tinh bột nghệ Curcumin',
    url: 'https://suckhoedoisong.vn/nghe-vang-curcumin',
    snippet: 'Củ nghệ tươi chứa hàm lượng cao curcumin giúp chống viêm loét dạ dày và làm đẹp da.',
  };

  const evalValid = LiveWebSearcher.evaluateSearchResult(validPotteryResult, potteryContract, potIntent.primaryTopic);
  const evalHomonym = LiveWebSearcher.evaluateSearchResult(homonymTurmericResult, potteryContract, potIntent.primaryTopic);

  assert.strictEqual(evalValid.approved, true, 'Valid pottery result should be approved');
  assert.strictEqual(evalHomonym.approved, false, 'Homonym turmeric result must be rejected');
  assert.ok(evalHomonym.topicRelevance <= 20, 'Homonym relevance score should be low');
  console.log('✅ TEST 3 PASSED: Search Result Relevance Gate cleanly rejects homonym trap.\n');

  // TEST 4: Section F - Source Document Semantic Gate rejects drifted full-page content
  console.log('--- TEST 4: Source Document Semantic Gate rejects off-topic content ---');
  const gasResolved = UniversalIntentEngine.resolve('Cách xử lý bình gas bị rò rỉ tại nhà');
  const gasIntent = gasResolved.intentSpec;
  const gasContract = gasResolved.topicContract;

  // Fake page about Qing Dynasty Princesses ("Cách cách")
  const qingPrincessContent = `
    Hoàn Châu Cách Cách là danh xưng hoàng thất nhà Thanh dành cho con gái vua.
    Các nàng Cách cách thời phong kiến sống trong cung cấm với nghi lễ nghiêm ngặt.
  `;
  const evaluatedDriftDoc = SourceQualityEngine.evaluateSource(
    'https://lichsu.vn/hoan-chau-cach-cach',
    'Tìm hiểu về các nàng Cách Cách triều Thanh',
    qingPrincessContent,
    [],
    qingPrincessContent,
    gasContract.requiredEntities,
    gasContract
  );
  assert.strictEqual(evaluatedDriftDoc.isApproved, false, 'Qing Princess document must be rejected for gas safety topic');
  assert.strictEqual(evaluatedDriftDoc.scores.totalScore, 0, 'Drifted document gets score 0');
  console.log('✅ TEST 4 PASSED: Source Document Semantic Gate rejects full-page homonym drift.\n');

  // TEST 5: Section I - Script Fidelity Gate rejects drifted script
  console.log('--- TEST 5: Script Fidelity Gate detects SCRIPT_TOPIC_DRIFT ---');
  const driftScript = {
    title: 'NGHỆ THUẬT LÀM GỐM',
    totalWords: 150,
    estimatedDurationSec: 58,
    beats: [
      {
        sectionName: 'Hook',
        narration: 'Củ nghệ vàng là một loại gia vị và dược liệu tuyệt vời cho sức khỏe con người.',
        targetDurationSec: 15,
        displayHeadline: 'TÁC DỤNG CỦ NGHỆ',
        supportingText: 'Curcumin tự nhiên',
        factIds: [],
        expectedEntities: ['củ nghệ'],
      },
      {
        sectionName: 'Body',
        narration: 'Tinh bột nghệ giúp chữa đau dạ dày và làm sáng da hiệu quả theo y học cổ truyền.',
        targetDurationSec: 43,
        displayHeadline: 'CHỮA BỆNH DẠ DÀY',
        supportingText: 'Y học cổ truyền',
        factIds: [],
        expectedEntities: ['tinh bột nghệ'],
      },
    ],
    allBeats: [],
    fullNarration: 'Củ nghệ vàng là một loại gia vị và dược liệu tuyệt vời. Tinh bột nghệ giúp chữa đau dạ dày.',
    fidelityScore: 30,
    reviewPassed: false,
    reviewNotes: [],
  };

  const reviewRes = UniversalScriptReviewer.review(driftScript, potIntent, potteryContract);
  assert.strictEqual(reviewRes.passed, false, 'Script about turmeric for pottery request must fail review');
  assert.ok(
    reviewRes.issues.some((issue) => issue.includes('SCRIPT_TOPIC_DRIFT')),
    'Reviewer issues must include SCRIPT_TOPIC_DRIFT'
  );
  console.log('✅ TEST 5 PASSED: Script Fidelity Gate flags SCRIPT_TOPIC_DRIFT on wrong-subject narration.\n');

  // TEST 6: Section K, L, M, O - True Duration Fidelity & Content Budget Allocation
  console.log('--- TEST 6: Duration Contract & Narration Budget Allocation ---');
  const durationResolved = UniversalIntentEngine.resolve('Giải thích ngắn gọn về lỗ đen vũ trụ trong 45 giây', { duration: 45 });
  const durationIntent = durationResolved.intentSpec;
  const contentPlan45 = AdaptiveContentPlanner.planContent(durationIntent, durationResolved.topicContract, {
    coreUnderstanding: 'Lỗ đen vũ trụ',
    strongestFacts: [],
    supportingFacts: [],
    meaningfulNumbers: [],
    relevantEntities: ['Lỗ đen'],
    nuances: [],
    unansweredQuestions: [],
    visualOpportunities: [],
    informationToAvoid: [],
  });

  assert.strictEqual(contentPlan45.requestedSeconds, 45, 'Requested seconds must be 45');
  assert.strictEqual(contentPlan45.intentionalVisualPauseBudgetSeconds, 0, 'Visual pause is not an automatic filler');
  assert.strictEqual(contentPlan45.narrationBudgetWords, Math.round(45 * 2.65), 'Narration budget must match requested duration @ 2.65 wps');
  console.log(`✅ TEST 6 PASSED: Narration budget (${contentPlan45.narrationBudgetWords} words) explicitly planned for 45s.\n`);

  // Cleanup env
  if (originalOffline !== undefined) process.env.TEST_OFFLINE_MODE = originalOffline;
  else delete process.env.TEST_OFFLINE_MODE;
  if (originalGemini !== undefined) process.env.GEMINI_API_KEY = originalGemini;
  if (originalOpenAI !== undefined) process.env.OPENAI_API_KEY = originalOpenAI;

  console.log('============================================================');
  console.log('ALL SEMANTIC FIDELITY & DURATION FIDELITY TESTS PASSED 100%');
  console.log('============================================================');
}

runSemanticFidelityAndDurationTests().catch((err) => {
  console.error('TEST RUNNER FAILED:', err);
  process.exit(1);
});
