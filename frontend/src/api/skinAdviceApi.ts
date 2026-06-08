import apiClient from './apiClient';

export interface SkinRoutineStepProduct {
  stepKey: string;
  stepLabel: string;
  routineTime: 'morning' | 'night';
  productId: string;
  productName: string;
  brandName: string;
  categoryName: string;
  imageUrl: string;
  lowestPrice?: number;
  reason: string;
}

export interface SkinAdviceRequest {
  userId: string;
  skinType: string;
  sensitivityLevel: string;
  acneLevel: string;
  mainConcerns: string;
  skinGoals: string;
  allergies?: string;
  currentProducts?: string;
  budgetMin?: number;
  budgetMax?: number;
}

export interface SkinAdviceResponse {
  reportId: string;
  templateId: string;
  cached: boolean;
  summary: string;
  morningRoutine: string;
  nightRoutine: string;
  recommendedProducts: string;
  warningNotes: string;
  morningProducts: SkinRoutineStepProduct[];
  nightProducts: SkinRoutineStepProduct[];
}

export const analyzeOrGetSkinAdvice = async (
  payload: SkinAdviceRequest,
): Promise<SkinAdviceResponse> => {
  const response = await apiClient.post<SkinAdviceResponse>(
    '/skin-advice',
    payload,
    {
      timeout: 60_000,
    },
  );

  return response.data;
};

export const downloadSkinAdvicePdf = async (reportId: string) => {
  const response = await apiClient.get(`/skin-advice/${reportId}/pdf`, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], {
    type: 'application/pdf',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'pricehawk-skin-advice.pdf';
  link.click();

  window.URL.revokeObjectURL(url);
};