import axios, { AxiosError } from 'axios';

const API_URL = 'http://localhost:8080/api/wishlist';

// Chuẩn hoá log lỗi axios: in cả status + response.data để biết chính xác
// backend trả gì (message, code, timestamp...) thay vì chỉ "Request failed".
function logAxiosError(context: string, error: unknown) {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError;
    console.error(`[wishlistApi] ${context}`, {
      message: ax.message,
      status: ax.response?.status,
      statusText: ax.response?.statusText,
      url: ax.config?.url,
      method: ax.config?.method,
      data: ax.response?.data,
    });
  } else {
    console.error(`[wishlistApi] ${context}`, error);
  }
}

export const wishlistService = {
  getWishlist: async (userId: string) => {
    try {
      const response = await axios.get(`${API_URL}/${String(userId)}`);
      return response.data;
    } catch (error) {
      logAxiosError('Error fetching wishlist', error);
      throw error;
    }
  },

  add: async (userId: string, productId: string) => {
    try {
      const response = await axios.post(`${API_URL}/add`, {
        userId: String(userId),
        productId: String(productId),
      });
      return response.data;
    } catch (error) {
      logAxiosError('Error adding to wishlist', error);
      throw error;
    }
  },

  /**
   * Xóa wishlist theo productId.
   *
   * Backend endpoint chính:
   * DELETE /api/wishlist/{productId}?userId=xxx
   *
   * Giữ cách gọi này để khớp với WishlistController hiện tại.
   */
  remove: async (productId: string, userId: string) => {
    try {
      const response = await axios.delete(`${API_URL}/${String(productId)}`, {
        params: { userId: String(userId) },
      });
      return response.data;
    } catch (error) {
      logAxiosError('Error removing from wishlist', error);
      throw error;
    }
  },
};