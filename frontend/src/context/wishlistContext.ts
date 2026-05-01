import { createContext } from 'react';
import type { WishlistAddPayload, WishlistDisplayItem } from '../types/wishlist';

export interface WishlistContextValue {
  wishlist: WishlistDisplayItem[];
  addToWishlist: (product: WishlistAddPayload) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  // Loading state khi đang xóa một productId cụ thể — UI dùng để disable nút
  isRemoving: (productId: string) => boolean;
}

export const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);
