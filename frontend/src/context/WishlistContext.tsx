import React, { createContext, useContext, useState, useEffect } from 'react';
import type { WishlistItem } from '../types/wishlist';
import type { Product } from '../types/product';

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: number) => void;
  toggleAlert: (productId: number) => void;
  isInWishlist: (productId: number) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Khởi tạo state từ LocalStorage (nếu có)
  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('price_tracker_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  // 2. Lưu vào LocalStorage mỗi khi wishlist thay đổi
  useEffect(() => {
    localStorage.setItem('price_tracker_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // 3. Hàm thêm sản phẩm vào Wishlist
  const addToWishlist = (product: Product) => {
    const newItem: WishlistItem = {
      id: `ws-${Date.now()}`, // Tạo ID duy nhất
      productId: product.id,
      addedAt: new Date().toISOString(),
      alertEnabled: true, // Mặc định bật thông báo
      nearTarget: false,
      priceChanged7dPercent: 0, // Ban đầu chưa có biến động
    };
    setWishlist((prev) => [...prev, newItem]);
  };

  // 4. Hàm xóa sản phẩm
  const removeFromWishlist = (productId: number) => {
    setWishlist((prev) => prev.filter((item) => item.productId !== productId));
  };

  // 5. Hàm Bật/Tắt thông báo giá cho từng item
  const toggleAlert = (productId: number) => {
    setWishlist((prev) =>
      prev.map((item) =>
        item.productId === productId 
          ? { ...item, alertEnabled: !item.alertEnabled } 
          : item
      )
    );
  };

  // 6. Kiểm tra sản phẩm đã được lưu chưa
  const isInWishlist = (productId: number) => {
    return wishlist.some((item) => item.productId === productId);
  };

  return (
    <WishlistContext.Provider 
      value={{ wishlist, addToWishlist, removeFromWishlist, toggleAlert, isInWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

// Hook tùy chỉnh để sử dụng Context nhanh hơn
export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};