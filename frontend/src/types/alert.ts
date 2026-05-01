import type { PlatformName } from './product';

export type AlertChannel = 'email' | 'push' | 'zalo';
export type AlertStatus = 'active' | 'paused' | 'triggered';

export type Alert = {
  id: string;
  productId: string;
  targetPrice: number;
  platform?: PlatformName | 'all';
  channel: AlertChannel;
  status: AlertStatus;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
};