import { useEffect, useRef, useState, useCallback } from "react";
import { getRecommendations } from "../api/recommendationApi";
import type { RecommendationProduct } from "../types/recommendation";

const PAGE_SIZE = 12;

export const useRecommendations = (userId?: string) => {
  const [products, setProducts] = useState<RecommendationProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(async (page: number) => {
    if (!userId || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const data = await getRecommendations(userId, page, PAGE_SIZE);
      if (data.length < PAGE_SIZE) {
        setHasMore(false);
      }
      setProducts((prev) => (page === 0 ? data : [...prev, ...data]));
    } catch {
      setError("Không thể tải sản phẩm gợi ý.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [userId]);

  // Reset and load first page when userId changes
  useEffect(() => {
    if (!userId) return;
    pageRef.current = 0;
    setProducts([]);
    setHasMore(true);
    fetchPage(0);
  }, [userId, fetchPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) return;
    pageRef.current += 1;
    fetchPage(pageRef.current);
  }, [hasMore, fetchPage]);

  return { products, loading, error, hasMore, loadMore };
};
