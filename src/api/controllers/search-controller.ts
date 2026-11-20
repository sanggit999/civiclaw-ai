import { IncomingMessage, ServerResponse } from 'node:http';
import { LegalSearchEngine } from '../../search/engine.js';
import { LegalDomain } from '../../ingestion/types.js';
import { parseJsonBody, sendError, sendJson } from '../types.js';

export interface SearchRequestBody {
  query: string;
  domain?: string;
  limit?: number;
}

/**
 * Controller xử lý tra cứu nhanh điều luật
 */
export class SearchController {
  constructor(private searchEngine: LegalSearchEngine) {}

  /**
   * Endpoint: POST /api/v1/search
   */
  async handleSearch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await parseJsonBody<SearchRequestBody>(req);

    if (!body || !body.query || !body.query.trim()) {
      sendError(res, 400, 'BAD_REQUEST', 'Trường "query" không được để trống.');
      return;
    }

    try {
      const result = this.searchEngine.search({
        text: body.query.trim(),
        domain: body.domain as LegalDomain,
        limit: body.limit || 5,
      });

      sendJson(res, 200, {
        success: true,
        data: result,
      });
    } catch (err: any) {
      sendError(res, 500, 'SEARCH_ENGINE_ERROR', err.message);
    }
  }
}
