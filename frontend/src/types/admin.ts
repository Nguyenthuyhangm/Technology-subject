export type Metrics = {
    users: { total: number; premium?: number };
    products: { total: number };
    alerts: { total: number; active: number };
    wishlists: { total: number };
    affiliate: { totalClicks: number; clicksLast30Days: number };
    notifications: { total: number };
    transactions: { total: number; data: any[] };
    payments?: { pending: number };
};

export type UserItem = {
    id: string;
    email: string;
    name: string;
    plan: string;
    phone?: string;
    created_at: string;
    premium_expires_at?: string | null;
    alertCount: number;
    wishlistCount: number;
};
