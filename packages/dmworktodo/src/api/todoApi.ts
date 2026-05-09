import axios from 'axios';
import { WKApp } from '@octo/base';
import type {
  Matter,
  MatterDetail,
  MatterComment,
  MatterChannel,
  PaginatedList,
  MatterListParams,
  CreateMatterReq,
  UpdateMatterReq,
  MatterStatus,
  LinkChannelReq,
  AddCommentReq,
  ListCommentsParams,
  CommentAttachmentReq,
} from '../bridge/types';

/**
 * Isolated axios instance for matters service API.
 * Must NOT inherit axios.defaults.baseURL (set to '/api/v1/' by WKApp.apiClient)
 * otherwise all paths get double-prefixed.
 */
const matterAxios = axios.create({ baseURL: '' });

// Inject auth headers via interceptor (consistent with base APIClient pattern).
// Token is read at request time so it stays fresh after refresh.
matterAxios.interceptors.request.use((config) => {
  const token = WKApp.loginInfo.token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['token'] = token;
  }
  const spaceId = WKApp.shared.currentSpaceId;
  if (spaceId) {
    config.headers = config.headers ?? {};
    config.headers['X-Space-Id'] = spaceId;
  }
  return config;
});

// Handle 401 — mirror APIClient behavior (trigger logout on expired token)
matterAxios.interceptors.response.use(undefined, (err) => {
  if (err?.response?.status === 401) {
    WKApp.shared.logout();
  }
  return Promise.reject(err);
});

/**
 * Extract server error message from axios error response.
 */
function extractErrorMessage(err: unknown): string {
  const axiosErr = err as { response?: { data?: { error?: { message?: string } } } };
  const msg = axiosErr?.response?.data?.error?.message;
  const raw = msg || (err instanceof Error ? err.message : 'Request failed');
  // Cap length to prevent pathologically long server error messages in toasts
  return raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
}

/**
 * Base path for matters service API.
 * Vite dev proxy (apps/web/vite.config.ts) rewrites /matter/* -> /* on the target.
 * Production nginx must have an equivalent rewrite rule.
 */
const BASE = '/matter/api/v1';

/**
 * Build query string params, filtering out undefined values.
 */
function buildParams(obj?: Record<string, unknown>): Record<string, string> {
  if (!obj) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}

/**
 * Unwrap axios response — return response.data directly.
 */
async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  try {
    const resp = await matterAxios.get(`${BASE}${path}`, {
      params: buildParams(params),
    });
    return resp.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}

async function post<T>(path: string, data?: unknown): Promise<T> {
  try {
    const resp = await matterAxios.post(`${BASE}${path}`, data);
    return resp.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}

async function put<T>(path: string, data?: unknown): Promise<T> {
  try {
    const resp = await matterAxios.put(`${BASE}${path}`, data);
    return resp.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}

async function del<T>(path: string): Promise<T> {
  try {
    const resp = await matterAxios.delete(`${BASE}${path}`);
    return resp.data;
  } catch (err: unknown) {
    throw new Error(extractErrorMessage(err));
  }
}

// ─── Matters ────────────────────────────────────────────

export async function listMatters(params?: MatterListParams): Promise<PaginatedList<Matter>> {
  return get<PaginatedList<Matter>>('/matters', params as unknown as Record<string, unknown>);
}

export async function getMatter(matterId: string, sourceChannelId?: string): Promise<MatterDetail> {
  return get<MatterDetail>(`/matters/${matterId}`, sourceChannelId ? { source_channel_id: sourceChannelId } : undefined);
}

export async function createMatter(req: CreateMatterReq): Promise<MatterDetail> {
  return post<MatterDetail>('/matters', req);
}

export async function updateMatter(matterId: string, req: UpdateMatterReq): Promise<MatterDetail> {
  return put<MatterDetail>(`/matters/${matterId}`, req);
}

export async function transitionMatter(matterId: string, status: MatterStatus): Promise<MatterDetail> {
  return put<MatterDetail>(`/matters/${matterId}/status`, { status });
}

export async function deleteMatter(matterId: string): Promise<void> {
  return del<void>(`/matters/${matterId}`);
}

// ─── Assignees ──────────────────────────────────────────

export async function addAssignee(matterId: string, userId: string): Promise<void> {
  return post<void>(`/matters/${matterId}/assignees`, { user_id: userId });
}

export async function removeAssignee(matterId: string, userId: string): Promise<void> {
  return del<void>(`/matters/${matterId}/assignees/${userId}`);
}

// ─── Channels ───────────────────────────────────────────

export async function linkChannel(matterId: string, req: LinkChannelReq): Promise<MatterChannel> {
  return post<MatterChannel>(`/matters/${matterId}/channels`, req);
}

export async function unlinkChannel(matterId: string, channelId: string): Promise<void> {
  return del<void>(`/matters/${matterId}/channels/${channelId}`);
}

// ─── Comments ───────────────────────────────────────────

export async function listComments(matterId: string, params?: ListCommentsParams): Promise<PaginatedList<MatterComment>> {
  return get<PaginatedList<MatterComment>>(`/matters/${matterId}/comments`, params as unknown as Record<string, unknown>);
}

export async function addComment(matterId: string, content: string, attachments?: CommentAttachmentReq[]): Promise<MatterComment> {
  const trimmed = content?.trim() || null;
  if (!trimmed && (!attachments || attachments.length === 0)) {
    throw new Error('Comment must have content or attachments');
  }
  const body: AddCommentReq = { content: trimmed, attachments };
  return post<MatterComment>(`/matters/${matterId}/comments`, body);
}

export async function deleteComment(matterId: string, commentId: string): Promise<void> {
  return del<void>(`/matters/${matterId}/comments/${commentId}`);
}
