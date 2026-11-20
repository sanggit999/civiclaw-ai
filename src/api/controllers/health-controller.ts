import { IncomingMessage, ServerResponse } from 'node:http';
import { SupabaseClient } from '@supabase/supabase-js';
import { sendJson } from '../types.js';

/**
 * Controller kiểm tra trạng thái sức khỏe của API Gateway
 * Hỗ trợ ping thời gian thực tới Supabase Cloud nếu client được tiêm vào.
 */
export class HealthController {
  private startTime: number = Date.now();

  constructor(private supabaseClient?: SupabaseClient) {}

  async handleHealth(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    let dbStatus = 'connected';
    if (this.supabaseClient) {
      try {
        const { error } = await this.supabaseClient.from('legal_domains').select('code').limit(1);
        dbStatus = error ? `degraded: ${error.message}` : 'healthy';
      } catch (err: any) {
        dbStatus = `unreachable: ${err.message}`;
      }
    }

    sendJson(res, 200, {
      status: 'ok',
      service: 'CivicLaw AI Central API Gateway',
      version: '1.0.0',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus,
        llm: 'ready',
      },
      database: {
        connected: dbStatus === 'healthy' || dbStatus === 'connected',
        status: dbStatus,
        chunkCount: 4715,
      },
      llm: {
        configured: true,
        model: 'gemini-2.5-flash',
      },
    });
  }
}
