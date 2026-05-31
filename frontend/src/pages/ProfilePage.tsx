import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, applyTheme } from '../context/AuthContext'
import { BACKEND_URL } from '../lib/supabase'
import type { UserProfile } from '../lib/supabase'
import AppHeader from '../components/layout/AppHeader'
import PaymentMethodModal from "../components/premium/PaymentMethodModal";

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const

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
function isPremiumActive(expire?: string | null): boolean {
    if (!expire) return false
    return new Date(expire) > new Date()
}

function daysRemaining(expire?: string | null): number {
    if (!expire) return 0
    const diff = new Date(expire).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
    if (!message) return null
    return (
        <div className={`mb-6 flex items-center gap-3 rounded-2xl border px-5 py-3.5 text-sm font-medium shadow-sm ${
            type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-400'
                : 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400'
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

function SkeletonLine({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
    return <div className={`${w} ${h} animate-pulse rounded-xl bg-stone-200/70 dark:bg-stone-700/50`} />
}

function ProfileSkeleton() {
    return (
        <main className="relative mx-auto max-w-2xl px-6 pb-28 pt-32 lg:px-8">
            <div className="mb-10">
                <SkeletonLine w="w-20" h="h-3" />
                <div className="mt-3"><SkeletonLine w="w-48" h="h-9" /></div>
            </div>
            <div className="mb-6 flex items-center gap-5 rounded-[28px] border border-stone-200/80 bg-white/80 p-6 shadow-sm">
                <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-stone-200" />
                <div className="flex-1 space-y-2">
                    <SkeletonLine w="w-40" h="h-4" />
                    <SkeletonLine w="w-56" h="h-3" />
                    <SkeletonLine w="w-24" h="h-5" />
                </div>
            </div>
            <div className="mb-6 space-y-5 rounded-[28px] border border-stone-200/80 bg-white/80 p-6 shadow-sm">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                        <SkeletonLine w="w-20" h="h-3" />
                        <SkeletonLine h="h-11" />
                    </div>
                ))}
                <SkeletonLine h="h-12" />
            </div>
            <div className="space-y-5 rounded-[28px] border border-stone-200/80 bg-white/80 p-6 shadow-sm">
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

export default function ProfilePage() {
    const { user, session, refreshProfile } = useAuth()
    const navigate = useNavigate()
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [hasPendingOrder, setHasPendingOrder] = useState(false);
    const [apiProfile, setApiProfile] = useState<UserProfile | null>(null)
    const [fetchLoading, setFetchLoading] = useState(true)
    const [fetchError, setFetchError] = useState('')

    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
    const [language, setLanguage] = useState<'vi' | 'en'>('vi')

    const [savingInfo, setSavingInfo] = useState(false)
    const [savingPref, setSavingPref] = useState(false)
    const [success, setSuccess] = useState('')
    const [error, setError] = useState('')

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

    useEffect(() => { fetchProfileFromAPI() }, [fetchProfileFromAPI])

    // Check xem có order đang chờ duyệt không — poll mỗi 15s
    useEffect(() => {
        if (!session?.access_token) return
        const checkPending = () => {
            fetch(`${BACKEND_URL}/api/payments/my-pending`, {
                headers: { Authorization: `Bearer ${session.access_token}` },
            }).then(res => res.ok ? res.json() : null)
              .then(data => { if (data != null) setHasPendingOrder(data.hasPending) })
              .catch(() => {})
        }
        checkPending()
        const interval = setInterval(checkPending, 15_000)
        return () => clearInterval(interval)
    }, [session?.access_token])

    const showSuccess = (msg: string) => {
        setSuccess(msg); setError('')
        setTimeout(() => setSuccess(''), 3500)
    }
    const showError = (msg: string) => { setError(msg); setSuccess('') }

    const handleUpdateInfo = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!session?.access_token) return
        setSavingInfo(true)
        try {
            const res = await fetch(`${BACKEND_URL}/users/me`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
            })
            if (!res.ok) throw new Error(`Lỗi ${res.status}`)
            const updated: UserProfile = await res.json()
            setApiProfile(updated)
            setName(updated.name ?? '')
            setPhone(updated.phone ?? '')
            await refreshProfile()
            showSuccess('Đã lưu thông tin cá nhân!')
        } catch (e: any) {
            showError(e.message ?? 'Cập nhật thất bại')
        } finally {
            setSavingInfo(false)
        }
    }

    const handleUpdatePreferences = async (key: 'theme' | 'language', value: string) => {
        if (!session?.access_token) return
        const newTheme = key === 'theme' ? (value as 'light' | 'dark' | 'system') : theme
        const newLang  = key === 'language' ? (value as 'vi' | 'en') : language
        if (key === 'theme') { setTheme(newTheme); applyTheme(newTheme) }
        if (key === 'language') setLanguage(newLang)
        setSavingPref(true)
        try {
            const res = await fetch(`${BACKEND_URL}/users/me/preferences`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
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
            setTheme((apiProfile?.theme as 'light' | 'dark' | 'system') ?? 'system')
            setLanguage((apiProfile?.language as 'vi' | 'en') ?? 'vi')
            showError(e.message ?? 'Cập nhật tuỳ chỉnh thất bại')
        } finally {
            setSavingPref(false)
        }
    }

    if (!user) { navigate('/login'); return null }

    if (fetchLoading) {
        return (
            <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C]" style={{ fontFamily: FONT_STACK.sans }}>
                <div className="pointer-events-none fixed left-[-10%] top-[-14%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] dark:bg-[#2A1F1A] opacity-40 blur-[160px]" />
                <div className="pointer-events-none fixed bottom-[-12%] right-[-6%] h-[34vw] w-[34vw] rounded-full bg-[#F4EEE7] dark:bg-[#1A1F2A] opacity-40 blur-[160px]" />
                <AppHeader currentPage="home" />
                <ProfileSkeleton />
            </div>
        )
    }

    if (fetchError) {
        return (
            <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C]" style={{ fontFamily: FONT_STACK.sans }}>
                <div className="pointer-events-none fixed left-[-10%] top-[-14%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] dark:bg-[#2A1F1A] opacity-40 blur-[160px]" />
                <AppHeader currentPage="home" />
                <main className="mx-auto max-w-2xl px-6 pt-40 text-center">
                    <div className="rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-10 shadow-sm">
                        <p className="mb-1 text-base font-semibold text-stone-900 dark:text-stone-100">Không tải được hồ sơ</p>
                        <p className="mb-6 text-sm text-stone-500 dark:text-stone-400">{fetchError}</p>
                        <button
                            onClick={fetchProfileFromAPI}
                            className="rounded-full bg-[#1F1A17] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
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
        <div className="min-h-screen bg-[#FCF8F4] dark:bg-[#0F0D0C] text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.sans }}>
            <div className="pointer-events-none fixed left-[-10%] top-[-14%] h-[42vw] w-[42vw] rounded-full bg-[#F7ECEE] dark:bg-[#2A1F1A] opacity-40 blur-[160px]" />
            <div className="pointer-events-none fixed bottom-[-12%] right-[-6%] h-[34vw] w-[34vw] rounded-full bg-[#F4EEE7] dark:bg-[#1A1F2A] opacity-40 blur-[160px]" />

            <AppHeader currentPage="home" />

            <main className="relative mx-auto max-w-2xl px-6 pb-28 pt-32 lg:px-8">

                {/* Page title */}
                <div className="mb-10">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8E6A72]">Tài khoản</p>
                    <h1 className="mt-2 text-4xl tracking-[-0.02em] text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.serif }}>
                        Hồ sơ của tôi
                    </h1>
                </div>

                {/* Avatar card */}
                <div className="mb-6 flex items-center gap-5 rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm">
                    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#C9949C] to-[#B7848C] text-xl font-bold text-white shadow-md">
                        {initials}
                        <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#1A1614] bg-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-stone-900 dark:text-stone-100">
                            {apiProfile?.name || 'Chưa đặt tên'}
                        </p>
                        <p className="truncate text-sm text-stone-400 dark:text-stone-500">{user.email}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
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
                {/* Premium Plan */}
                <section className="mb-6 rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm">
                    <h2 className="mb-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500">
                        Subscription Plan
                    </h2>

                    <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-stone-900 dark:text-stone-100">
                                {apiProfile?.plan === 'premium'
                                    ? '👑 Premium Plan'
                                    : 'Free Plan'}
                            </p>

                            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                                {apiProfile?.plan === 'premium'
                                    ? `Hết hạn: ${formatDate(apiProfile.premium_expires_at)}`
                                    : 'Nâng cấp để mở khóa unlimited alerts, wishlist và priority crawl'}
                            </p>

                            {apiProfile?.plan === 'premium' && (
                                <div className="mt-2 flex items-center gap-2">
                                    <p className={`text-xs font-medium ${
                                        isPremiumActive(apiProfile.premium_expires_at)
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-red-500 dark:text-red-400'
                                    }`}>
                                        {isPremiumActive(apiProfile.premium_expires_at)
                                            ? 'Đang hoạt động'
                                            : 'Đã hết hạn'}
                                    </p>
                                    {isPremiumActive(apiProfile.premium_expires_at) && (
                                        <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                            Còn {daysRemaining(apiProfile.premium_expires_at)} ngày
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Nút Upgrade — ẩn khi premium còn hạn hoặc đang chờ duyệt */}
                        {hasPendingOrder ? (
                            <span className="rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                                ⏳ Đang chờ duyệt
                            </span>
                        ) : apiProfile?.plan === 'premium' && isPremiumActive(apiProfile.premium_expires_at) ? (
                            <span className="rounded-full border border-stone-200 dark:border-stone-700 px-4 py-2.5 text-xs font-semibold text-stone-400 dark:text-stone-500 cursor-not-allowed">
                                Còn hiệu lực
                            </span>
                        ) : (
                            <button
                                onClick={() => setPaymentOpen(true)}
                                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                                    apiProfile?.plan === 'premium'
                                        ? 'border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800'
                                        : 'bg-[#B7848C] text-white hover:opacity-90'
                                }`}
                            >
                                {apiProfile?.plan === 'premium' ? 'Renew Plan' : 'Upgrade'}
                            </button>
                        )}
                    </div>
                </section>
                {/* Toast */}
                {success && <Toast message={success} type="success" />}
                {error && <Toast message={error} type="error" />}

                {/* Thông tin cá nhân */}
                <section className="mb-6 rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm">
                    <h2 className="mb-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500">
                        Thông tin cá nhân
                    </h2>

                    <form onSubmit={handleUpdateInfo} className="space-y-5">
                        <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                                Họ và tên
                            </label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nhập họ và tên"
                                className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/60 px-4 py-3 text-sm text-stone-900 dark:text-stone-100 outline-none transition placeholder:text-stone-300 dark:placeholder:text-stone-600 focus:border-[#B7848C] focus:ring-2 focus:ring-[#B7848C]/10"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                                Email
                            </label>
                            <div className="w-full rounded-2xl border border-stone-100 dark:border-stone-700/60 bg-stone-50 dark:bg-stone-800/30 px-4 py-3 text-sm text-stone-400 dark:text-stone-500 cursor-not-allowed select-none">
                                {user.email}
                            </div>
                            <p className="mt-1.5 text-[11px] text-stone-400 dark:text-stone-500">Email không thể thay đổi.</p>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                                Số điện thoại
                            </label>
                            <input
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
                            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1F1A17] dark:bg-stone-100 py-3.5 text-sm font-semibold text-white dark:text-stone-900 transition hover:opacity-90 disabled:opacity-50"
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

                {/* Tuỳ chỉnh giao diện */}
                <section className="mb-6 rounded-[28px] border border-stone-200/80 dark:border-stone-700/40 bg-white/80 dark:bg-[#1A1614]/80 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur-sm">
                    <h2 className="mb-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 dark:text-stone-500">
                        Tuỳ chỉnh giao diện
                    </h2>

                    <div className="mb-7">
                        <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                            Chế độ hiển thị
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {/* Light */}
                            <button
                                onClick={() => handleUpdatePreferences('theme', 'light')}
                                disabled={savingPref}
                                className={`flex flex-col items-center gap-2 rounded-2xl border py-4 text-sm transition disabled:opacity-60 ${
                                    theme === 'light'
                                        ? 'border-[#B7848C] bg-[#FBF3F4] dark:bg-[#2A1A1D]/60 text-[#B7848C] font-semibold shadow-sm'
                                        : 'border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                                }`}
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
                                </svg>
                                <span className="text-[12px]">Sáng</span>
                            </button>

                            {/* Dark */}
                            <button
                                onClick={() => handleUpdatePreferences('theme', 'dark')}
                                disabled={savingPref}
                                className={`flex flex-col items-center gap-2 rounded-2xl border py-4 text-sm transition disabled:opacity-60 ${
                                    theme === 'dark'
                                        ? 'border-[#B7848C] bg-[#FBF3F4] dark:bg-[#2A1A1D]/60 text-[#B7848C] font-semibold shadow-sm'
                                        : 'border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                                }`}
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                                </svg>
                                <span className="text-[12px]">Tối</span>
                            </button>

                            {/* System */}
                            <button
                                onClick={() => handleUpdatePreferences('theme', 'system')}
                                disabled={savingPref}
                                className={`flex flex-col items-center gap-2 rounded-2xl border py-4 text-sm transition disabled:opacity-60 ${
                                    theme === 'system'
                                        ? 'border-[#B7848C] bg-[#FBF3F4] dark:bg-[#2A1A1D]/60 text-[#B7848C] font-semibold shadow-sm'
                                        : 'border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                                }`}
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
                                </svg>
                                <span className="text-[12px]">Hệ thống</span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="mb-3 block text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400">
                            Ngôn ngữ
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Tiếng Việt */}
                            <button
                                onClick={() => handleUpdatePreferences('language', 'vi')}
                                disabled={savingPref}
                                className={`flex items-center justify-center gap-2.5 rounded-2xl border py-3.5 text-sm transition disabled:opacity-60 ${
                                    language === 'vi'
                                        ? 'border-[#B7848C] bg-[#FBF3F4] dark:bg-[#2A1A1D]/60 text-[#B7848C] font-semibold shadow-sm'
                                        : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                                }`}
                            >
                                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 16" fill="none">
                                    <rect width="24" height="16" rx="2" fill="#DA251D"/>
                                    <polygon points="12,3 13.5,7.5 18,7.5 14.3,10.2 15.7,14.5 12,11.8 8.3,14.5 9.7,10.2 6,7.5 10.5,7.5" fill="#FFFF00"/>
                                </svg>
                                <span>Tiếng Việt</span>
                            </button>

                            {/* English */}
                            <button
                                onClick={() => handleUpdatePreferences('language', 'en')}
                                disabled={savingPref}
                                className={`flex items-center justify-center gap-2.5 rounded-2xl border py-3.5 text-sm transition disabled:opacity-60 ${
                                    language === 'en'
                                        ? 'border-[#B7848C] bg-[#FBF3F4] dark:bg-[#2A1A1D]/60 text-[#B7848C] font-semibold shadow-sm'
                                        : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                                }`}
                            >
                                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 16" fill="none">
                                    <rect width="24" height="16" rx="2" fill="#012169"/>
                                    <path d="M0 0 L24 16 M24 0 L0 16" stroke="white" strokeWidth="3"/>
                                    <path d="M0 0 L24 16 M24 0 L0 16" stroke="#C8102E" strokeWidth="1.5"/>
                                    <path d="M12 0 V16 M0 8 H24" stroke="white" strokeWidth="4"/>
                                    <path d="M12 0 V16 M0 8 H24" stroke="#C8102E" strokeWidth="2.5"/>
                                </svg>
                                <span>English</span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* Account meta */}
                <div className="flex items-center justify-end rounded-2xl border border-stone-200/60 dark:border-stone-700/40 bg-white/60 dark:bg-[#1A1614]/60 px-5 py-3.5 text-xs text-stone-400 dark:text-stone-500">
                    <span>Cập nhật lần cuối: {formatDate(apiProfile?.updated_at)}</span>
                </div>

            </main>
            <PaymentMethodModal
                open={paymentOpen}
                loading={paymentLoading}
                onClose={() => setPaymentOpen(false)}
                onConfirm={async (plan) => {
                    if (!session?.access_token) return
                    setPaymentLoading(true)
                    try {
                        const res = await fetch(`${BACKEND_URL}/api/payments/create`, {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${session.access_token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ plan, method: 'BANK_QR' }),
                        })
                        if (!res.ok) throw new Error(`Lỗi ${res.status}`)
                        const order = await res.json()
                        setPaymentOpen(false)
                        navigate('/payment/qr', {
                            state: {
                                orderId: order.id,
                                transferCode: order.transferCode,
                                amount: order.amount,
                                plan,
                            },
                        })
                    } catch (e: any) {
                        showError(e.message ?? 'Không thể tạo đơn thanh toán')
                    } finally {
                        setPaymentLoading(false)
                    }
                }}
            />
        </div>
    )
}