import { timingSafeEqual } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { SupabaseClient } from '@supabase/supabase-js';
import { loadSearchSettingsFromSupabase, SupabaseFromLike } from '../../search/config-loader.js';
import { LegalSearchEngine } from '../../search/engine.js';
import { SearchMode } from '../../search/types.js';
import { SupabaseLegalRepository } from '../../storage/supabase-legal-repo.js';
import { parseJsonBody, sendError, sendJson } from '../types.js';

export interface SearchRequestBody {
  query?: string;
  domain?: string;
  docNumber?: string;
  limit?: number;
  page?: number;
  mode?: SearchMode;
}

function isTokenEqual(provided: string | string[] | undefined, expected: string): boolean {
  if (typeof provided !== 'string' || !provided) return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Controller xử lý tra cứu điều luật & danh mục lĩnh vực pháp lý
 */
export class SearchController {
  private legalRepo?: SupabaseLegalRepository;
  private configLoaderClient?: SupabaseFromLike;
  private adminSecret?: string;

  constructor(
    private searchEngine: LegalSearchEngine,
    supabaseClient?: SupabaseClient | SupabaseFromLike,
    adminSecret?: string
  ) {
    this.configLoaderClient = supabaseClient;
    this.adminSecret = adminSecret ?? process.env.GATEWAY_ADMIN_SECRET;
    if (supabaseClient && typeof (supabaseClient as SupabaseClient).rpc === 'function') {
      this.legalRepo = new SupabaseLegalRepository(supabaseClient as SupabaseClient);
    }
  }

  /**
   * Endpoint: POST /api/v1/search
   * Hỗ trợ cả tra cứu từ khóa, mô tả tranh chấp dài và duyệt kho (Browse Mode khi query rỗng ở mode 'admin')
   */
  async handleSearch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await parseJsonBody<SearchRequestBody>(req);
    if (!body || typeof body !== 'object') {
      sendError(res, 400, 'BAD_REQUEST', 'Payload JSON không hợp lệ.');
      return;
    }

    if (body.query !== undefined && typeof body.query !== 'string') {
      sendError(res, 400, 'BAD_REQUEST', 'Trường "query" phải là chuỗi ký tự.');
      return;
    }
    if (body.domain !== undefined && body.domain !== null && typeof body.domain !== 'string') {
      sendError(res, 400, 'BAD_REQUEST', 'Trường "domain" phải là chuỗi ký tự.');
      return;
    }
    if (body.docNumber !== undefined && body.docNumber !== null && typeof body.docNumber !== 'string') {
      sendError(res, 400, 'BAD_REQUEST', 'Trường "docNumber" phải là chuỗi ký tự.');
      return;
    }
    if (body.mode !== undefined && body.mode !== 'citizen' && body.mode !== 'admin') {
      sendError(res, 400, 'BAD_REQUEST', 'Trường "mode" chỉ chấp nhận "citizen" hoặc "admin".');
      return;
    }

    const queryText = (body.query ?? '').trim();
    const mode: SearchMode = body.mode || 'citizen';

    if (mode !== 'admin' && !queryText) {
      sendError(res, 400, 'BAD_REQUEST', 'Trường "query" không được để trống.');
      return;
    }

    try {
      const result = this.searchEngine.search({
        text: queryText,
        domain: body.domain,
        docNumber: body.docNumber,
        limit: body.limit,
        page: body.page ?? 1,
        mode,
        skipGapLogging: mode === 'admin',
      });

      sendJson(res, 200, {
        success: true,
        data: result,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi không xác định tại Search Engine';
      sendError(res, 500, 'SEARCH_ENGINE_ERROR', message);
    }
  }

  /**
   * Endpoint: GET /api/v1/domains
   * Trả về danh mục lĩnh vực động kèm thống kê số lượng chunk & văn bản thực tế trong kho
   */
  async handleListDomains(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      let dbDomains: Awaited<ReturnType<SupabaseLegalRepository['getDomains']>> = [];
      if (this.legalRepo) {
        try {
          dbDomains = await this.legalRepo.getDomains();
        } catch {
          // Fallback an toàn về danh mục tổng hợp từ SearchEngine nếu Supabase tạm gián đoạn
          dbDomains = [];
        }
      }
      const domains = this.searchEngine.getDomainSummary(dbDomains);
      const totalChunks = domains.reduce((sum, item) => sum + item.chunkCount, 0);

      sendJson(res, 200, {
        success: true,
        data: {
          totalChunks,
          domains,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tổng hợp danh mục lĩnh vực';
      sendError(res, 500, 'DOMAINS_FETCH_ERROR', message);
    }
  }

  /**
   * Endpoint: POST /api/v1/search/reload-config
   * Nạp lại stop_words, search_weights, confidence_threshold, min_query_length từ Supabase system_configs
   */
  async handleReloadConfig(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (this.adminSecret && !isTokenEqual(req.headers['x-admin-token'], this.adminSecret)) {
      sendError(res, 401, 'UNAUTHORIZED', 'Thiếu hoặc sai x-admin-token.');
      return;
    }

    try {
      const loaded = await loadSearchSettingsFromSupabase(this.configLoaderClient);
      if (loaded.loadedKeys.length > 0) {
        this.searchEngine.updateConfig(loaded.config, loaded.stopWords);
      }

      sendJson(res, 200, {
        success: true,
        data: {
          reloaded: loaded.loadedKeys.length > 0,
          loadedKeys: loaded.loadedKeys,
          config: this.searchEngine.getConfig(),
          stopWordsCount: this.searchEngine.getStopWordsCount(),
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi nạp lại cấu hình hệ thống';
      sendError(res, 500, 'CONFIG_RELOAD_ERROR', message);
    }
  }
}
