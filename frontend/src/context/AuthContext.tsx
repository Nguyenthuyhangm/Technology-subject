import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, BACKEND_URL, type UserProfile } from '../lib/supabase'

// ── Theme helper ──────────────────────────────────────────────────────────────
export function applyTheme(theme?: string | null) {
    const root = document.documentElement
    if (theme === 'dark') {
        root.classList.add('dark')
    } else if (theme === 'light') {
        root.classList.remove('dark')
    } else {
        // 'system' hoặc undefined → theo OS
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) root.classList.add('dark')
        else root.classList.remove('dark')
    }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthContextType {
    session: Session | null
    user: User | null
    profile: UserProfile | null
    loading: boolean
    signOut: () => Promise<void>
    refreshProfile: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = async (accessToken: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/users/me`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            })
            if (res.ok) {
                const data = await res.json()
                setProfile(data as UserProfile)
                applyTheme(data.theme)
            }
        } catch (e) {
            console.error('Fetch profile from backend failed', e)
        }
    }

    const refreshProfile = async () => {
        if (session?.access_token) {
            await fetchProfile(session.access_token)
        }
    }

    useEffect(() => {
        // 1. Lấy session hiện tại khi app khởi động
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.access_token) fetchProfile(session.access_token)
            setLoading(false)
        })

        // 2. Lắng nghe thay đổi auth (login / logout / token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                if (session?.access_token) {
                    fetchProfile(session.access_token)
                } else {
                    setProfile(null)
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        setProfile(null)
    }

    return (
        <AuthContext.Provider
            value={{
                session,
                user: session?.user ?? null,
                profile,
                loading,
                signOut,
                refreshProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

// ── Hook tiện dụng ────────────────────────────────────────────────────────────
export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}