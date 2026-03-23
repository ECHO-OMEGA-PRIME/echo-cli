/**
 * Echo SDK Gateway HTTP Client — All API calls go through here.
 * Handles auth, retries, envelope unwrapping, error formatting.
 */
import { getGatewayUrl, requireApiKey } from './config.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: { message: string; code: string } | null;
  meta: { ts: string; version: string; name: string };
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  timeout?: number;
}

export class EchoClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || getGatewayUrl();
    this.apiKey = apiKey || requireApiKey();
  }

  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, timeout = 30000 } = opts;
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = {
      'X-Echo-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };

    const fetchOpts: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    };
    if (body && method !== 'GET') {
      fetchOpts.body = JSON.stringify(body);
    }

    try {
      const resp = await fetch(url.toString(), fetchOpts);
      clearTimeout(timer);
      const json = await resp.json() as ApiResponse<T>;

      if (!resp.ok || !json.success) {
        const msg = json.error?.message || `HTTP ${resp.status}`;
        const code = json.error?.code || `HTTP_${resp.status}`;
        throw new EchoApiError(msg, code, resp.status);
      }

      return json.data as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof EchoApiError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new EchoApiError('Request timed out', 'TIMEOUT', 408);
      }
      throw new EchoApiError(
        err instanceof Error ? err.message : 'Unknown error',
        'NETWORK_ERROR',
        0
      );
    }
  }

  // Engine endpoints
  async engineQuery(engineId: string, query: string, mode = 'FAST') {
    return this.request('/engine/query', {
      method: 'POST',
      body: { engine_id: engineId, query, mode },
    });
  }

  async engineDomainQuery(domain: string, query: string, mode = 'FAST') {
    return this.request('/engine/domain', {
      method: 'POST',
      body: { domain, query, mode },
    });
  }

  async engineCrossDomain(query: string, limit = 10, mode = 'FAST') {
    return this.request('/engine/cross-domain', {
      method: 'POST',
      body: { query, limit, mode },
    });
  }

  async engineSearch(query: string, limit = 10) {
    return this.request('/engine/search', {
      params: { q: query, limit: String(limit) },
    });
  }

  async engineDomains() {
    return this.request('/engine/domains');
  }

  async engineStats() {
    return this.request('/engine/stats');
  }

  async engineGet(engineId: string) {
    return this.request(`/engine/${engineId}`);
  }

  // Knowledge endpoints
  async knowledgeSearch(query: string, limit = 5) {
    return this.request('/knowledge/search', {
      method: 'POST',
      body: { query, limit },
    });
  }

  async knowledgeCategories() {
    return this.request('/knowledge/categories');
  }

  // Brain endpoints
  async brainIngest(content: string, importance = 5, tags: string[] = []) {
    return this.request('/brain/ingest', {
      method: 'POST',
      body: { content, importance, tags },
    });
  }

  async brainSearch(query: string, limit = 10) {
    return this.request('/brain/search', {
      method: 'POST',
      body: { query, limit },
    });
  }

  async brainRecall(key: string) {
    return this.request('/brain/recall', {
      params: { key },
    });
  }

  async brainStats() {
    return this.request('/brain/stats');
  }

  async brainContext(instanceId: string, query?: string) {
    return this.request('/brain/context', {
      method: 'POST',
      body: { instance_id: instanceId, ...(query ? { query } : {}) },
    });
  }

  async brainHeartbeat(instanceId: string, currentTask?: string) {
    return this.request('/brain/heartbeat', {
      method: 'POST',
      body: { instance_id: instanceId, ...(currentTask ? { current_task: currentTask } : {}) },
    });
  }

  // Vault endpoint
  async vaultGet(service: string) {
    return this.request('/vault/get', {
      params: { service },
    });
  }

  // Worker proxy
  async workerCall(worker: string, path: string, method = 'GET', body?: Record<string, unknown>) {
    return this.request('/worker/call', {
      method: 'POST',
      body: { worker, path, method, body },
    });
  }

  // Doctrine endpoints
  async doctrineGenerate(domain: string, topic: string, provider?: string) {
    return this.request('/doctrine/generate', {
      method: 'POST',
      body: { domain, topic, ...(provider ? { provider } : {}) },
      timeout: 60000,
    });
  }

  async doctrineList(domain?: string) {
    return this.request('/doctrine/list', {
      params: domain ? { domain } : {},
    });
  }

  async doctrineProviders() {
    return this.request('/doctrine/providers');
  }

  // Chat endpoints
  async chat(message: string, personality?: string) {
    return this.request('/chat', {
      method: 'POST',
      body: { message, ...(personality ? { personality } : {}) },
      timeout: 60000,
    });
  }

  // Unified search (5-layer: KV → EmbedCache → Vectorize+FTS5 → Reranker → GraphRAG)
  async search(query: string, sources?: string[], limit = 10) {
    return this.request('/search', {
      method: 'POST',
      body: { query, ...(sources ? { sources } : {}), limit },
    });
  }

  async searchStats() {
    return this.request('/search/stats');
  }

  // Tool Discovery endpoints (via Worker proxy)
  async toolSearch(query: string, category?: string, limit = 10) {
    return this.workerCall('echo-tool-discovery', '/search', 'GET', undefined)
      .catch(() => this.request('/worker/call', {
        method: 'POST',
        body: { worker: 'echo-tool-discovery', path: `/search?q=${encodeURIComponent(query)}&limit=${limit}${category ? `&category=${category}` : ''}`, method: 'GET' },
      }));
  }

  async toolList(category?: string) {
    const path = category ? `/tools?category=${category}` : '/tools';
    return this.workerCall('echo-tool-discovery', path, 'GET');
  }

  async toolChains() {
    return this.workerCall('echo-tool-discovery', '/chains', 'GET');
  }

  async toolRecommend(task: string) {
    return this.workerCall('echo-tool-discovery', `/recommend?task=${encodeURIComponent(task)}`, 'GET');
  }

  async toolStats() {
    return this.workerCall('echo-tool-discovery', '/stats', 'GET');
  }

  // Bot Factory endpoints
  async botTemplates() {
    return this.workerCall('echo-bot-factory', '/templates', 'GET');
  }

  async botDeploy(templateId: string, config: Record<string, unknown>) {
    return this.workerCall('echo-bot-factory', '/deploy', 'POST', { template_id: templateId, config });
  }

  async botList() {
    return this.workerCall('echo-bot-factory', '/deployments', 'GET');
  }

  async botLogs(deploymentId: string) {
    return this.workerCall('echo-bot-factory', `/deployments/${deploymentId}/logs`, 'GET');
  }

  // Scraper Orchestrator endpoints
  async scraperTemplates() {
    return this.workerCall('echo-scraper-orchestrator', '/templates', 'GET');
  }

  async scraperRun(templateId: string, params: Record<string, unknown>) {
    return this.workerCall('echo-scraper-orchestrator', '/jobs', 'POST', { template_id: templateId, params });
  }

  async scraperJobs(status?: string) {
    const path = status ? `/jobs?status=${status}` : '/jobs';
    return this.workerCall('echo-scraper-orchestrator', path, 'GET');
  }

  async scraperResults(jobId: string) {
    return this.workerCall('echo-scraper-orchestrator', `/jobs/${jobId}/results`, 'GET');
  }

  // Dashboard endpoints
  async dashboardUsage(period?: string) {
    const path = period ? `/usage?period=${period}` : '/usage';
    return this.workerCall('echo-sdk-dashboard', path, 'GET');
  }

  async dashboardTenants() {
    return this.workerCall('echo-sdk-dashboard', '/tenants', 'GET');
  }

  async dashboardAudit(limit = 50) {
    return this.workerCall('echo-sdk-dashboard', `/audit?limit=${limit}`, 'GET');
  }

  // Auth endpoints
  async authCreateKey(name: string, plan?: string) {
    return this.request('/auth/keys', {
      method: 'POST',
      body: { name, plan: plan || 'free' },
    });
  }

  async authListKeys() {
    return this.request('/auth/keys');
  }

  async authWhoami() {
    return this.request('/auth/whoami');
  }

  // Forge endpoints
  async forgeCreate(type: string, spec: string) {
    return this.request('/forge/create', {
      method: 'POST',
      body: { type, spec },
      timeout: 120000,
    });
  }

  async forgeStatus(buildId: string) {
    return this.request('/forge/status', {
      params: { build_id: buildId },
    });
  }

  async forgeList() {
    return this.request('/forge/builds');
  }

  // LLM endpoints
  async llmQuery(prompt: string, provider?: string, model?: string) {
    return this.request('/llm/query', {
      method: 'POST',
      body: { prompt, ...(provider ? { provider } : {}), ...(model ? { model } : {}) },
      timeout: 60000,
    });
  }

  async llmProviders() {
    return this.request('/llm/providers');
  }

  async llmModels() {
    return this.request('/llm/models');
  }

  async llmStatus() {
    return this.request('/llm/status');
  }

  // AGI endpoints
  async agiStatus() {
    return this.request('/agi/status');
  }

  async agiLearningHistory(limit = 20) {
    return this.request('/agi/learning-history', {
      params: { limit: String(limit) },
    });
  }

  // Compose endpoints
  async composeCreate(engines: string[], name?: string) {
    return this.request('/compose/create', {
      method: 'POST',
      body: { engines, ...(name ? { name } : {}) },
    });
  }

  async composeList() {
    return this.request('/compose/list');
  }

  async composeInfo(compoundId: string) {
    return this.request('/compose/info', {
      params: { id: compoundId },
    });
  }

  // Webhook endpoints
  async webhooksList() {
    return this.request('/webhooks');
  }

  async webhooksCreate(url: string, events: string[]) {
    return this.request('/webhooks', {
      method: 'POST',
      body: { url, events },
    });
  }

  async webhooksDelete(webhookId: string) {
    return this.request(`/webhooks/${webhookId}`, {
      method: 'DELETE',
    });
  }

  async webhooksTest(webhookId: string) {
    return this.request(`/webhooks/${webhookId}/test`, {
      method: 'POST',
    });
  }

  // Health
  async health() {
    return this.request('/health');
  }

  /** Public request — no auth required (for signup, plans) */
  async publicRequest<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, timeout = 30000 } = opts;
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const fetchOpts: RequestInit = { method, headers, signal: controller.signal };
    if (body && method !== 'GET') fetchOpts.body = JSON.stringify(body);

    try {
      const resp = await fetch(url.toString(), fetchOpts);
      clearTimeout(timer);
      const json = await resp.json() as ApiResponse<T>;
      if (!resp.ok || !json.success) {
        throw new EchoApiError(json.error?.message || `HTTP ${resp.status}`, json.error?.code || `HTTP_${resp.status}`, resp.status);
      }
      return json.data as T;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof EchoApiError) throw err;
      throw new EchoApiError(err instanceof Error ? err.message : 'Unknown error', 'NETWORK_ERROR', 0);
    }
  }
}

export class EchoApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'EchoApiError';
    this.code = code;
    this.status = status;
  }
}
