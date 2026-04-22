// src/service/categoryApi.ts
export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  children?: Category[]; // Dùng cho danh mục con
}

export const getCategoryTree = async (): Promise<Category[]> => {
  // Thay thế bằng logic gọi API thực tế của bạn (fetch, axios, hoặc supabase client)
  const response = await fetch('/api/categories/tree');
  return response.json();
};