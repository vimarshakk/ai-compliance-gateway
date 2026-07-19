export interface AcgApiClientOptions {
  adminUrl?: string;
  gatewayUrl?: string;
  apiKey?: string;
  timeout?: number;
}

export interface ScoreRecord {
  id: string;
  organizationId: string;
  projectId?: string;
  overallScore: number;
  maxScore: number;
  percentage: number;
  breakdown: Record<string, unknown>;
  pack?: string;
  scanResult: Record<string, unknown>;
  bomResult: Record<string, unknown>;
  createdAt: string;
}

export interface ProviderRecord {
  id: string;
  slug: string;
  name: string;
  company: string;
  baseUrl: string;
  apiStyle: string;
  complianceFeatures: Record<string, boolean>;
  supportedRegions: string[];
  maxTokens: number;
  models: string[];
  certified: boolean;
  certifiedAt?: string;
}

export interface ScanResponse {
  rootPath: string;
  filesScanned: number;
  findings: Array<{
    type: string;
    severity: string;
    file: string;
    line?: number;
    message: string;
    detail?: string;
  }>;
  summary: {
    sdks: string[];
    promptsFound: number;
    secretsFound: number;
    envVarsFound: number;
    configsFound: number;
    modelRefs: string[];
    riskScore: number;
  };
}

export interface BomResponse {
  rootPath: string;
  generatedAt: string;
  entries: Array<{
    category: string;
    name: string;
    version?: string;
    source?: string;
    confidence: string;
  }>;
  categories: Record<string, Array<{
    category: string;
    name: string;
    version?: string;
    source?: string;
    confidence: string;
  }>>;
}

export class AcgApiClient {
  private adminUrl?: string;
  private gatewayUrl?: string;
  private apiKey?: string;
  private timeout: number;

  constructor(options: AcgApiClientOptions = {}) {
    this.adminUrl = options.adminUrl?.replace(/\/$/, '');
    this.gatewayUrl = options.gatewayUrl?.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeout = options.timeout ?? 10000;
  }

  private async request<T>(url: string, method = 'GET', body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['X-Api-Key'] = this.apiKey;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      return res.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }

  async healthCheck(baseUrl: string): Promise<boolean> {
    try {
      await this.request<{ status: string }>(`${baseUrl}/health`);
      return true;
    } catch {
      return false;
    }
  }

  async scanProject(path: string): Promise<ScanResponse> {
    if (!this.adminUrl) throw new Error('Admin URL not configured. Set --admin-url or ACG_ADMIN_URL');
    return this.request<ScanResponse>(`${this.adminUrl}/v1/tools/scan`, 'POST', { path });
  }

  async generateBom(path: string): Promise<BomResponse> {
    if (!this.adminUrl) throw new Error('Admin URL not configured. Set --admin-url or ACG_ADMIN_URL');
    return this.request<BomResponse>(`${this.adminUrl}/v1/tools/bom`, 'POST', { path });
  }

  async listScores(organizationId?: string): Promise<{ scores: ScoreRecord[]; total: number }> {
    if (!this.adminUrl) throw new Error('Admin URL not configured');
    const params = organizationId ? `?organizationId=${organizationId}` : '';
    return this.request<{ scores: ScoreRecord[]; total: number }>(`${this.adminUrl}/v1/compliance/scores${params}`);
  }

  async createScore(score: Omit<ScoreRecord, 'id' | 'createdAt'>): Promise<ScoreRecord> {
    if (!this.adminUrl) throw new Error('Admin URL not configured');
    return this.request<ScoreRecord>(`${this.adminUrl}/v1/compliance/scores`, 'POST', score);
  }

  async listProviders(certified?: boolean): Promise<{ providers: ProviderRecord[]; total: number }> {
    if (!this.adminUrl) throw new Error('Admin URL not configured');
    const params = certified !== undefined ? `?certified=${certified}` : '';
    return this.request<{ providers: ProviderRecord[]; total: number }>(`${this.adminUrl}/v1/providers${params}`);
  }

  async getProvider(id: string): Promise<ProviderRecord> {
    if (!this.adminUrl) throw new Error('Admin URL not configured');
    return this.request<ProviderRecord>(`${this.adminUrl}/v1/providers/${id}`);
  }

  async listPacks(): Promise<{ packs: unknown[]; total: number }> {
    if (!this.adminUrl) throw new Error('Admin URL not configured');
    return this.request<{ packs: unknown[]; total: number }>(`${this.adminUrl}/v1/tools/packs`);
  }
}

export function createClient(opts: { adminUrl?: string; gatewayUrl?: string; apiKey?: string }): AcgApiClient {
  return new AcgApiClient({
    adminUrl: opts.adminUrl || process.env.ACG_ADMIN_URL || 'http://localhost:3002',
    gatewayUrl: opts.gatewayUrl || process.env.ACG_GATEWAY_URL || 'http://localhost:3000',
    apiKey: opts.apiKey || process.env.ACG_API_KEY,
  });
}
