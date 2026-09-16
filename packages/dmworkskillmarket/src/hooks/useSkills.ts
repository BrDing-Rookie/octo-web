import { useCallback, useEffect, useRef, useState } from "react";
import { t, Dap } from "@octo/base";
import type { Category, Skill, SkillSort } from "../types/skill";
import { getCategories, getMySkills, getSkills } from "../api/skillApi";

interface UseSkillsOptions {
  mine?: boolean;
  selectedTags?: string[];
  sort?: SkillSort;
}

export interface UseSkillsResult {
  categories: Category[];
  skills: Skill[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  query: string;
  categoryId: string;
  hasMore: boolean;
  setQuery: (query: string) => void;
  setCategoryId: (categoryId: string) => void;
  refresh: () => void;
  loadMore: () => void;
}

export function useSkills(options: UseSkillsOptions = {}): UseSkillsResult {
  const selectedTags = options.selectedTags ?? [];
  const sort = options.sort ?? "comprehensive";
  const tagKey = selectedTags.join("\u0001");
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQueryState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [categoryId, setCategoryIdState] = useState("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // market_searched 需带 has_result(结果计数),而检索的 debounce 与结果 fetch 解耦在两个 effect。
  // 用该 ref 标记「本次是检索触发的首页拉取」,在下一次首页 fetch 成功后就近取 total 发埋点。
  const pendingSearchEmitRef = useRef(false);

  const fetchPage = useCallback(
    async (nextCursor?: string | null) => {
      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const isMore = Boolean(nextCursor);
      if (isMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const signal = controller.signal;
        const [categoryItems, page] = await Promise.all([
          getCategories({ signal }),
          options.mine
            ? getMySkills(
                {
                  q: debouncedQuery,
                  categoryId,
                  tags: selectedTags,
                  sort,
                  cursor: nextCursor ?? undefined,
                  limit: 20,
                },
                { signal }
              )
            : getSkills(
                {
                  q: debouncedQuery,
                  categoryId,
                  tags: selectedTags,
                  sort,
                  cursor: nextCursor ?? undefined,
                  limit: 20,
                },
                { signal }
              ),
        ]);
        if (controller.signal.aborted) return;
        const normalizedCategories = [
          {
            id: "all",
            // Display goes through i18n; matching is keyed on id === "all"
            // only so an English-locale user does not see 中文 and the
            // filter no longer couples to a translation string.
            name: t("skillMarket.category.all"),
            iconKey: "LayoutGrid",
            sortOrder: 0,
            skillCount: categoryItems.reduce(
              (total, category) =>
                category.id === "all"
                  ? total
                  : total + (category.skillCount ?? 0),
              0
            ),
          },
          ...categoryItems.filter((category) => category.id !== "all"),
        ];
        const selectableCategories = normalizedCategories.filter(
          (category) => category.id === "all" || category.skillCount > 0
        );
        if (
          categoryId !== "all" &&
          !selectableCategories.some((category) => category.id === categoryId)
        ) {
          setCategoryIdState("all");
        }
        setCategories(normalizedCategories);
        setSkills((current: Skill[]) =>
          isMore ? [...current, ...page.items] : page.items
        );
        setTotal(page.total);
        setCursor(page.nextCursor);
        // 检索触发的首页拉取成功后发 market_searched(market_type='skill'),带 has_result。
        // 仅首页(!isMore)、仅被检索置位时消费一次;分类/标签/加载更多等其它 fetch 不发。
        if (!isMore && pendingSearchEmitRef.current) {
          pendingSearchEmitRef.current = false;
          Dap.shared.track("market_searched", {
            market_type: "skill",
            has_result: page.total > 0,
          });
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : t("skillMarket.common.loadFailed")
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [categoryId, debouncedQuery, options.mine, sort, tagKey]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      // 埋点 317:market_searched 移到结果 fetch 返回后再发,以带 has_result。这里仅置位标记,
      // 由 debouncedQuery 变化触发的下一次首页 fetch 成功后消费(见 fetchPage)。绝不采 keyword。
      if (query.trim()) pendingSearchEmitRef.current = true;
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void fetchPage(null);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchPage]);

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
    setSkills([]);
    setCursor(null);
    setLoading(true);
  }, []);

  const setCategoryId = useCallback((value: string) => {
    setCategoryIdState(value);
    setSkills([]);
    setCursor(null);
    setLoading(true);
  }, []);

  return {
    categories,
    skills,
    total,
    loading,
    loadingMore,
    error,
    query,
    categoryId,
    hasMore: Boolean(cursor),
    setQuery,
    setCategoryId,
    refresh: () => void fetchPage(null),
    loadMore: () => {
      if (!cursor || loading || loadingMore) return;
      void fetchPage(cursor);
    },
  };
}
