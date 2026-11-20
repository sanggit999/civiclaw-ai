# TASKS-007: Chia Lát Dọc Triển Khai Bộ Bóc Tách Tài Liệu, Quản Lý Phiên Bản & Lịch Sử Thẩm Định Hợp Đồng

## BƯỚC 4: CHIA LÁT DỌC (Vertical Slicing)

Quy tắc: Mỗi lát cắt đi xuyên từ Input -> Logic -> Output và **bắt buộc có lệnh kiểm thử độc lập (Test Verification Command)** để nghiệm thu ngay. Chỉ tích `[x]` khi kiểm thử pass 100%.

---

### Lát 1: Bộ Bóc Tách & Làm Sạch Tài Liệu (Document Parser & Cleaner Slice)
- [x] **t7.1.1:** Định nghĩa kiểu dữ liệu chuẩn `src/contract/version-types.ts` (`ParsedDocumentResult`, `IDocumentParser`, `ContractDocument`, `ContractVersion`, `VersionComparisonResult`, `IContractVersionStore`, `LifecycleUploadParams`, `LifecycleAuditResult`).
- [x] **t7.1.2:** Xây dựng `src/contract/document-parser.ts` (`DocumentParser`) bóc tách văn bản, loại bỏ số trang (`Trang \d+/\d+`, `Page \d+ of \d+`), running headers/footers, và tính toán mã băm SHA-256 (`contentHash`).
- [x] **t7.1.3:** Viết unit test trong `specs/007-contract-parser-versioning/tests/document-parser.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/007-contract-parser-versioning/tests/document-parser.test.ts
    ```

---

### Lát 2: Quản Lý Hồ Sơ & Phiên Bản Hợp Đồng (Contract Version Store Slice)
- [x] **t7.2.1:** Xây dựng `src/contract/in-memory-version-store.ts` (`InMemoryContractVersionStore`) hỗ trợ CRUD hồ sơ document, quản lý phiên bản tự động ($1, 2, 3...$), và chặn trùng lặp mã hash SHA-256.
- [x] **t7.2.2:** Xây dựng `src/contract/supabase-version-store.ts` (`SupabaseContractVersionStore`) liên kết bảng `contract_documents` & `contract_versions` trên PostgreSQL.
- [x] **t7.2.3:** Viết unit test trong `specs/007-contract-parser-versioning/tests/version-store.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/007-contract-parser-versioning/tests/version-store.test.ts
    ```

---

### Lát 3: Động Cơ So Sánh Lịch Sử Thẩm Định (Version Diff Engine Slice)
- [x] **t7.3.1:** Xây dựng `src/contract/version-diff-engine.ts` (`VersionDiffEngine`) so sánh đối soát chéo giữa phiên bản $v_{k-1}$ và $v_k$: tính `scoreDelta`, nhận diện rủi ro đã được giải quyết (`resolvedViolations`), phát hiện rủi ro mới phát sinh (`newViolations`), và xác định trạng thái tổng quan (`status: IMPROVED | REGRESSED | UNCHANGED`).
- [x] **t7.3.2:** Viết unit test trong `specs/007-contract-parser-versioning/tests/version-diff.test.ts`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/007-contract-parser-versioning/tests/version-diff.test.ts
    ```

---

### Lát 4: Bộ Điều Phối Vòng Đời & Kiểm Chứng BDD Toàn Diện (Lifecycle Manager & BDD Mockup Slice)
- [x] **t7.4.1:** Xây dựng `src/contract/contract-lifecycle-manager.ts` (`ContractLifecycleManager`) kết nối chu trình trọn gói: Tiếp nhận file -> Bóc tách -> Kiểm tra trùng lặp -> Thẩm định Agentic -> Lưu trữ version -> So sánh lịch sử.
- [x] **t7.4.2:** Viết bộ kiểm thử BDD toàn diện `specs/007-contract-parser-versioning/tests/mockup-bdd.test.ts` kiểm chứng 5 kịch bản nghiệm thu từ `spec.md`.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npx vitest run specs/007-contract-parser-versioning/tests/mockup-bdd.test.ts
    ```

---

### Lát 5: Kiểm Tra Toàn Diện, Chống Hardcode & Chốt Chặn Code Review (Production & Review Gate)
- [x] **t7.5.1:** Chạy toàn bộ test suites dự án (`npm test`) và biên dịch TypeScript (`npm run build`).
- [x] **t7.5.2:** Kiểm tra tuân thủ chính sách Chống Hardcode: Không có secrets, URL, hoặc số ma thuật fix cứng trong `src/`.
- [x] **t7.5.3:** Kích hoạt Chốt chặn Code Review độc lập (`/code-review`), đạt kết luận PASS và sẵn sàng tích hợp sản phẩm.
  - **Lệnh kiểm tra nghiệm thu:**
    ```bash
    npm test && npm run build
    ```
