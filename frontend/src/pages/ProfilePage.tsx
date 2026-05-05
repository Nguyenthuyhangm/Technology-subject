import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, applyTheme } from '../context/AuthContext'
import { BACKEND_URL } from '../lib/supabase'
import type { UserProfile } from '../lib/supabase'
import AppHeader from '../components/layout/AppHeader'

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function getInitials(name?: string | null, email?: string | null): string {
    if (name) return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    return email?.[0].toUpperCase() ?? '?'
}

function formatDate(iso?: string | null): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
    })
}

/* ─── Sub-components ────────────────────────────────────────────────────────── */

function SkeletonLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
    return <div className={`${w} ${h} animate-pulse rounded-xl bg-stone-200/70 dark:bg-stone-700/50`} />
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
    if (!message) return null
    return (
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-medium shadow-sm mb-5 border ${
            type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-600 border-red-200'
        }`}>
            {type === 'success' ? (
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            ) : (
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            )}
            {message}
        </div>
    )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
            {children}
        </label>
    )
}

function ReadonlyField({ value }: { value: string }) {
    return (
        <div className="w-full rounded-2xl border border-stone-100 dark:border-stone-700/60 bg-stone-50 dark:bg-stone-800/30 px-4 py-3 text-sm text-stone-400 dark:text-stone-500 cursor-not-allowed select-none">
            {value}
        </div>
    )
}

/* ─── Loading Skeleton ──────────────────────────────────────────────────────── */
function ProfileSkeleton() {
    return (
        <main className="relative mx-auto max-w-2xl px-6 pb-28 pt-32 lg:px-8">
            <div className="mb-10">
                <SkeletonLine w="w-20" h="h-3" />
                <div className="mt-3"><SkeletonLine w="w-48" h="h-9" /></div>
            </div>

            {/* Avatar card skeleton */}
            <div className="mb-8 flex items-center gap-5 rounded-[28px] border border-stone-200/80 bg-white/80 p-6 shadow-sm">
                <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-stone-200" />
                <div className="flex-1 space-y-2">
                    <SkeletonLine w="w-40" h="h-4" />
                    <SkeletonLine w="w-56" h="h-3" />
                    <SkeletonLine w="w-24" h="h-5" />
                </div>
            </div>

            {/* Info section skeleton */}
            <div className="mb-6 rounded-[28px] border border-stone-200/80 bg-white/80 p-6 shadow-sm space-y-5">
                <SkeletonLine w="w-32" h="h-3" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                        <SkeletonLine w="w-20" h="h-3" />
                        <SkeletonLine h="h-11" />
                    </div>
                ))}
                <SkeletonLine h="h-12" />
            </div>

            {/* Preferences skeleton */}
            <div className="rounded-[28px] border border-stone-200/80 bg-white/80 p-6 shadow-sm space-y-5">
                <SkeletonLine w="w-32" h="h-3" />
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3].map((i) => <SkeletonLine key={i} h="h-20" />)}
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {[1, 2].map((i) => <SkeletonLine key={i} h="h-14" />)}
                </div>
            </div>
        </main>
    )
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
    const { user, session, refreshProfile } = useAuth()
    const navigate = useNavigate()

    /* ── API-fetched profile data (independent from context cache) ── */
    const [apiProfile, setApiProfile] = useState<UserProfile | null>(null)
    const [fetchLoading, setFetchLoading] = useState(true)
    const [fetchError, setFetchError] = useState('')

    /* ── Form state ── */
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
    const [language, setLanguage] = useState<'vi' | 'en'>('vi')

    /* ── Action state ── */
    const [savingInfo, setSavingInfo] = useState(false)
    const [savingPref, setSavingPref] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

    /* ── Fetch /users/me on mount ── */
    const fetchProfileFromAPI = useCallback(async () => {
        if (!session?.access_token) return
        setFetchLoading(true)
        setFetchError('')
        try {
            const res = await fetch(`${BACKEND_URL}/users/me`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
            })
            if (!res.ok) throw new Error(`Lỗi ${res.status}: Không thể tải thông tin`)
            const data: UserProfile = await res.json()
            setApiProfile(data)
            // Auto-fill form fields
            setName(data.name ?? '')
            setPhone(data.phone ?? '')
            setTheme((data.theme as 'light' | 'dark' | 'system') ?? 'system')
            setLanguage((data.language as 'vi' | 'en') ?? 'vi')
        } catch (e: any) {
            setFetchError(e.message ?? 'Không thể tải hồ sơ')
        } finally {
            setFetchLoading(false)
        }
    }, [session?.access_token])

    useEffect(() => {
        fetchProfileFromAPI()
    }, [fetchProfileFromAPI])

    /* ── Helpers ── */
    const showSuccess = (msg: string) => {
        setSuccess(msg); setError('')
        setTimeout(() => setSuccess(''), 3500)
    }
    const showError = (msg: string) => { setError(msg); setSuccess('') }

    /* ── PATCH /users/me ── */
    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session?.access_token) return
        setSavingInfo(true)
        try {
            const res = await fetch(`${BACKEND_URL}/users/me`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
            })
            if (!res.ok) throw new Error(`Lỗi ${res.status}`)
            const updated: UserProfile = await res.json()
            setApiProfile(updated)
            setName(updated.name ?? '')
            setPhone(updated.phone ?? '')
            await refreshProfile() // sync context cache
            showSuccess('Đã lưu thông tin cá nhân!')
        } catch (e: any) {
            showError(e.message ?? 'Cập nhật thất bại')
        } finally {
            setSavingInfo(false)
        }
    }

    /* ── PATCH /users/me/preferences ── */
    const handleUpdatePreferences = async (key: 'theme' | 'language', value: string) => {
        if (!session?.access_token) return
        const newTheme = key === 'theme' ? (value as 'light' | 'dark' | 'system') : theme
        const newLang  = key === 'language' ? (value as 'vi' | 'en') : language

        // Optimistic update
        if (key === 'theme') { setTheme(newTheme); applyTheme(newTheme) }
        if (key === 'language') setLanguage(newLang)

        setSavingPref(true)
        try {
            const res = await fetch(`${BACKEND_URL}/users/me/preferences`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ theme: newTheme, language: newLang }),
            })
            if (!res.ok) throw new Error(`Lỗi ${res.status}`)
            const updated: UserProfile = await res.json()
            setApiProfile(updated)
            setTheme((updated.theme as 'light' | 'dark' | 'system') ?? 'system')
            setLanguage((updated.language as 'vi' | 'en') ?? 'vi')
            await refreshProfile()
            showSuccess('Đã cập nhật tuỳ chỉnh!')
        } catch (e: any) {
            // Rollback optimistic
            setTheme((apiProfile?.theme as 'light' | 'dark' | 'system') ?? 'system')
            setLanguage((apiProfile?.language as 'vi' | 'en') ?? 'vi')
            showError(e.message ?? 'Cập nhật tuỳ chỉnh thất bại')
        } finally {
            setSavingPref(false)
        }
    }

    /* ── Guard ── */
    if (!user) {
        navigate('/login')
        return null
    }

    /* ── Loading state ── */
    if (fetchLoading) {
        return (
            <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }}>
                <div className="pointer-events-none fixed left-[-10%] top-[-14%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] dark:bg-[#2A1F1A] opacity-40 blur-[160px]" />
                <div className="pointer-events-none fixed bottom-[-12%] right-[-6%] h-[34vw] w-[34vw] rounded-full bg-[#F4EEE7] dark:bg-[#1A1F2A] opacity-40 blur-[160px]" />
                <AppHeader currentPage="home" />
                <ProfileSkeleton />
            </div>
        )
    }

    /* ── Fetch error fallback ── */
    if (fetchError) {
        return (
            <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }}>
                <AppHeader currentPage="home" />
                <main className="mx-auto max-w-2xl px-6 pt-40 text-center">
                    <div className="rounded-[28px] border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-10">
                        <svg className="mx-auto mb-4 h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                        <p className="mb-1 text-base font-semibold text-red-700">Không tải được hồ sơ</p>
                        <p className="mb-6 text-sm text-red-500">{fetchError}</p>
                        <button
                            onClick={fetchProfileFromAPI}
                            className="rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition"
                        >
                            Thử lại
                        </button>
                    </div>
                </main>
            </div>
        )
    }

    const initials = getInitials(apiProfile?.name, user.email)

    return (
        <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C]" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }}>
            {/* Decorative blobs */}
            <div className="pointer-events-none fixed left-[-10%] top-[-14%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] dark:bg-[#2A1F1A] opacity-40 blur-[160px]" />
            <div className="pointer-events-none fixed bottom-[-12%] right-[-6%] h-[34vw] w-[34vw] rounded-full bg-[#F4EEE7] dark:bg-[#1A1F2A] opacity-40 blur-[160px]" />

            <AppHeader currentPage="home" />

            <main className="relative mx-auto max-w-2xl px-6 pb-28 pt-32 lg:px-8">

                {/* Page title */}
                <div className="mb-10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8E6A72]">Tài khoản</p>
                    <h1 className="mt-2 text-4xl tracking-[-0.02em] text-stone-900 dark:text-stone-100" style={{ fontFamily: '"Times New Roman", Georgia, serif' }}>
                        Hồ sơ của tôi
                    </h1>
                </div>

                {/* Avatar card */}
                <div className="mb-8 flex items-center gap-5 rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-6 shadow-sm backdrop-blur-sm">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C9949C] to-[#B7848C] text-xl font-bold text-white shadow-md">
                        {initials}
                        <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#1A1614] bg-emerald-400" />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-stone-900 dark:text-stone-100">{apiProfile?.name || 'Chưa đặt tên'}</p>
                        <p className="truncate text-sm text-stone-400 dark:text-stone-500">{user.email}</p>
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E2C9CC] dark:border-[#4A2D31] bg-[#FBF3F4] dark:bg-[#2A1A1D]/50 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#B7848C]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#B7848C]" />
                                {apiProfile?.plan ?? 'free'}
                            </span>
                            <span className="text-[11px] text-stone-400 dark:text-stone-500">
                                Thành viên từ {formatDate(apiProfile?.created_at)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Toast messages */}
                {success && <Toast message={success} type="success" />}
                {error && <Toast message={error} type="error" />}

                {/* ── Thông tin cá nhân ── */}
                <section className="mb-6 rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-6 shadow-sm backdrop-blur-sm">
                    <h2 className="mb-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500">
                        Thông tin cá nhân
                    </h2>

                    <form onSubmit={handleUpdateInfo} className="space-y-5">
                        <div>
                            <FieldLabel>Họ và tên</FieldLabel>
                            <input
                                id="profile-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nhập họ và tên"
                                className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/60 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 outline-none transition placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-[#B7848C] focus:ring-2 focus:ring-[#B7848C]/10"
                            />
                        </div>

                        <div>
                            <FieldLabel>Email</FieldLabel>
                            <ReadonlyField value={user.email ?? ''} />
                            <p className="mt-1.5 text-[11px] text-stone-400 dark:text-stone-500">Email không thể thay đổi.</p>
                        </div>

                        <div>
                            <FieldLabel>Số điện thoại</FieldLabel>
                            <input
                                id="profile-phone"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Nhập số điện thoại"
                                type="tel"
                                className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/60 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 outline-none transition placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-[#B7848C] focus:ring-2 focus:ring-[#B7848C]/10"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={savingInfo}
                            id="save-profile-btn"
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1F1A17] py-3.5 text-sm font-semibold text-white transition hover:bg-[#2d2622] disabled:opacity-50"
                        >
                            {savingInfo ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                    </svg>
                                    Đang lưu...
                                </>
                            ) : 'Lưu thay đổi'}
                        </button>
                    </form>
                </section>

                {/* ── Tuỳ chỉnh giao diện ── */}
                <section className="rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-6 shadow-sm backdrop-blur-sm">
                    <h2 className="mb-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500">
                        Tuỳ chỉnh giao diện
                    </h2>

                    {/* Theme */}
                    <div className="mb-7">
                        <FieldLabel>Chế độ hiển thị</FieldLabel>
                        <div className="mt-3 grid grid-cols-3 gap-3">
                            {([
                                { value: 'light', icon: '☀️', label: 'Sáng' },
                                { value: 'dark',  icon: '🌙', label: 'Tối' },
                                { value: 'system', icon: '⚙️', label: 'Hệ thống' },
                            ] as const).map((t) => (
                                <button
                                    key={t.value}
                                    onClick={() => handleUpdatePreferences('theme', t.value)}
                                    disabled={savingPref}
                                    className={`flex flex-col items-center gap-1.5 rounded-2xl border py-4 text-sm transition disabled:opacity-60 ${
                                        theme === t.value
                                            ? 'border-[#B7848C] bg-[#FBF3F4] dark:bg-[#2A1A1D]/60 text-[#B7848C] font-semibold shadow-sm'
                                            : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                                    }`}
                                >
                                    <span className="text-xl">{t.icon}</span>
                                    <span className="text-[12px]">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Language */}
                    <div>
                        <FieldLabel>Ngôn ngữ</FieldLabel>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            {([
                                { value: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
                                { value: 'en', flag: '🇺🇸', label: 'English' },
                            ] as const).map((lang) => (
                                <button
                                    key={lang.value}
                                    onClick={() => handleUpdatePreferences('language', lang.value)}
                                    disabled={savingPref}
                                    className={`flex items-center justify-center gap-2.5 rounded-2xl border py-3.5 text-sm transition disabled:opacity-60 ${
                                        language === lang.value
                                            ? 'border-[#B7848C] bg-[#FBF3F4] dark:bg-[#2A1A1D]/60 text-[#B7848C] font-semibold shadow-sm'
                                            : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                                    }`}
                                >
                                    <span className="text-lg">{lang.flag}</span>
                                    <span>{lang.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Account meta strip */}
                <div className="mt-6 flex flex-col gap-1.5 rounded-2xl border border-stone-200/60 dark:border-stone-700/40 bg-white/60 dark:bg-[#1A1614]/60 px-5 py-3.5 text-xs text-stone-400 dark:text-stone-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        ID: <span className="font-mono text-stone-500 dark:text-stone-400">{apiProfile?.id ?? '—'}</span>
                    </span>
                    <span>Cập nhật lần cuối: {formatDate(apiProfile?.updated_at)}</span>
                </div>
            </main>
        </div>
    )
}
