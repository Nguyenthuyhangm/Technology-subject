import React, { createContext, useContext, useState, useEffect } from 'react';
import { wishlistService } from '../service/wishlistApi';
import type { WishlistItem } from '../types/wishlist';
import type { Product } from '../types/product';

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

const CURRENT_USER_ID = '6a63d257-c0d6-4650-bd78-99cb1c8bd671';
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  useEffect(() => {a
    const fetchWishlist = async () => {
      try {
        const data = await wishlistService.getWishlist(CURRENT_USER_ID);
        setWishlist(data);
      } catch (error) {
        console.error('Lỗi khi lấy wishlist từ server:', error);
      }
    };
    fetchWishlist();
  }, []);

  const addToWishlist = async (product: Product) => {
    try {
      console.log('ADD wishlist userId =', CURRENT_USER_ID);
      console.log('ADD wishlist productId =', product.id);

      await wishlistService.add(CURRENT_USER_ID, String(product.id));

      const newItem: any = { productId: product.id, ...product };
      setWishlist((prev) => [...prev, newItem]);
      console.log('Đã thêm vào DB thành công!');
    } catch (error) {
      console.error('Không thể thêm vào DB:', error);
      alert('Lỗi kết nối server!');
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      await wishlistService.remove(productId, CURRENT_USER_ID);

      setWishlist((prev) =>
        prev.filter((item) => String(item.productId || item.id) !== String(productId))
      );
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => String(item.productId || item.id) === String(productId));
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider');
  return context;
};