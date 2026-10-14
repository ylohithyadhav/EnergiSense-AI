import {
  DatasetUploadResponse,
  TrainResponse,
  AnomalyDetectResponse,
  SHAPExplainResponse,
  AnalysisHistoryItem
} from '../types';

const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && (window.location.hostname.endsWith('web.app') || window.location.hostname.endsWith('firebaseapp.com'))
    ? 'https://energisense-ai.onrender.com'
    : 'http://127.0.0.1:8000');

export const API_BASE_URL = (RAW_API_BASE_URL || '').trim().replace(/\/+$/, '');

export type TokenProvider = (forceRefresh?: boolean) => Promise<string | null>;

let globalTokenProvider: TokenProvider | null = null;

export const setApiTokenProvider = (provider: TokenProvider | null) => {
  globalTokenProvider = provider;
};

class ApiService {
  private getHeaders(token: string | null = null, isJson = true): HeadersInit {
    const headers: Record<string, string> = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (!res.ok) {
      let errorMsg = `Server error: ${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (body.detail) {
          errorMsg = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
        }
      } catch (e) {
        // Fall back to status text
      }
      throw new Error(errorMsg);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Central execution wrapper that handles Authorization headers and performs
   * a single automatic retry with a force-refreshed Firebase ID token if an HTTP 401 occurs.
   */
  private async executeFetch<T>(
    inputUrl: string,
    init: RequestInit,
    token: string | null = null
  ): Promise<T> {
    let activeToken = token;
    if (!activeToken && globalTokenProvider) {
      activeToken = await globalTokenProvider(false);
    }

    const prepareHeaders = (tok: string | null): Headers => {
      const h = new Headers(init.headers || {});
      if (tok) {
        h.set('Authorization', `Bearer ${tok}`);
      }
      return h;
    };

    let res = await fetch(inputUrl, {
      ...init,
      headers: prepareHeaders(activeToken),
    });

    // If 401 Unauthorized, attempt a single retry with a fresh token
    if (res.status === 401 && globalTokenProvider) {
      try {
        const freshToken = await globalTokenProvider(true);
        if (freshToken) {
          res = await fetch(inputUrl, {
            ...init,
            headers: prepareHeaders(freshToken),
          });
        }
      } catch (refreshErr) {
        console.warn("Silent token refresh on 401 failed:", refreshErr);
      }
    }

    return this.handleResponse<T>(res);
  }

  async checkHealth(): Promise<{ status: string; service: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return this.handleResponse(res);
      }
      // If root /health returned non-200, test /api/status as fallback probe
      const statusRes = await fetch(`${API_BASE_URL}/api/status`, {
        headers: { 'Accept': 'application/json' }
      });
      if (statusRes.ok) {
        return { status: 'ok', service: 'EnergiSense AI API' };
      }
      return this.handleResponse(res);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error("Backend connection timed out (25s). If hosted on Render Free tier, the service may be spinning up from idle (cold start).");
      }
      if (err.name === 'TypeError' && (err.message?.includes('fetch') || err.message?.includes('NetworkError'))) {
        throw new Error("Unable to reach backend API. If the service is running, verify Render CORS allows https://energisense-ai.web.app.");
      }
      throw err;
    }
  }

  async getStatus(): Promise<{ status: string; environment: string; firebase_auth_enabled: boolean; firestore_enabled: boolean; max_upload_size_mb: number }> {
    const res = await fetch(`${API_BASE_URL}/api/status`, {
      headers: { 'Accept': 'application/json' }
    });
    return this.handleResponse(res);
  }

  async uploadDataset(file: File, token: string | null): Promise<DatasetUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.executeFetch<DatasetUploadResponse>(
      `${API_BASE_URL}/api/dataset/upload`,
      {
        method: 'POST',
        body: formData,
      },
      token
    );
  }

  async getDatasetPreview(fileId: string, limit = 10, token: string | null): Promise<any> {
    return this.executeFetch(
      `${API_BASE_URL}/api/dataset/preview?file_id=${fileId}&limit=${limit}`,
      {
        headers: { 'Content-Type': 'application/json' },
      },
      token
    );
  }

  async trainModel(payload: any, token: string | null): Promise<TrainResponse> {
    return this.executeFetch<TrainResponse>(
      `${API_BASE_URL}/api/model/train`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      token
    );
  }

  async generatePredictions(payload: { analysis_id: string; limit?: number }, token: string | null): Promise<any> {
    return this.executeFetch(
      `${API_BASE_URL}/api/predict`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      token
    );
  }

  async detectAnomalies(payload: any, token: string | null): Promise<AnomalyDetectResponse> {
    return this.executeFetch<AnomalyDetectResponse>(
      `${API_BASE_URL}/api/anomalies/detect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      token
    );
  }

  async explainPredictions(payload: any, token: string | null): Promise<SHAPExplainResponse> {
    return this.executeFetch<SHAPExplainResponse>(
      `${API_BASE_URL}/api/explain`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      token
    );
  }

  async getEvaluation(analysisId: string, token: string | null): Promise<any> {
    return this.executeFetch(
      `${API_BASE_URL}/api/evaluate?analysis_id=${analysisId}`,
      {
        headers: { 'Content-Type': 'application/json' },
      },
      token
    );
  }

  async getAnalysesHistory(token: string | null): Promise<AnalysisHistoryItem[]> {
    return this.executeFetch<AnalysisHistoryItem[]>(
      `${API_BASE_URL}/api/analyses`,
      {
        headers: { 'Content-Type': 'application/json' },
      },
      token
    );
  }

  async getSingleAnalysis(analysisId: string, token: string | null): Promise<any> {
    return this.executeFetch(
      `${API_BASE_URL}/api/analyses/${analysisId}`,
      {
        headers: { 'Content-Type': 'application/json' },
      },
      token
    );
  }

  getExportUrl(analysisId: string): string {
    return `${API_BASE_URL}/api/results/export?analysis_id=${analysisId}`;
  }
}

export const api = new ApiService();
