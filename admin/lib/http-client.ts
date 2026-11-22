/**
 * CivicLaw AI - Enterprise Centralized HTTP Client
 * Root HTTP client duy nhất cho toàn bộ Web Admin.
 * Tích hợp:
 * - Request & Response Interceptors
 * - Centralized Error Handling & HttpError class
 * - 401 Auto-redirect về /login?redirect=...
 * - Configurable AbortController Timeout (mặc định 15s)
 * - Tự động JSON serialization & query parameters formatting
 * - Hỗ trợ đầy đủ các methods: GET, POST, PUT, PATCH, DELETE
 */

export interface HttpRequestConfig extends Omit<RequestInit, 'body'> {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  params?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  skipAuthRedirect?: boolean;
  baseURL?: string;
}

export class HttpError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly data: unknown;
  readonly url: string;
  readonly isTimeout: boolean;
  readonly isNetworkError: boolean;

  constructor(options: {
    message: string;
    status?: number;
    statusText?: string;
    data?: unknown;
    url?: string;
    isTimeout?: boolean;
    isNetworkError?: boolean;
  }) {
    super(options.message);
    this.name = 'HttpError';
    this.status = options.status ?? 0;
    this.statusText = options.statusText ?? '';
    this.data = options.data;
    this.url = options.url ?? '';
    this.isTimeout = options.isTimeout ?? false;
    this.isNetworkError = options.isNetworkError ?? false;
  }
}

export type RequestInterceptor = (
  config: HttpRequestConfig
) => HttpRequestConfig | Promise<HttpRequestConfig>;

export type ResponseInterceptor = (
  response: Response,
  config: HttpRequestConfig
) => Response | Promise<Response>;

export type ErrorInterceptor = (
  error: HttpError,
  config: HttpRequestConfig
) => unknown | Promise<unknown>;

export class HttpClient {
  private defaultTimeoutMs: number = 15000;
  private defaultBaseURL: string = '';
  private defaultHeaders: Record<string, string> = {
    'Accept': 'application/json',
  };

  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(options?: {
    baseURL?: string;
    timeoutMs?: number;
    headers?: Record<string, string>;
  }) {
    if (options?.baseURL) this.defaultBaseURL = options.baseURL;
    if (options?.timeoutMs) this.defaultTimeoutMs = options.timeoutMs;
    if (options?.headers) {
      this.defaultHeaders = { ...this.defaultHeaders, ...options.headers };
    }

    // Đăng ký default interceptor xử lý 401 Auto-redirect
    this.addResponseInterceptor(async (response, config) => {
      if (response.status === 401 && !config.skipAuthRedirect) {
        this.handleUnauthorizedRedirect();
      }
      return response;
    });
  }

