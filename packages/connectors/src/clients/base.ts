export class BaseConnector {
  readonly name: string;
  readonly baseUrl: string;
  protected timeout: number;
  protected degradedMode: boolean;

  constructor(name: string, baseUrl: string, timeout = 30000) {
    this.name = name;
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.degradedMode = false;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(this.baseUrl, { signal: AbortSignal.timeout(5000) });
      return res.ok;
    } catch {
      return false;
    }
  }

  protected async request<T>(method: string, path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${this.name} ${method} ${path} failed: ${res.status} ${text}`);
      }
      return res.json() as Promise<T>;
    } catch (error) {
      if (!this.degradedMode) {
        console.warn(`[${this.name}] Service unavailable, entering degraded mode:`, (error as Error).message);
        this.degradedMode = true;
      }
      throw error;
    }
  }

  protected async requestGraceful<T>(method: string, path: string, fallback: T, body?: unknown, headers?: Record<string, string>): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.timeout),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${this.name} ${method} ${path} failed: ${res.status} ${text}`);
      }
      this.degradedMode = false;
      return res.json() as Promise<T>;
    } catch (error) {
      if (!this.degradedMode) {
        console.warn(`[${this.name}] Service unavailable, using fallback:`, (error as Error).message);
        this.degradedMode = true;
      }
      return fallback;
    }
  }
}
