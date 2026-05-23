import { AxiosError } from 'axios';
import apiClient from '../api/apiClient';

function logAxiosError(context: string, error: unknown) {
  if (error instanceof AxiosError) {
    console.error(`[wishlistApi] ${context}`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data,
    });
  } else {
    console.error(`[wishlistApi] ${context}`, error);
  }
}

export const wishlistService = {
  getWishlist: async (userId: string) => {
    try {
      const response = await apiClient.get(`/wishlist/${userId}`);
      return response.data;
    } catch (error) {
      logAxiosError('Error fetching wishlist', error);
      throw error;
    }
  },

  add: async (userId: string, productId: string) => {
    try {
      const response = await apiClient.post('/wishlist/add', {
        userId: String(userId),
        productId: String(productId),
      });
      return response.data;
    } catch (error) {
      logAxiosError('Error adding to wishlist', error);
      throw error;
    }
  },

  remove: async (productId: string, userId: string) => {
    try {
      const response = await apiClient.delete(`/wishlist/${productId}`, {
        params: { userId: String(userId) },
      });
      return response.data;
    } catch (error) {
      logAxiosError('Error removing from wishlist', error);
      throw error;
    }
  },
};