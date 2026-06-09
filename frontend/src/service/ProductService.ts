import apiClient from '../api/apiClient';
import type { ProductSearch, PriceComparison, PriceHistory, VideoSummary, VideoDetail, VideoWithProduct } from '../types/product';

export interface SearchProductsOptions {
  platforms?: string[];
  categoryId?: string;
  promo?: string;
}

export async function searchProducts(
  query: string,
  opts: SearchProductsOptions = {},
): Promise<ProductSearch[]> {
  const params = new URLSearchParams();
  params.set('q', query);

  const platforms = (opts.platforms ?? [])
    .map((p) => p?.trim())
    .filter((p): p is string => !!p && p.length > 0);
  for (const p of platforms) {
    params.append('platform', p);
  }

  const categoryId = opts.categoryId?.trim();
  if (categoryId && categoryId !== 'all') {
    params.set('categoryId', categoryId);
  }

  const promo = opts.promo?.trim();
  if (promo && promo !== 'all') {
    params.set('promo', promo);
  }

  const res = await apiClient.get(`/products/search?${params.toString()}`);
  return res.data;
}

export async function priceComparison(productId: string): Promise<PriceComparison> {
  const res = await apiClient.get(`/compare/${productId}`);
  return res.data;
}

export async function priceHistory(productId: string): Promise<PriceHistory> {
  const res = await apiClient.get(`/v1/price-history/${productId}`);
  return res.data;
}

export async function getProductsByCategory(slug: string): Promise<ProductSearch[]> {
  const res = await apiClient.get(`/products/category/${encodeURIComponent(slug)}`);
  return res.data;
}

export async function getVideoSummary(page = 0, size = 20, search?: string): Promise<{ data: VideoSummary[]; headers: Record<string, string> }> {
  const params: Record<string, any> = { page, size };
  if (search) params.search = search;
  const res = await apiClient.get('/admin/videos/summary', { params });
  return { data: res.data, headers: res.headers as Record<string, string> };
}

export async function getVideoDetails(productId: string, page = 0, size = 20): Promise<{ data: VideoDetail[]; headers: Record<string, string> }> {
  const res = await apiClient.get(`/admin/videos/${productId}`, { params: { page, size } });
  return { data: res.data, headers: res.headers as Record<string, string> };
}

export async function deleteVideo(videoId: string): Promise<void> {
  await apiClient.delete(`/admin/videos/${videoId}`);
}

export async function getActiveVideos(): Promise<VideoWithProduct[]> {
  const res = await apiClient.get('/products/videos/active');
  return res.data;
}