  /**
   * Đăng ký Request Interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    return () => {
      this.requestInterceptors = this.requestInterceptors.filter((i) => i !== interceptor);
    };
  }

  /**
   * Đăng ký Response Interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      this.responseInterceptors = this.responseInterceptors.filter((i) => i !== interceptor);
    };
  }

  /**
   * Đăng ký Error Interceptor
   */
  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      this.errorInterceptors = this.errorInterceptors.filter((i) => i !== interceptor);
    };
  }

  /**
   * Xử lý chuyển hướng tự động khi nhận mã 401 Unauthorized
   */
  private handleUnauthorizedRedirect() {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        const redirectParam = encodeURIComponent(currentPath + window.location.search);
        window.location.href = `/login?redirect=${redirectParam}`;
      }
    }
  }

  /**
   * Định dạng Query Parameters vào URL
   */
  private buildUrl(url: string, params?: Record<string, string | number | boolean | undefined | null>, baseURL?: string): string {
    const base = baseURL || this.defaultBaseURL;
    let fullUrl = url;

    if (base && !url.startsWith('http://') && !url.startsWith('https://')) {
      const trimmedBase = base.endsWith('/') ? base.slice(0, -1) : base;
      const trimmedUrl = url.startsWith('/') ? url : `/${url}`;
      fullUrl = `${trimmedBase}${trimmedUrl}`;
    }

    if (!params || Object.keys(params).length === 0) {
      return fullUrl;
    }

    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }

    const queryString = searchParams.toString();
    if (!queryString) return fullUrl;

    const separator = fullUrl.includes('?') ? '&' : '?';
    return `${fullUrl}${separator}${queryString}`;
  }

  /**
   * Thực hiện HTTP Request tổng quát
   */
  async request<T = unknown>(initialConfig: HttpRequestConfig): Promise<T> {
    let config: HttpRequestConfig = {
      ...initialConfig,
      headers: {
        ...this.defaultHeaders,
        ...(initialConfig.headers || {}),
      },
      timeoutMs: initialConfig.timeoutMs ?? this.defaultTimeoutMs,
    };

    // Chạy chuỗi Request Interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    const method = (config.method || 'GET').toUpperCase();
    const finalUrl = this.buildUrl(config.url || '', config.params, config.baseURL);

    // Xử lý Body
    let bodyPayload: BodyInit | undefined = undefined;
    if (config.body !== undefined && config.body !== null && method !== 'GET' && method !== 'HEAD') {
      if (
        typeof config.body === 'string' ||
        config.body instanceof FormData ||
        config.body instanceof Blob ||
        config.body instanceof URLSearchParams
      ) {
        bodyPayload = config.body as BodyInit;
      } else {
        bodyPayload = JSON.stringify(config.body);
        if (!config.headers?.['Content-Type'] && !config.headers?.['content-type']) {
          config.headers = {
            ...config.headers,
            'Content-Type': 'application/json',
          };
        }
      }
    }

    // Thiết lập AbortController Timeout
    const controller = new AbortController();
    const timeoutMs = config.timeoutMs ?? this.defaultTimeoutMs;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
    }

    // Kết hợp abort signal ngoài nếu có
    if (config.signal) {
      config.signal.addEventListener('abort', () => {
        controller.abort();
      });
    }

    try {
      const fetchOptions: RequestInit = {
        ...config,
        method,
        headers: config.headers,
        body: bodyPayload,
        signal: controller.signal,
      };

      let response = await fetch(finalUrl, fetchOptions);

      if (timeoutId) clearTimeout(timeoutId);

      // Chạy chuỗi Response Interceptors
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response, config);
      }

      // Xử lý lỗi HTTP status >= 400
      if (!response.ok) {
        let errorData: unknown = null;
        try {
          if (typeof response.json === 'function') {
            errorData = await response.json();
          } else if (typeof response.text === 'function') {
            errorData = await response.text();
          }
        } catch {
          errorData = null;
        }

        const httpError = new HttpError({
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          data: errorData,
          url: finalUrl,
        });

        // Chạy Error Interceptors
        for (const interceptor of this.errorInterceptors) {
          const intercepted = await interceptor(httpError, config);
          if (intercepted !== undefined) return intercepted as T;
        }

        throw httpError;
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      // Ưu tiên parse JSON nếu có thể
      if (typeof response.json === 'function') {
        try {
          return (await response.json()) as T;
        } catch {
          // Không phải JSON, thử đọc text
        }
      }

      if (typeof response.text === 'function') {
        return (await response.text()) as unknown as T;
      }

      return response as unknown as T;
    } catch (err: unknown) {
      if (timeoutId) clearTimeout(timeoutId);

      if (err instanceof HttpError) {
        throw err;
      }

      const isAbort = (err as Error)?.name === 'AbortError' || controller.signal.aborted;
      const httpError = new HttpError({
        message: isAbort ? `Request timeout after ${timeoutMs}ms` : (err as Error)?.message || 'Network error',
        url: finalUrl,
        isTimeout: isAbort,
        isNetworkError: !isAbort,
      });

      // Chạy Error Interceptors
      for (const interceptor of this.errorInterceptors) {
        const intercepted = await interceptor(httpError, config);
        if (intercepted !== undefined) return intercepted as T;
      }

      throw httpError;
    }
  }

  // --- Convenience Typed Methods ---

  get<T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'GET' });
  }

  post<T = unknown>(url: string, body?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'body'>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'POST', body });
  }

  put<T = unknown>(url: string, body?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'body'>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'PUT', body });
  }

  patch<T = unknown>(url: string, body?: unknown, config?: Omit<HttpRequestConfig, 'url' | 'method' | 'body'>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'PATCH', body });
  }

  delete<T = unknown>(url: string, config?: Omit<HttpRequestConfig, 'url' | 'method'>): Promise<T> {
    return this.request<T>({ ...config, url, method: 'DELETE' });
  }
}

/**
 * Singleton instance của HttpClient cho toàn bộ ứng dụng
 */
export const httpClient = new HttpClient();
