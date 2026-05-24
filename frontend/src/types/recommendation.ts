export interface RecommendationProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  skinType: string | null;
  categoryName: string;
  brandName: string;
  score: number;
  lowestPrice: number | null;
  platformName: string | null;
  productUrl: string | null;
}