import { storageManager } from '@/lib/storage-manager';
import { secureLogger } from '@/lib/secure-logger';
import axios, { AxiosInstance } from 'axios';

const API_BASE = '/api/system';

class SystemTrackerAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth interceptor
    this.client.interceptors.request.use(async (config) => {
      const token = await storageManager.getEncryptedItem('nocobase_token');
      if (token) {
        config.headers.Authorization = 'Bearer ' + token;
      }
      return config;
    });
  }

  // ── front tracking ───────────────────────────────────
  
  async getCurrentFront() {
    const res = await this.client.get('/front/current');
    return res.data;
  }

  async getFrontHistory(params?: { page?: number; pageSize?: number; since?: string; until?: string }) {
    const res = await this.client.get('/front/history', { params });
    return res.data;
  }

  async switchFront(memberIds: string[], options?: { comment?: string; trigger?: string; location?: string; mood?: string; energyLevel?: number }) {
    const res = await this.client.post('/front/switch', {
      members: memberIds,
      ...options
    });
    return res.data;
  }

  // ── connections ─────────────────────────────────────

  async getConnections() {
    const res = await this.client.get('/connections');
    return res.data;
  }

  async createConnection(data: {
    from_headmate_id: string;
    to_headmate_id: string;
    relationship_type?: string;
    strength?: number;
    is_mutual?: boolean;
    notes?: string;
    style?: Record<string, unknown>;
  }) {
    const res = await this.client.post('/connections', data);
    return res.data;
  }

  async updateConnection(id: string, data: Record<string, unknown>) {
    const res = await this.client.put('/connections/' + id, data);
    return res.data;
  }

  async deleteConnection(id: string) {
    const res = await this.client.delete('/connections/' + id);
    return res.data;
  }

  // ── notes ─────────────────────────────────────

  async getNotes(headmateId?: string) {
    const res = await this.client.get('/notes', { params: headmateId ? { headmate_id: headmateId } : {} });
    return res.data;
  }

  async createNote(data: { headmate_id: string; title: string; content?: string; tags?: string[]; visibility?: string; is_pinned?: boolean }) {
    const res = await this.client.post('/notes', data);
    return res.data;
  }

  async updateNote(id: string, data: Record<string, unknown>) {
    const res = await this.client.put('/notes/' + id, data);
    return res.data;
  }

  async deleteNote(id: string) {
    const res = await this.client.delete('/notes/' + id);
    return res.data;
  }

  // ── events ─────────────────────────────────────

  async getEvents(params?: { page?: number; pageSize?: number; event_type?: string; since?: string }) {
    const res = await this.client.get('/events', { params });
    return res.data;
  }

  async createEvent(data: { event_type: string; description: string; headmates?: string[]; data?: Record<string, unknown>; timestamp?: string; source?: string }) {
    const res = await this.client.post('/events', data);
    return res.data;
  }

  // ── scenes ─────────────────────────────────────

  async getScenes() {
    const res = await this.client.get('/scenes');
    return res.data;
  }

  async createScene(data: { name: string; description?: string; location_type?: string; atmosphere?: string; lighting?: string; soundscape?: string; sensory_details?: string; image_url?: string; image_prompt?: string }) {
    const res = await this.client.post('/scenes', data);
    return res.data;
  }

  async updateScene(id: string, data: Record<string, unknown>) {
    const res = await this.client.put('/scenes/' + id, data);
    return res.data;
  }

  async deleteScene(id: string) {
    const res = await this.client.delete('/scenes/' + id);
    return res.data;
  }

  // ── images ─────────────────────────────────────

  async generateImage(prompt: string, type: string = 'portrait', headmateId?: string, options?: Record<string, unknown>) {
    const res = await this.client.post('/images/generate', {
      prompt,
      type,
      headmate_id: headmateId,
      options
    });
    return res.data;
  }

  // ── mcp tools ─────────────────────────────────────

  async getMCPTools() {
    const res = await this.client.get('/mcp/tools');
    return res.data;
  }

  async callMCPTool(tool: string, params: Record<string, unknown>) {
    const res = await this.client.post('/mcp/' + tool, params);
    return res.data;
  }
}

export const systemTrackerAPI = new SystemTrackerAPI();
export default systemTrackerAPI;
