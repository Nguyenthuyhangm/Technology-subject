import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type UserProfile } from '../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthContextType {
    session: Session | null
    user: User | null
    profile: UserProfile | null
    loading: boolean
    signOut: () => Promise<void>
}

// ── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    // Lấy profile từ bảng users
    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()

        if (!error && data) setProfile(data as UserProfile)
    }

    useEffect(() => {
        // 1. Lấy session hiện tại khi app khởi động
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (session?.user) fetchProfile(session.user.id)
            setLoading(false)
        })

        // 2. Lắng nghe thay đổi auth (login / logout / token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                if (session?.user) {
                    fetchProfile(session.user.id)
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
    }

    return (
        <AuthContext.Provider
            value={{
                session,
                user: session?.user ?? null,
                profile,
                loading,
                signOut,
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
