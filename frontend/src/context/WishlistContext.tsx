import React, { createContext, useContext, useState, useEffect } from 'react';
import { wishlistService } from '../service/wishlistApi';
import { supabase } from '../lib/supabaseClient';
import type { WishlistItem } from '../types/wishlist';
import type { Product } from '../types/product';

interface WishlistContextType {
  wishlist: WishlistItem[];
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Lấy userId từ Supabase session
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    getUser();

    // Lắng nghe thay đổi auth (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Load wishlist khi có userId
  useEffect(() => {
    if (!userId) return;
    const fetchWishlist = async () => {
      try {
        const data = await wishlistService.getWishlist(userId);
        setWishlist(data);
      } catch (error) {
        console.error("Lỗi khi lấy wishlist từ server:", error);
      }
    };
    fetchWishlist();
  }, [userId]);

  // 3. Thêm
  const addToWishlist = async (product: Product) => {
    if (!userId) { alert("Vui lòng đăng nhập!"); return; }
    try {
      await wishlistService.add(userId, product.id);
      const newItem: any = { productId: product.id, ...product };
      setWishlist((prev) => [...prev, newItem]);
      console.log("Đã thêm vào DB thành công!");
    } catch (error) {
      console.error("Không thể thêm vào DB:", error);
      alert("Lỗi kết nối server!");
    }
  };

  // 4. Xóa
  const removeFromWishlist = async (productId: string) => {
    if (!userId) return;
    try {
      await wishlistService.remove(userId, productId);
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