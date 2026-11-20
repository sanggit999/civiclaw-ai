import { ClauseAuditFinding } from './types.js';
import { ComparisonStatus, ContractVersion, VersionComparisonResult } from './version-types.js';

/**
 * Động cơ So Sánh Lịch Sử Thẩm Định & Biến Thiên Phiên Bản (Version Diff Engine)
 * Tự động phát hiện các rủi ro đã được giải quyết hoặc mới phát sinh giữa 2 bản thảo.
 */
export class VersionDiffEngine {
  /**
   * So sánh phiên bản trước và phiên bản hiện tại
   */
  static compareVersions(prevVersion: ContractVersion, currVersion: ContractVersion): VersionComparisonResult {
    const previousVersion = prevVersion.versionNumber;
    const currentVersion = currVersion.versionNumber;

    const prevScore = prevVersion.auditReport.safetyScore;
    const currScore = currVersion.auditReport.safetyScore;
    const scoreDelta = currScore - prevScore;

    // Lọc các điều khoản rủi ro (Đỏ hoặc Vàng)
    const prevRisks = prevVersion.auditReport.findings.filter(
      (f) => f.riskLevel === 'RED_ILLEGAL' || f.riskLevel === 'YELLOW_WARNING'
    );
    const currRisks = currVersion.auditReport.findings.filter(
      (f) => f.riskLevel === 'RED_ILLEGAL' || f.riskLevel === 'YELLOW_WARNING'
    );

    // 1. Tìm các rủi ro đã được giải quyết (Resolved Violations)
    // Một rủi ro cũ được coi là đã giải quyết nếu trong bản mới không còn vi phạm cùng điều luật hoặc cùng nội dung
    const resolvedViolations: ClauseAuditFinding[] = [];
    for (const prevR of prevRisks) {
      const stillExists = currRisks.some((currR) => {
        // Cùng trích dẫn điều luật vi phạm
        const sharesCitation = prevR.statutoryViolations.some((cite) =>
          currR.statutoryViolations.includes(cite)
        );
        // Hoặc cùng clauseId mà bản mới vẫn bị cờ rủi ro
        const sameClauseId = prevR.clauseId === currR.clauseId;
        return sharesCitation || sameClauseId;
      });

      if (!stillExists) {
        resolvedViolations.push(prevR);
      }
    }

    // 2. Tìm các rủi ro mới phát sinh (New Violations)
    // Một rủi ro trong bản mới được coi là mới nếu bản cũ không hề có vi phạm tương tự
    const newViolations: ClauseAuditFinding[] = [];
    for (const currR of currRisks) {
      const existedInPrev = prevRisks.some((prevR) => {
        const sharesCitation = currR.statutoryViolations.some((cite) =>
          prevR.statutoryViolations.includes(cite)
        );
        const sameClauseId = currR.clauseId === prevR.clauseId;
        return sharesCitation || sameClauseId;
      });

      if (!existedInPrev) {
        newViolations.push(currR);
      }
    }

    // 3. Đánh giá xu hướng tiến triển
    let status: ComparisonStatus = 'UNCHANGED';
    if (scoreDelta > 0 && newViolations.length === 0) {
      status = 'IMPROVED';
    } else if (scoreDelta < 0 || newViolations.length > 0) {
      status = 'REGRESSED';
    } else if (scoreDelta === 0 && resolvedViolations.length === 0 && newViolations.length === 0) {
      status = 'UNCHANGED';
    }

    // 4. Sinh tóm tắt điều hành so sánh
    const summary = this.generateComparisonSummary(
      previousVersion,
      currentVersion,
      prevScore,
      currScore,
      scoreDelta,
      resolvedViolations.length,
      newViolations.length,
      status
    );

    return {
      previousVersion,
      currentVersion,
      scoreDelta,
      resolvedViolations,
      newViolations,
      status,
      summary,
    };
  }

  private static generateComparisonSummary(
    prevVer: number,
    currVer: number,
    prevScore: number,
    currScore: number,
    delta: number,
    resolvedCount: number,
    newCount: number,
    status: ComparisonStatus
  ): string {
    const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;
    const statusText =
      status === 'IMPROVED'
        ? 'Cải thiện rõ rệt, đối tác đã khắc phục các điều khoản bất lợi'
        : status === 'REGRESSED'
        ? 'Cảnh báo nguy cơ thụt lùi, phát sinh thêm rủi ro pháp lý mới'
        : 'Không có sự thay đổi đáng kể về mức độ an toàn';

    return (
      `So sánh tiến trình Version ${prevVer} (${prevScore}đ) -> Version ${currVer} (${currScore}đ) [Biến thiên: ${deltaStr} điểm]. ` +
      `Trạng thái: ${statusText}. ` +
      `Đã giải quyết thành công ${resolvedCount} rủi ro cũ; ` +
      `Phát sinh ${newCount} rủi ro mới cần lưu ý.`
    );
  }
}
