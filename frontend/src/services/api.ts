import {
  DatasetUploadResponse,
  TrainResponse,
  AnomalyDetectResponse,
  SHAPExplainResponse,
  AnalysisHistoryItem
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && (window.location.hostname.endsWith('web.app') || window.location.hostname.endsWith('firebaseapp.com'))
    ? 'https://energisense-ai.onrender.com'
    : 'http://127.0.0.1:8000');

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

  async checkHealth(): Promise<{ status: string; service: string }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return this.handleResponse(res);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error("Backend connection timed out. If hosted on Render Free tier, the service may be spinning up from idle (cold start).");
      }
      throw err;
    }
  }

  async uploadDataset(file: File, token: string | null): Promise<DatasetUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE_URL}/api/dataset/upload`, {
      method: 'POST',
      headers: this.getHeaders(token, false),
      body: formData,
    });
    return this.handleResponse<DatasetUploadResponse>(res);
  }

  async getDatasetPreview(fileId: string, limit = 10, token: string | null): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/dataset/preview?file_id=${fileId}&limit=${limit}`, {
      headers: this.getHeaders(token),
    });
    return this.handleResponse(res);
  }

  async trainModel(payload: any, token: string | null): Promise<TrainResponse> {
    const res = await fetch(`${API_BASE_URL}/api/model/train`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<TrainResponse>(res);
  }

  async generatePredictions(payload: { analysis_id: string; limit?: number }, token: string | null): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(res);
  }

  async detectAnomalies(payload: any, token: string | null): Promise<AnomalyDetectResponse> {
    const res = await fetch(`${API_BASE_URL}/api/anomalies/detect`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<AnomalyDetectResponse>(res);
  }

  async explainPredictions(payload: any, token: string | null): Promise<SHAPExplainResponse> {
    const res = await fetch(`${API_BASE_URL}/api/explain`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<SHAPExplainResponse>(res);
  }

  async getEvaluation(analysisId: string, token: string | null): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/evaluate?analysis_id=${analysisId}`, {
      headers: this.getHeaders(token),
    });
    return this.handleResponse(res);
  }

  async getAnalysesHistory(token: string | null): Promise<AnalysisHistoryItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/analyses`, {
      headers: this.getHeaders(token),
    });
    return this.handleResponse<AnalysisHistoryItem[]>(res);
  }

  async getSingleAnalysis(analysisId: string, token: string | null): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/api/analyses/${analysisId}`, {
      headers: this.getHeaders(token),
    });
    return this.handleResponse(res);
  }

  getExportUrl(analysisId: string): string {
    return `${API_BASE_URL}/api/results/export?analysis_id=${analysisId}`;
  }
}

export const api = new ApiService();
