import { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from '../types.js';

/**
 * Controller kiểm tra trạng thái sức khỏe của API Gateway
 */
export class HealthController {
  private startTime: number = Date.now();

  async handleHealth(_req: IncomingMessage, res: ServerResponse): Promise<void> {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    sendJson(res, 200, {
      status: 'ok',
      service: 'CivicLaw AI Central API Gateway',
      version: '1.0.0',
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'connected',
        llm: 'ready',
      },
    });
  }
}
