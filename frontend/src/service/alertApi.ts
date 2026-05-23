import apiClient from '../api/apiClient';

export interface AlertResponse {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string;
  targetPrice: number;
  platformId: number | null;
  platformName: string | null;
  channel: string;
  active: boolean;        // ← BE trả về "active" không phải "isActive"
  notifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAlertRequest {
  productId: string;
  targetPrice: number;
  platformId?: number | null;
  channel: string;
}

export const alertService = {
  getAlerts: async (): Promise<AlertResponse[]> => {
    const res = await apiClient.get('/alerts');
    return res.data;
  },

  createAlert: async (req: CreateAlertRequest): Promise<AlertResponse> => {
    const res = await apiClient.post('/alerts', req);
    return res.data;
  },

  toggleAlert: async (id: string): Promise<AlertResponse> => {
    const res = await apiClient.patch(`/alerts/${id}/toggle`);
    return res.data;
  },

  updatePrice: async (id: string, targetPrice: number): Promise<AlertResponse> => {
    const res = await apiClient.patch(`/alerts/${id}/price`, { targetPrice });
    return res.data;
  },

  deleteAlert: async (id: string): Promise<void> => {
    await apiClient.delete(`/alerts/${id}`);
  },
};