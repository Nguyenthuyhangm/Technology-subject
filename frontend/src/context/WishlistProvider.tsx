import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { wishlistService } from '../service/wishlistApi';
import type { WishlistAddPayload, WishlistDisplayItem } from '../types/wishlist';
import { WishlistContext } from './wishlistContext';
import { wishlistDisplayFromPayload } from '../util/wishlistPayload';

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { message?: string } | undefined;
    if (status === 404) return 'Sản phẩm không còn trong wishlist.';
    if (data?.message) return data.message;
    if (error.message) return error.message;
  }
  return fallback;
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<WishlistDisplayItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  // Lấy userId từ Supabase session
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch wishlist khi có userId
  useEffect(() => {
    if (!userId) { setWishlist([]); return; }
    const fetchWishlist = async () => {
      try {
        const data = await wishlistService.getWishlist(userId);
        setWishlist(data as WishlistDisplayItem[]);
      } catch (error) {
        console.error('Lỗi khi lấy wishlist từ server:', error);
      }
    };
    fetchWishlist();
  }, [userId]);

  const addToWishlist = async (product: WishlistAddPayload) => {
    if (!userId) { alert('Vui lòng đăng nhập!'); return; }

    // Nếu đã có trong wishlist rồi thì không làm gì
    if (isInWishlist(String(product.id))) return;

    try {
      await wishlistService.add(userId, String(product.id));
      const newItem = wishlistDisplayFromPayload(product);
      setWishlist((prev) => [...prev, newItem]);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      if (status === 409) {
        // Sản phẩm đã có trên BE — đồng bộ lại UI thôi, không alert
        const newItem = wishlistDisplayFromPayload(product);
        setWishlist((prev) => {
          const exists = prev.some((i) => String(i.productId) === String(product.id));
          return exists ? prev : [...prev, newItem];
        });
      } else {
        console.error('Không thể thêm vào DB:', error);
        alert(extractErrorMessage(error, 'Không thể thêm vào wishlist. Vui lòng thử lại.'));
      }
    }
  };

  const removeFromWishlist = useCallback(async (productId: string) => {
    if (!userId) return;
    const key = String(productId);
    if (removingIds.has(key)) return;

    const snapshot = wishlist;
    setRemovingIds((prev) => { const next = new Set(prev); next.add(key); return next; });
    setWishlist((prev) => prev.filter((item) => String(item.productId) !== key));

    try {
      await wishlistService.remove(key, userId);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (status === 404) {
        console.warn('Wishlist item không tồn tại trên server, UI đã đồng bộ.');
      } else {
        console.error('Lỗi khi xóa wishlist, đang rollback UI:', error);
        setWishlist(snapshot);
        alert(extractErrorMessage(error, 'Không thể xóa khỏi wishlist. Vui lòng thử lại.'));
      }
    } finally {
      setRemovingIds((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  }, [removingIds, wishlist, userId]);

  const isInWishlist = (productId: string) =>
    wishlist.some((item) => String(item.productId) === String(productId));

  const isRemoving = (productId: string) => removingIds.has(String(productId));

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, isRemoving }}
    >
      {children}
    </WishlistContext.Provider>
  );
}