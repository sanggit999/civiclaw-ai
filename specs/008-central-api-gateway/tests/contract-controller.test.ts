import { describe, it, expect } from 'vitest';
import { ContractController } from '../../../src/api/controllers/contract-controller.js';
import { ContractLifecycleManager } from '../../../src/contract/contract-lifecycle-manager.js';
import { InMemoryContractVersionStore } from '../../../src/contract/in-memory-version-store.js';
import { IncomingMessage, ServerResponse } from 'node:http';
import { EventEmitter } from 'node:events';

function createMockRequest(body: unknown, url = '/api/v1/contracts/audit', method = 'POST'): IncomingMessage {
  const req = new EventEmitter() as unknown as IncomingMessage;
  req.headers = { 'content-type': 'application/json' };
  req.method = method;
  req.url = url;

  process.nextTick(() => {
    if (body) {
      req.emit('data', Buffer.from(JSON.stringify(body)));
    }
    req.emit('end');
  });

  return req;
}

function createMockResponse(): { res: ServerResponse; getOutput: () => string; getStatusCode: () => number; getHeaders: () => Record<string, string> } {
  let statusCode = 200;
  const headers: Record<string, string> = {};
  let output = '';

  const res = {
    writeHead: (code: number, h?: Record<string, string>) => {
      statusCode = code;
      if (h) Object.assign(headers, h);
      return res;
    },
    setHeader: (k: string, v: string) => {
      headers[k] = v;
    },
    write: (data: string) => {
      output += data;
      return true;
    },
    end: (data?: string) => {
      if (data) output += data;
    },
  } as unknown as ServerResponse;

  return {
    res,
    getOutput: () => output,
    getStatusCode: () => statusCode,
    getHeaders: () => headers,
  };
}

describe('Slice 3: Contract Controller (Audit & Lifecycle API)', () => {
  const store = new InMemoryContractVersionStore();
  const lifecycleManager = new ContractLifecycleManager({ versionStore: store });
  const controller = new ContractController(lifecycleManager, store);

  it('handleAudit: tạo hồ sơ mới v1 và trả về báo cáo thẩm định thành công', async () => {
    const req = createMockRequest({
      title: 'Hợp đồng lao động Công nghệ ABC',
      category: 'labor',
      content: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐiều 1: Công việc kỹ sư phần mềm. Điều 2: Lương 20 triệu/tháng.',
      fileName: 'HDLD_ABC_v1.docx',
      fileType: 'docx',
    });
    const { res, getOutput, getStatusCode } = createMockResponse();

    await controller.handleAudit(req, res);

    expect(getStatusCode()).toBe(200);
    const json = JSON.parse(getOutput());
    expect(json.success).toBe(true);
    expect(json.data.document.id).toBeDefined();
    expect(json.data.version.versionNumber).toBe(1);
    expect(json.data.version.auditReport.safetyScore).toBeDefined();
  });

  it('handleAudit: trả về HTTP 409 Conflict khi cố tình tải lên trùng lặp mã hash SHA-256', async () => {
    // 1. Tạo bản thảo v1
    const content = 'Điều 1: Công việc. Điều 2: Lương 15 triệu.';
    const uploadV1 = await lifecycleManager.uploadAndAudit({
      title: 'Hợp đồng lao động mẫu test trùng',
      category: 'labor',
      fileBuffer: content,
      fileName: 'v1.txt',
      fileType: 'txt',
    });

    // 2. Thử tải lại đúng nội dung content đó trên cùng documentId
    const req = createMockRequest({
      documentId: uploadV1.document.id,
      content,
      fileName: 'v1_duplicate.txt',
      fileType: 'txt',
    });
    const { res, getOutput, getStatusCode } = createMockResponse();

    await controller.handleAudit(req, res);

    expect(getStatusCode()).toBe(409);
    const json = JSON.parse(getOutput());
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('DUPLICATE_CONTENT_ERROR');
  });

  it('handleListVersions: trả về danh sách lịch sử các phiên bản theo documentId', async () => {
    const doc = await store.createDocument('Hợp đồng thuê nhà XYZ', 'rental');
    await store.addVersion(doc.id, {
      fileName: 'Thue_v1.txt',
      fileType: 'txt',
      contentHash: 'hash-test-1',
      cleanedText: 'Thảo 1',
      auditReport: {} as any,
    });
    await store.addVersion(doc.id, {
      fileName: 'Thue_v2.txt',
      fileType: 'txt',
      contentHash: 'hash-test-2',
      cleanedText: 'Thảo 2',
      auditReport: {} as any,
    });

    const req = createMockRequest(null, `/api/v1/contracts/versions?documentId=${doc.id}`, 'GET');
    const { res, getOutput, getStatusCode } = createMockResponse();

    await controller.handleListVersions(req, res);

    expect(getStatusCode()).toBe(200);
    const json = JSON.parse(getOutput());
    expect(json.success).toBe(true);
    expect(json.data.totalVersions).toBe(2);
    expect(json.data.versions[0].fileName).toBe('Thue_v1.txt');
    expect(json.data.versions[1].fileName).toBe('Thue_v2.txt');
  });
});
