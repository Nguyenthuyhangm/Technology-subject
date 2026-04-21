import React, { createContext, useContext, useState, useEffect } from 'react';
import { wishlistService } from '../service/wishlistApi'; // Import cái service bạn vừa gửi
import type { WishlistItem } from '../types/wishlist';
import type { Product } from '../types/product';

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (product: Product) => Promise<void>; // Chuyển thành async
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

// Giả sử bạn có userId cố định hoặc lấy từ Auth, mình để tạm 'user-1'
const CURRENT_USER_ID = '36af339f-b9b3-490c-8a6d-8cb6d14f3c68';
const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);

  // 1. Load dữ liệu từ Backend khi mở app
  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const data = await wishlistService.getWishlist(CURRENT_USER_ID);
        setWishlist(data);
      } catch (error) {
        console.error("Lỗi khi lấy wishlist từ server:", error);
      }
    };
    fetchWishlist();
  }, []);

  // 2. Hàm thêm (Gọi API rồi mới cập nhật UI)
  const addToWishlist = async (product: Product) => {
    try {
      // Gọi xuống Spring Boot
      await wishlistService.add(CURRENT_USER_ID, String(product.id));
      
      // Nếu API thành công, cập nhật state để UI đổi màu trái tim ngay lập tức
      const newItem: any = { productId: product.id, ...product };
      setWishlist((prev) => [...prev, newItem]);
      console.log("Đã thêm vào DB thành công!");
    } catch (error) {
      console.error("Không thể thêm vào DB:", error);
      alert("Lỗi kết nối server!");
    }
  };

  // 3. Hàm xóa
  const removeFromWishlist = async (productId: string) => {
    try {
      // SỬA CHỖ SAI: Truyền đủ CURRENT_USER_ID và productId xuống service
      await wishlistService.remove(CURRENT_USER_ID, productId); 
      
      // SỬA CHỖ SAI: Thêm fallback item.id để filter chạy chính xác với dữ liệu API
      setWishlist((prev) => prev.filter((item) => String(item.productId || item.id) !== String(productId)));
    } catch (error) {
      console.error("Lỗi khi xóa:", error);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => String(item.productId) === String(productId));
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