import 'dotenv/config';
import { getSupabaseClient } from '../dist/storage/supabase-client.js';
import { SupabaseContractVersionStore } from '../dist/contract/supabase-version-store.js';
import { VersionDiffEngine } from '../dist/contract/version-diff-engine.js';
import { DuplicateContentError } from '../dist/contract/version-types.js';

async function main() {
  console.log('🔄 Đang kết nối tới Supabase Cloud...');
  const supabase = getSupabaseClient(false); // Thử nghiệm với anon/public client (tuân thủ RLS)

  const store = new SupabaseContractVersionStore(supabase);

  // Dọn dẹp dữ liệu thử nghiệm cũ nếu có từ lần chạy trước
  await supabase
    .from('contract_documents')
    .delete()
    .eq('title', 'Hợp đồng lao động Thử nghiệm Live');

  // 1. Kiểm tra truy vấn bảng contract_documents
  console.log('📋 Kiểm tra sự tồn tại của bảng contract_documents...');
  const { data: initDocs, error: docErr } = await supabase
    .from('contract_documents')
    .select('id')
    .limit(1);

  if (docErr) {
    throw new Error(`Lỗi truy vấn contract_documents: ${docErr.message} (code: ${docErr.code})`);
  }
  console.log('✅ Bảng contract_documents hoạt động tốt, RLS cho phép SELECT!');

  // 2. Kiểm tra truy vấn bảng contract_versions
  console.log('📋 Kiểm tra sự tồn tại của bảng contract_versions...');
  const { data: initVers, error: verErr } = await supabase
    .from('contract_versions')
    .select('id')
    .limit(1);

  if (verErr) {
    throw new Error(`Lỗi truy vấn contract_versions: ${verErr.message} (code: ${verErr.code})`);
  }
  console.log('✅ Bảng contract_versions hoạt động tốt, RLS cho phép SELECT!');

  // 3. Tạo một hồ sơ hợp đồng thực nghiệm
  console.log('📝 Tạo hồ sơ hợp đồng mới trên Supabase Cloud...');
  const testDoc = await store.createDocument('Hợp đồng lao động Thử nghiệm Live', 'labor');
  console.log(`✅ Tạo thành công contract_documents: id = ${testDoc.id}, version = ${testDoc.currentVersion}`);

  // 4. Thêm phiên bản v1
  console.log('📤 Đăng tải phiên bản v1 lên contract_versions...');
  const findingV1 = {
    clauseId: 'dieu_3',
    clauseTitle: 'Điều 3. Giữ giấy tờ tùy thân',
    clauseText: 'Người lao động phải nộp bản chính bằng tốt nghiệp đại học.',
    riskLevel: 'RED_ILLEGAL',
    statutoryViolations: ['Điều 17 Bộ luật Lao động 2019'],
    explanation: 'Hành vi giữ bản chính văn bằng chứng chỉ bị nghiêm cấm.',
    recommendation: 'Yêu cầu chỉ nộp bản sao công chứng.',
  };

  const dummyReportV1 = {
    documentTitle: testDoc.title,
    category: 'labor',
    overallScore: 60,
    safetyScore: 60,
    riskTier: 'HIGH_RISK',
    summary: 'Phát hiện điều khoản giữ bằng đại học gốc vi phạm Điều 17 BLLĐ',
    stats: { totalClauses: 2, redCount: 1, yellowCount: 0, greenCount: 1, missingMandatoryCount: 0 },
    findings: [findingV1],
    clauseFindings: [findingV1],
    missingClauses: [],
    auditedAt: new Date().toISOString(),
  };

  const v1 = await store.addVersion(testDoc.id, {
    fileName: 'HDLD_Live_v1.docx',
    fileType: 'docx',
    contentHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    cleanedText: 'Điều 1: Công việc. Điều 3: Nộp bằng đại học gốc.',
    auditReport: dummyReportV1,
  });
  console.log(`✅ Lưu thành công phiên bản v${v1.versionNumber}: id = ${v1.id}`);

  // 5. Kiểm tra ràng buộc chống trùng lặp (DuplicateContentError / DB unique constraint)
  console.log('🔒 Kiểm tra ràng buộc chống trùng lặp mã băm SHA-256...');
  try {
    await store.addVersion(testDoc.id, {
      fileName: 'HDLD_Live_v1_Copy.docx',
      fileType: 'docx',
      contentHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      cleanedText: 'Điều 1: Công việc. Điều 3: Nộp bằng đại học gốc.',
      auditReport: dummyReportV1,
    });
    throw new Error('❌ Lỗi: Ràng buộc chống trùng lặp không hoạt động!');
  } catch (err) {
    if (err instanceof DuplicateContentError) {
      console.log('✅ Ràng buộc chống trùng lặp hoạt động CHÍNH XÁC: Chặn thành công file trùng mã băm!');
    } else {
      throw err;
    }
  }

  // 6. Thêm phiên bản v2 đã khắc phục vi phạm
  console.log('📤 Đăng tải phiên bản v2 (đã bỏ điều khoản giữ bằng gốc)...');
  const dummyReportV2 = {
    documentTitle: testDoc.title,
    category: 'labor',
    overallScore: 95,
    safetyScore: 95,
    riskTier: 'SAFE',
    summary: 'Hợp đồng đã an toàn, điều khoản giữ bằng gốc đã được gỡ bỏ',
    stats: { totalClauses: 2, redCount: 0, yellowCount: 0, greenCount: 2, missingMandatoryCount: 0 },
    findings: [],
    clauseFindings: [],
    missingClauses: [],
    auditedAt: new Date().toISOString(),
  };

  const v2 = await store.addVersion(testDoc.id, {
    fileName: 'HDLD_Live_v2.docx',
    fileType: 'docx',
    contentHash: 'b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef01',
    cleanedText: 'Điều 1: Công việc. Điều 3: Nộp bản sao công chứng bằng đại học.',
    auditReport: dummyReportV2,
  });
  console.log(`✅ Lưu thành công phiên bản v${v2.versionNumber}: id = ${v2.id}`);

  // 7. Chạy VersionDiffEngine đối soát 2 phiên bản từ Supabase Cloud
  console.log('🔍 Chạy động cơ đối soát lịch sử VersionDiffEngine.compareVersions...');
  const diffResult = VersionDiffEngine.compareVersions(v1, v2);
  console.log(`✅ Kết quả đối soát lịch sử phiên bản:`);
  console.log(`   - Trạng thái biến thiên: ${diffResult.status}`);
  console.log(`   - Điểm số an toàn: từ ${v1.auditReport.safetyScore} lên ${v2.auditReport.safetyScore} (Tăng +${diffResult.scoreDelta} điểm)`);
  console.log(`   - Vi phạm đã khắc phục: ${diffResult.resolvedViolations.length} (Đã xử lý: ${diffResult.resolvedViolations[0]?.clauseTitle})`);
  console.log(`   - Vi phạm mới phát sinh: ${diffResult.newViolations.length}`);

  // 8. Dọn dẹp dữ liệu thử nghiệm (kiểm tra CASCADE deletion)
  console.log('🧹 Dọn dẹp hồ sơ thử nghiệm trên Supabase Cloud (Kiểm tra CASCADE delete)...');
  const { error: delErr } = await supabase
    .from('contract_documents')
    .delete()
    .eq('id', testDoc.id);

  if (delErr) {
    throw new Error(`Lỗi dọn dẹp contract_documents: ${delErr.message}`);
  }

  // Xác nhận các versions liên quan đã tự động bị xóa theo CASCADE
  const remainingVersions = await store.listVersions(testDoc.id);
  if (remainingVersions.length === 0) {
    console.log('✅ Cơ chế ON DELETE CASCADE hoạt động hoàn hảo: Các versions liên quan đã được dọn sạch!');
  } else {
    throw new Error('❌ Cảnh báo: Vẫn còn version mồ côi chưa bị xóa cascade!');
  }

  console.log('\n🎉 TOÀN BỘ KIỂM THỬ TRỰC TIẾP TRÊN SUPABASE CLOUD ĐÃ THÀNH CÔNG RỰC RỠ 100%!');
}

main().catch((err) => {
  console.error('❌ Lỗi kiểm thử Supabase Cloud:', err);
  process.exit(1);
});
