# TASKS-006: Chia Lát Dọc Triển Khai AI Agent Rà Soát Hợp Đồng Cá Nhân (Contract Auditor Agent)

## BƯỚC 4: CHIA LÁT DỌC (Vertical Slicing)

Quy tắc: Mỗi lát cắt đi xuyên từ Input -> Logic -> Output và **bắt buộc có lệnh kiểm thử độc lập (Test Verification Command)** để nghiệm thu ngay. Chỉ tích `[x]` khi kiểm thử pass 100%.

---

### Lát 1: Phân đoạn Hợp đồng & Nhận diện Điều khoản (Contract Segmentation Slice)
- [x] **t6.1.1:** Định nghĩa kiểu dữ liệu chuẩn `src/contract/types.ts` (`ContractClause`, `ContractCategory`, `RiskLevel`, `ClauseAuditFinding`, `MissingClauseFinding`, `ContractAuditReport`, `ContractAuditorConfig`, `DEFAULT_CONTRACT_AUDITOR_CONFIG`).
- [x] **t6.1.2:** Xây dựng `src/contract/clause-segmenter.ts` (`ClauseSegmenter`) phân tách văn bản hợp đồng thành danh sách điều khoản độc lập và tự động phát hiện loại hợp đồng (`labor`, `rental`, `civil_loan`).
- [x] **t6.1.3:** Viết unit test trong `specs/006-contract-auditor-agent/tests/clause-segmenter.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/006-contract-auditor-agent/tests/clause-segmenter.test.ts
    ```

---

### Lát 2: Hộp Công cụ Giới hạn Luật định & Kiểm tra Điều khoản Bắt buộc (Statutory Limits & Mandatory Checker Slice)
- [x] **t6.2.1:** Xây dựng `src/contract/statutory-limit-checker.ts` (`StatutoryLimitChecker`) kiểm tra các ngưỡng cứng theo luật thực định (thử việc $\le 60$ ngày theo Điều 25 BLLĐ 2019, trần lãi suất vay $\le 20\%$/năm theo Điều 468 BLDS 2015, thời hạn báo trước chấm dứt HĐ).
- [x] **t6.2.2:** Xây dựng `src/contract/mandatory-clause-checker.ts` (`MandatoryClauseChecker`) kiểm tra tính đầy đủ của các điều khoản bắt buộc phải có theo Điều 21 BLLĐ 2019 và Điều 163 Luật Nhà ở 2023.
- [x] **t6.2.3:** Viết unit test trong `specs/006-contract-auditor-agent/tests/statutory-checker.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/006-contract-auditor-agent/tests/statutory-checker.test.ts
    ```

---

### Lát 3: Tầng Đánh giá Tính Pháp lý & Rủi ro 3 Mức (Legality Verifier & Risk Assessor Slice)
- [x] **t6.3.1:** Xây dựng `src/contract/clause-verifier.ts` (`ClauseLegalityVerifier`) đối chiếu từng điều khoản với các quy định pháp luật cấm (giữ bằng cấp gốc Điều 17 BLLĐ, phạt tiền thay kỷ luật Điều 127 BLLĐ, cấm mang thai Điều 137 BLLĐ, đơn phương tăng giá thuê, tịch thu cọc trái luật).
- [x] **t6.3.2:** Phân loại rủi ro 3 mức (🔴 `RED_ILLEGAL`, 🟡 `YELLOW_WARNING`, 🟢 `GREEN_SAFE`) và tự động sinh mẫu câu đề xuất đàm phán lại cân bằng lợi ích.
- [x] **t6.3.3:** Viết unit test trong `specs/006-contract-auditor-agent/tests/clause-verifier.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/006-contract-auditor-agent/tests/clause-verifier.test.ts
    ```

---

### Lát 4: Bộ Điều phối Agentic, Tính Điểm An toàn & Báo cáo Thẩm định (Contract Auditor Agent Integration Slice)
- [x] **t6.4.1:** Xây dựng `src/contract/contract-auditor-agent.ts` (`ContractAuditorAgent`) và `src/contract/report-synthesizer.ts` (`AuditReportSynthesizer`).
- [x] **t6.4.2:** Tính toán `SafetyScore` (0 - 100), phân loại rủi ro tổng thể, tổng hợp thống kê, và kích hoạt Fallback khi LLM gặp sự cố để đảm bảo luôn trả về báo cáo.
- [x] **t6.4.3:** Viết bộ kiểm thử BDD toàn diện `specs/006-contract-auditor-agent/tests/mockup-bdd.test.ts` đối soát trọn vẹn 5 kịch bản nghiệm thu từ `spec.md`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/006-contract-auditor-agent/tests/mockup-bdd.test.ts
    ```

---

### Lát 5: Kiểm tra Toàn Diện, Chống Hardcode & Chốt chặn Code Review (Production & Review Gate)
- [x] **t6.5.1:** Chạy toàn bộ test suites dự án (`npm test`) và biên dịch TypeScript (`npm run build`).
- [x] **t6.5.2:** Kiểm tra tuân thủ chính sách Chống Hardcode: Không có secrets, URL, hoặc số ma thuật fix cứng trong `src/`.
- [x] **t6.5.3:** Kích hoạt Chốt chặn Code Review độc lập (`/code-review`), khắc phục triệt để các ca biên C1, I1, I2, I3, M1, M2 và bổ sung bộ test hồi quy.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npm test && npm run build
    ```
