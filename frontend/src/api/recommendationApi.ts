import apiClient from "./apiClient";
import type { RecommendationProduct } from "../types/recommendation";

export const getRecommendations = async (
  userId: string,
  page: number = 0,
  size: number = 12
): Promise<RecommendationProduct[]> => {
  const response = await apiClient.get<RecommendationProduct[]>(
    `/recommendations/${userId}`,
    { params: { page, size } }
  );
  return response.data;
};
