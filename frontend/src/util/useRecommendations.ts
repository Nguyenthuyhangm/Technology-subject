import { useEffect, useState } from "react";
import { getRecommendations } from "../api/recommendationApi";
import type { RecommendationProduct } from "../types/recommendation";

export const useRecommendations = (userId?: string, limit: number = 12) => {
  const [recommendations, setRecommendations] = useState<RecommendationProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getRecommendations(userId, limit);
        setRecommendations(data);
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
        setError("Không thể tải sản phẩm gợi ý.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId, limit]);

  return {
    recommendations,
    loading,
    error,
  };
};