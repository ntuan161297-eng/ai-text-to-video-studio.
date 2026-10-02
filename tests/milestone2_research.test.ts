import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { InputUnderstandingEngine } from '../src/brain/inputUnderstandingEngine.js';
import { ResearchQueryPlanner } from '../src/brain/researchQueryPlanner.js';
import { CleanContentExtractor } from '../src/brain/cleanContentExtractor.js';
import { SourceQualityEngine } from '../src/brain/sourceQualityEngine.js';
import { AntiResearchLeak } from '../src/brain/antiResearchLeak.js';

describe('Milestone 2: High-Fidelity Research & Clean Content Isolation', () => {
  it('should correctly classify diverse content types and extract entities', () => {
    const briefDatBike = InputUnderstandingEngine.analyze('Tạo video giới thiệu xe máy điện DatBike Weaver++');
    assert.equal(briefDatBike.contentType, 'REAL_PRODUCT');
    assert.ok(briefDatBike.primaryEntities.some((e) => e.includes('DatBike')));
    assert.equal(briefDatBike.factualSensitivity, 'HIGH');

    const briefHaTinh = InputUnderstandingEngine.analyze('Tạo video 60s khám phá vùng đất Hà Tĩnh kiên cường');
    assert.equal(briefHaTinh.contentType, 'REAL_LOCATION');
    assert.ok(briefHaTinh.primaryEntities.includes('Hà Tĩnh'));
    assert.equal(briefHaTinh.targetDuration, 60);

    const briefFinance = InputUnderstandingEngine.analyze('Phân tích thị trường chứng khoán và lãi suất ngân hàng');
    assert.equal(briefFinance.contentType, 'FINANCE');
  });

  it('should plan multi-intent search queries based on ContentBrief', () => {
    const brief = InputUnderstandingEngine.analyze('Tạo video giới thiệu xe máy điện DatBike');
    const plan = ResearchQueryPlanner.plan(brief);

    assert.ok(plan.queries.length >= 4);
    assert.ok(plan.queries.some((q) => q.purpose === 'OFFICIAL'));
    assert.ok(plan.queries.some((q) => q.purpose === 'FACT_CHECK'));
    assert.ok(plan.queries.some((q) => q.purpose === 'VISUAL_SOURCE'));
  });

  it('should strip all 18 noise categories including Gmail, login, cookies, ads from HTML', () => {
    const dirtyHtml = `
      <!DOCTYPE html>
      <html>
        <head><title>DatBike Weaver++ Ra Mắt - VnExpress</title></head>
        <body>
          <header class="header"><nav><a href="#">Trang chủ</a></nav></header>
          <div class="login">Đăng nhập vào Gmail trợ giúp</div>
          <div class="cookie-banner">Chấp nhận cookie policy</div>
          <div class="sidebar ads">Quảng cáo sản phẩm độc quyền</div>
          <article>
            <h1>DatBike Ra Mắt Mẫu Xe Điện Mới</h1>
            <p>DatBike chính thức giới thiệu dòng xe máy điện Weaver++ với khả năng sạc siêu nhanh.</p>
            <p>Xe đạt vận tốc tối đa 90 km/h và quãng đường di chuyển lên tới 200 km chỉ trong một lần sạc đầy.</p>
            <p class="hidden">Bấm vào đây để tải ứng dụng</p>
          </article>
          <footer>Bản quyền thuộc về VnExpress</footer>
        </body>
      </html>
    `;

    const result = CleanContentExtractor.extract(dirtyHtml, 'https://vnexpress.net/datbike');
    assert.ok(!result.cleanContent.includes('Gmail'));
    assert.ok(!result.cleanContent.includes('cookie'));
    assert.ok(!result.cleanContent.includes('Quảng cáo'));
    assert.ok(!result.cleanContent.includes('Bản quyền'));
    assert.ok(result.cleanContent.includes('DatBike chính thức giới thiệu'));
    assert.ok(result.cleanContent.includes('vận tốc tối đa 90 km/h'));
  });

  it('should score sources strictly and reject spam/unrelated domains', () => {
    const approvedDoc = SourceQualityEngine.evaluateSource(
      'https://datbike.com/weaver-plus',
      'DatBike Weaver++ Thông Số Kỹ Thuật Chính Thức',
      'DatBike Weaver++ sở hữu pin thế hệ mới với công suất động cơ 7000W mạnh mẽ. Xe đi được 200km.',
      ['https://datbike.com/img1.jpg'],
      'raw body...',
      ['DatBike']
    );
    assert.equal(approvedDoc.isApproved, true);
    assert.equal(approvedDoc.sourceType, 'PRIMARY_OFFICIAL');

    const rejectedSpam = SourceQualityEngine.evaluateSource(
      'https://support.google.com/mail',
      'Gmail Help',
      'Đăng nhập tài khoản',
      [],
      'raw body...',
      ['DatBike']
    );
    assert.equal(rejectedSpam.isApproved, false);
  });

  it('should audit and sanitize any research metadata leak tokens', () => {
    const leakyText = 'Điểm nhấn của DatBike [Fact #1 - VnExpress (95%)] là vận tốc 90 km/h [VERIFIED] theo nguồn: https://vnexpress.net';
    const auditBefore = AntiResearchLeak.audit(leakyText);
    assert.equal(auditBefore.passed, false);
    assert.ok(auditBefore.violations.length >= 2);

    const clean = AntiResearchLeak.sanitize(leakyText);
    assert.ok(!clean.includes('[Fact'));
    assert.ok(!clean.includes('(95%)'));
    assert.ok(!clean.includes('[VERIFIED]'));
    assert.ok(!clean.includes('https://'));
    assert.ok(clean.includes('Điểm nhấn của DatBike là vận tốc 90 km/h'));

    const auditAfter = AntiResearchLeak.audit(clean);
    assert.equal(auditAfter.passed, true);
  });
});
