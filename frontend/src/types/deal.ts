export type DealType =
  | 'trending'
  | 'real-discount'
  | 'suspicious-discount'
  | 'near-historic-low'
  | 'brand-hot'
  | 'category-hot';

export type Deal = {
  id: string;
  productId: string;
  type: DealType;
  title: string;
  subtitle: string;
  discountPercent: number;
  currentPrice: number;
  previousPrice: number;
  score: number;
  createdAt: string;
};

export type DealSection = {
  id: string;
  title: string;
  subtitle: string;
  type: DealType;
  dealIds: string[];
};