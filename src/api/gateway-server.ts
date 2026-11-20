import { createServer, Server, IncomingMessage, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { GatewayConfig } from './types.js';
import { HttpRouter } from './router.js';
import { HealthController } from './controllers/health-controller.js';

/**
 * Máy Chủ API Gateway Trung Tâm (Central API Gateway Server)
 * Đóng gói máy chủ HTTP thuần Node.js, quản lý vòng đời và định tuyến request.
 */
export class ApiGatewayServer {
  private server: Server | null = null;
  private router: HttpRouter;
  private port: number;
  private host: string;

  constructor(config?: Partial<GatewayConfig>, router?: HttpRouter) {
    this.port = config?.port !== undefined ? config.port : (Number(process.env.PORT) || 3000);
    this.host = config?.host || process.env.HOST || '0.0.0.0';
    this.router = router || new HttpRouter(config);

    // Mặc định đăng ký endpoint /api/v1/health nếu chưa có
    if (!this.router.lookup('GET', '/api/v1/health')) {
      const healthController = new HealthController();
      this.router.register('GET', '/api/v1/health', (req, res) =>
        healthController.handleHealth(req, res)
      );
    }
  }

  /**
   * Lấy router hiện tại để đăng ký thêm controllers
   */
  getRouter(): HttpRouter {
    return this.router;
  }

  /**
   * Khởi động máy chủ HTTP
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer((req: IncomingMessage, res: ServerResponse) => {
        this.router.handle(req, res);
      });

      this.server.on('error', (err) => {
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        const addr = this.server?.address() as AddressInfo;
        if (addr) {
          this.port = addr.port;
        }
        resolve();
      });
    });
  }

  /**
   * Dừng máy chủ an toàn (Graceful Shutdown)
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          this.server = null;
          resolve();
        }
      });
    });
  }

  /**
   * Lấy cổng đang lắng nghe thực tế (hữu ích khi dùng port: 0)
   */
  getPort(): number {
    return this.port;
  }
}
