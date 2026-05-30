export interface RecommendationProduct {
  // RecommendationRepository trả về field "id" (alias trong SQL)
  id: string;
  // AiChatRepository / similar endpoint trả về field "productId"
  productId?: string;
  name: string;
  // AiRecommendationDTO dùng "productName" thay vì "name"
  productName?: string;
  imageUrl: string | null;
  skinType: string | null;
  categoryName: string;
  brandName: string;
  score: number;
  lowestPrice: number | null;
  platformName: string | null;
  productUrl: string | null;
}
