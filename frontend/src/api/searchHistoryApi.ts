import apiClient from "./apiClient";

export const saveSearchHistory = async (userId: string, keyword: string) => {
  if (!userId || !keyword.trim()) return;

  await apiClient.post("/search-history", {
    userId,
    keyword: keyword.trim(),
  });
};