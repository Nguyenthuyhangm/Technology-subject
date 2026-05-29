import apiClient from "./apiClient";
import type { RecommendationProduct } from "../types/recommendation";

export const getRecommendations = async (
  userId: string,
  limit: number = 12
): Promise<RecommendationProduct[]> => {
  const response = await apiClient.get<RecommendationProduct[]>(
    `/recommendations/${userId}`,
    {
      params: {
        limit,
      },
    }
  );

  return response.data;
};