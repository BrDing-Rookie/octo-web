import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as api from '../api/todoApi';
import type { Matter, MatterListParams, MatterStatus } from '../bridge/types';
import { Toast } from '../utils/toast';

export interface UseMatterListOptions {
  initialFilters?: MatterListParams;
  pageSize?: number;
}

export interface UseMatterListResult {
  matters: Matter[];
  loading: boolean;
  hasMore: boolean;
  filters: MatterListParams;
  setFilters: (patch: Partial<MatterListParams>) => void;
  reload: () => void;
  loadMore: () => void;
  toggleStatus: (matterId: string, currentStatus: MatterStatus) => Promise<void>;
  optimisticUpdate: (matterId: string, patch: Partial<Matter>) => void;
  addOptimistic: (matter: Matter) => void;
  removeOptimistic: (matterId: string) => void;
}

export function useMatterList({
  initialFilters = {},
  pageSize = 50,
}: UseMatterListOptions = {}): UseMatterListResult {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [filters, setFiltersState] = useState<MatterListParams>(initialFilters);
  const cursorRef = useRef<string | undefined>();

  // 当 initialFilters 引用变化时（如 channel 切换）同步重置 filters
  const initialFiltersKey = useMemo(() => JSON.stringify(initialFilters), [initialFilters]);
  useEffect(() => {
    setFiltersState(initialFilters);
    cursorRef.current = undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiltersKey]);

  // Stable string for useCallback deps — avoids recreating `load` on every render
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(async (append = false) => {
    if (!append) setLoading(true);
    try {
      const params: MatterListParams = { ...filters, limit: pageSize };
      if (append && cursorRef.current) params.cursor = cursorRef.current;

      const res = await api.listMatters(params);
      setMatters(append ? (prev) => [...prev, ...res.data] : res.data);
      setHasMore(res.pagination.has_more);
      cursorRef.current = res.pagination.next_cursor;
    } catch {
      Toast.error('加载事项失败');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, pageSize]);

  useEffect(() => {
    cursorRef.current = undefined;
    load(false);
  }, [load]);

  const setFilters = useCallback((patch: Partial<MatterListParams>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const reload = useCallback(() => {
    cursorRef.current = undefined;
    load(false);
  }, [load]);

  const loadMore = useCallback(() => {
    load(true);
  }, [load]);

  const toggleStatus = useCallback(async (matterId: string, currentStatus: MatterStatus) => {
    if (currentStatus === 'archived') return; // archived cannot be toggled directly
    const newStatus: MatterStatus = currentStatus === 'open' ? 'done' : 'open';
    try {
      await api.transitionMatter(matterId, newStatus);
      setMatters((prev) =>
        prev.map((t) => (t.id === matterId ? { ...t, status: newStatus } : t))
      );
    } catch {
      Toast.error('更新状态失败');
    }
  }, []);

  const optimisticUpdate = useCallback((matterId: string, patch: Partial<Matter>) => {
    setMatters((prev) => prev.map((t) => (t.id === matterId ? { ...t, ...patch } : t)));
  }, []);

  const addOptimistic = useCallback((matter: Matter) => {
    setMatters((prev) => [matter, ...prev]);
  }, []);

  /** 移除乐观条目：精确匹配 id，或前缀匹配（传入前缀字符串） */
  const removeOptimistic = useCallback((matterIdOrPrefix: string) => {
    setMatters((prev) => prev.filter((t) => !t.id.startsWith(matterIdOrPrefix) && t.id !== matterIdOrPrefix));
  }, []);

  return { matters, loading, hasMore, filters, setFilters, reload, loadMore, toggleStatus, optimisticUpdate, addOptimistic, removeOptimistic };
}
