// src/types/wishlist.ts
export type WishlistItem = {
  id: string;
  productId: number;
  addedAt: string;
  alertEnabled: boolean;
  nearTarget: boolean;
  priceChanged7dPercent: number;
};