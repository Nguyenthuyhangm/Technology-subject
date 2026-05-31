import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import React from 'react';
export function ProtectedRoute(): React.ReactElement{
    const { session, loading } = useAuth()

    if (loading) {
        return <div>Loading...</div>
    }

    if (!session) return <Navigate to="/login" replace />

    return <Outlet />
}

export function GuestRoute(): React.ReactElement {
    const { session, loading } = useAuth()

    if (loading) return <div>Loading...</div>

    // 🔥 FIX BUG: /home -> /
    if (session) return <Navigate to="/" replace />

    return <Outlet />
}