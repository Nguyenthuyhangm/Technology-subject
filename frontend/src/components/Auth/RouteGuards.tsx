import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute(): JSX.Element {
    const { session, loading } = useAuth()

    if (loading) {
        return <div>Loading...</div>
    }

    if (!session) return <Navigate to="/login" replace />

    return <Outlet />
}

export function GuestRoute(): JSX.Element {
    const { session, loading } = useAuth()

    if (loading) return <div>Loading...</div>

    // 🔥 FIX BUG: /home -> /
    if (session) return <Navigate to="/" replace />

    return <Outlet />
}