import { IncomingMessage, ServerResponse } from 'node:http';
import { ContractLifecycleManager } from '../../contract/contract-lifecycle-manager.js';
import { DuplicateContentError, IContractVersionStore } from '../../contract/version-types.js';
import { parseJsonBody, sendError, sendJson } from '../types.js';

export interface AuditContractRequestBody {
  documentId?: string;
  title?: string;
  category?: 'labor' | 'rental' | 'civil_loan' | 'general_civil';
  content: string;
  fileName?: string;
  fileType?: string;
}

/**
 * Controller xử lý thẩm định hợp đồng, quản lý phiên bản và lịch sử đối soát
 */
export class ContractController {
  constructor(
    private lifecycleManager: ContractLifecycleManager,
    private versionStore?: IContractVersionStore
  ) {}

  /**
   * Endpoint: POST /api/v1/contracts/audit
   */
  async handleAudit(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await parseJsonBody<AuditContractRequestBody>(req);

    if (!body || !body.content || !body.content.trim()) {
      sendError(res, 400, 'BAD_REQUEST', 'Trường "content" (nội dung hợp đồng) không được để trống.');
      return;
    }

    try {
      const result = await this.lifecycleManager.uploadAndAudit({
        documentId: body.documentId,
        title: body.title,
        category: body.category,
        fileBuffer: body.content,
        fileName: body.fileName || 'contract.txt',
        fileType: body.fileType || 'txt',
      });

      sendJson(res, 200, {
        success: true,
        data: result,
      });
    } catch (err: any) {
      if (err instanceof DuplicateContentError) {
        sendError(
          res,
          409,
          'DUPLICATE_CONTENT_ERROR',
          err.message || 'Nội dung tài liệu trùng khớp hoàn toàn với phiên bản trước đó.'
        );
        return;
      }

      sendError(res, 500, 'CONTRACT_AUDIT_ERROR', err.message || 'Lỗi thẩm định hợp đồng');
    }
  }

  /**
   * Endpoint: GET /api/v1/contracts/versions?documentId=...
   */
  async handleListVersions(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url || '/', 'http://localhost');
    const documentId = url.searchParams.get('documentId');

    if (!documentId) {
      sendError(res, 400, 'BAD_REQUEST', 'Tham số truy vấn "documentId" là bắt buộc.');
      return;
    }

    if (!this.versionStore) {
      sendError(res, 501, 'NOT_IMPLEMENTED', 'VersionStore chưa được cấu hình cho Controller này.');
      return;
    }

    try {
      const versions = await this.versionStore.listVersions(documentId);
      sendJson(res, 200, {
        success: true,
        data: {
          documentId,
          totalVersions: versions.length,
          versions,
        },
      });
    } catch (err: any) {
      sendError(res, 500, 'LIST_VERSIONS_ERROR', err.message);
    }
  }
}
