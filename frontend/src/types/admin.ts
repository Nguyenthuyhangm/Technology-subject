export type Metrics = {
    users: { total: number };
    products: { total: number };
    alerts: { total: number; active: number };
    wishlists: { total: number };
    affiliate: { totalClicks: number; clicksLast30Days: number };
    notifications: { total: number };
    transactions: { total: number; data: any[] };
};

export type UserItem = {
    id: string;
    email: string;
    name: string;
    plan: string;
    phone?: string;
    created_at: string;
    alertCount: number;
    wishlistCount: number;
};