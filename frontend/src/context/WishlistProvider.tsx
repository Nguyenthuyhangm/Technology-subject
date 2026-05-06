import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { wishlistService } from '../service/wishlistApi';
import type { WishlistAddPayload, WishlistDisplayItem } from '../types/wishlist';
import { WISHLIST_CURRENT_USER_ID } from './wishlistConstants';
import { WishlistContext } from './wishlistContext';
import { wishlistDisplayFromPayload } from '../util/wishlistPayload';

// Helper trích message lỗi thân thiện từ AxiosError (BE trả body { message, status, ... })
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
  // Set productId đang trong tiến trình xóa — dùng cho loading state trên UI
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const data = await wishlistService.getWishlist(WISHLIST_CURRENT_USER_ID);
        setWishlist(data as WishlistDisplayItem[]);
      } catch (error) {
        console.error('Lỗi khi lấy wishlist từ server:', error);
      }
    };
    fetchWishlist();
  }, []);

  const addToWishlist = async (product: WishlistAddPayload) => {
    try {
      await wishlistService.add(WISHLIST_CURRENT_USER_ID, String(product.id));

      const newItem = wishlistDisplayFromPayload(product);
      setWishlist((prev) => [...prev, newItem]);
    } catch (error) {
      console.error('Không thể thêm vào DB:', error);
      alert(extractErrorMessage(error, 'Không thể thêm vào wishlist. Vui lòng thử lại.'));
    }
  };

  /**
   * Xóa wishlist theo productId với optimistic update:
   *  1. Lưu snapshot state hiện tại.
   *  2. Xóa ngay khỏi UI (optimistic).
   *  3. Gọi API. Nếu lỗi → rollback và báo user.
   *  4. Nếu BE trả 404 (không tìm thấy) → coi như đã xóa, không rollback, chỉ info.
   */
  const removeFromWishlist = useCallback(async (productId: string) => {
    const key = String(productId);

    // Tránh double-click gửi 2 request trùng
    if (removingIds.has(key)) return;

    // Snapshot để rollback nếu cần
    const snapshot = wishlist;

    // Đánh dấu đang xóa
    setRemovingIds((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });

    // Optimistic: xóa khỏi UI ngay
    setWishlist((prev) => prev.filter((item) => String(item.productId) !== key));

    try {
      await wishlistService.remove(key, WISHLIST_CURRENT_USER_ID);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      if (status === 404) {
        // Không có record trên BE → giữ nguyên UI đã xóa, không rollback
        console.warn('Wishlist item không tồn tại trên server, UI đã đồng bộ.');
      } else {
        // Rollback UI về state trước khi xóa
        console.error('Lỗi khi xóa wishlist, đang rollback UI:', error);
        setWishlist(snapshot);
        alert(extractErrorMessage(error, 'Không thể xóa khỏi wishlist. Vui lòng thử lại.'));
      }
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [removingIds, wishlist]);

  const isInWishlist = (productId: string) => {
    return wishlist.some((item) => String(item.productId) === String(productId));
  };

  const isRemoving = (productId: string) => removingIds.has(String(productId));

  return (
    <WishlistContext.Provider
      value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, isRemoving }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
