import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import perfumeImage from '../assets/perfume.jpg';

type Mode = 'login' | 'register' | 'forgot' // ✅ THÊM: mode 'forgot'

interface FormState {
    email: string
    password: string
    name: string
    phone: string
}

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

export default function AuthPage() {
    const navigate = useNavigate()
    const [mode, setMode] = useState<Mode>('login')
    const [form, setForm] = useState<FormState>({ email: '', password: '', name: '', phone: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('') // ✅ THÊM: thông báo thành công
    const [showConfirmMessage, setShowConfirmMessage] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setError('')
        setSuccess('')
    }

    // ✅ THÊM: xử lý OAuth Google
    const handleGoogleLogin = async () => {
        setLoading(true)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/'
            }
        })
        if (error) setError(error.message)
        setLoading(false)
    }

    // ✅ THÊM: xử lý quên mật khẩu
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.email) {
            setError('Vui lòng nhập email')
            return
        }
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
            redirectTo: window.location.origin + '/reset-password'
        })
        if (error) {
            setError(error.message)
        } else {
            setSuccess('Email đặt lại mật khẩu đã được gửi, vui lòng kiểm tra hộp thư.')
        }
        setLoading(false)
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')

        if (mode === 'register') {
            const { data, error: authError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: {
                        full_name: form.name,
                        phone: form.phone,
                    },
                    emailRedirectTo: window.location.origin + '/login'
                }
            })

            if (authError) {
                setError(authError.message)
                setLoading(false)
                return
            }

            if (data.user && !data.session) {
                setShowConfirmMessage(true)
            } else if (data.session) {
                navigate('/', { replace: true })
            }
            setLoading(false)
        } else {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password,
            })

            if (authError) {
                setError('Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được xác thực.')
                setLoading(false)
                return
            }
            navigate('/', { replace: true })
        }
    }

    return (
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0D0C] flex flex-col lg:flex-row" style={{ fontFamily: FONT_STACK.sans }}>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative bg-[#FAF8F5] dark:bg-[#0F0D0C]">
                <div className="absolute top-12 left-12 cursor-pointer" onClick={() => navigate('/')}>
                    <span className="text-3xl font-bold text-[#B7848C]" style={{ fontFamily: FONT_STACK.serif }}>PriceHawk</span>
                </div>

                <div className="max-w-md w-full">
                    {showConfirmMessage ? (
                        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
                            <h2 className="text-5xl text-stone-900 dark:text-stone-100" style={{ fontFamily: FONT_STACK.serif }}>Kích hoạt tài khoản</h2>
                            <p className="text-stone-600 dark:text-stone-400 text-xl leading-relaxed">
                                Một liên kết xác thực đã được gửi đến <br /><b>{form.email}</b>.
                                Vui lòng kiểm tra hộp thư Gmail để hoàn tất.
                            </p>
                            <button
                                onClick={() => { setShowConfirmMessage(false); setMode('login'); }}
                                className="text-[#B7848C] font-bold border-b-2 border-[#B7848C] pb-1 uppercase tracking-widest text-sm"
                            >
                                Quay lại Đăng nhập
                            </button>
                        </div>

                        // ✅ THÊM: màn hình quên mật khẩu
                    ) : mode === 'forgot' ? (
                        <div className="space-y-8">
                            <h1 className="text-5xl text-center text-stone-900 dark:text-stone-100 tracking-tight" style={{ fontFamily: FONT_STACK.serif }}>
                                Quên mật khẩu
                            </h1>
                            <p className="text-center text-stone-500 dark:text-stone-400 text-sm">
                                Nhập email để nhận liên kết đặt lại mật khẩu
                            </p>

                            {error && <p className="text-red-500 text-xs text-center py-3 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</p>}
                            {success && <p className="text-green-600 text-xs text-center py-3 bg-green-50 dark:bg-green-900/20 rounded-lg">{success}</p>}

                            <form onSubmit={handleForgotPassword} className="space-y-8">
                                <Field label="Email" name="email" type="email" placeholder="email@example.com" value={form.email} onChange={handleChange} />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-[#B7848C] hover:bg-[#a1737a] text-white rounded-full text-lg font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                                >
                                    {loading ? 'Đang gửi...' : 'Gửi email'}
                                </button>
                            </form>

                            <p className="text-center text-sm text-stone-500 dark:text-stone-400">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                                    className="font-bold text-stone-900 dark:text-stone-100 border-b-2 border-stone-200 dark:border-stone-700 hover:border-[#B7848C] transition-colors"
                                >
                                    Quay lại Đăng nhập
                                </button>
                            </p>
                        </div>

                    ) : (
                        <>
                            <h1 className="text-6xl text-center mb-10 text-stone-900 dark:text-stone-100 tracking-tight" style={{ fontFamily: FONT_STACK.serif }}>
                                {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                            </h1>

                            {error && <p className="text-red-500 text-xs mb-6 text-center py-3 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</p>}

                            {/* ✅ Nút Google OAuth */}
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full mb-8 py-3 border border-stone-200 dark:border-stone-700 rounded-full flex items-center justify-center gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition text-sm text-stone-700 dark:text-stone-300 disabled:opacity-50"
                            >
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Tiếp tục với Google
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-4 mb-8">
                                <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
                                <span className="text-xs text-stone-400 uppercase tracking-widest">hoặc</span>
                                <div className="flex-1 h-px bg-stone-200 dark:bg-stone-800" />
                            </div>

                            <form onSubmit={handleAuth} className="space-y-10">
                                {mode === 'register' && (
                                    <>
                                        <Field label="Họ và tên" name="name" type="text" placeholder="Họ và tên" value={form.name} onChange={handleChange} />
                                        <Field label="Số điện thoại" name="phone" type="tel" placeholder="Số điện thoại" value={form.phone} onChange={handleChange} />
                                    </>
                                )}
                                <Field label="Email" name="email" type="email" placeholder="email@example.com" value={form.email} onChange={handleChange} />
                                <Field label="Mật khẩu" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} />

                                {/* ✅ THÊM: nút quên mật khẩu - chỉ hiện ở mode login */}
                                {mode === 'login' && (
                                    <div className="text-right -mt-6">
                                        <button
                                            type="button"
                                            onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                                            className="text-xs text-stone-400 hover:text-[#B7848C] transition"
                                        >
                                            Quên mật khẩu?
                                        </button>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-6 bg-[#B7848C] hover:bg-[#a1737a] text-white rounded-full text-lg font-bold uppercase tracking-[0.25em] shadow-2xl shadow-[#B7848C]/30 transition-all active:scale-[0.96] disabled:opacity-50 mt-4"
                                >
                                    {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')}
                                </button>
                            </form>

                            <p className="text-center text-sm text-stone-500 mt-10 tracking-wide">
                                {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} {' '}
                                <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} className="font-bold text-stone-900 dark:text-stone-100 border-b-2 border-stone-200 dark:border-stone-700 hover:border-[#B7848C] transition-colors ml-2">
                                    {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập ngay'}
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>

            <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-stone-900">
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 hover:scale-110 opacity-70"
                    style={{ backgroundImage: `url(${perfumeImage})` }}
                />
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative z-10 m-auto text-center px-16 pointer-events-none">
                    <h2 className="text-7xl lg:text-8xl text-white leading-[1.1] font-normal tracking-tight drop-shadow-2xl" style={{ fontFamily: FONT_STACK.serif }}>
                        Mua sắm <span className="italic font-light opacity-80">tinh tế,</span><br />
                        thấy đúng <span className="text-[#B7848C]">giá đẹp.</span>
                    </h2>
                </div>
            </div>
        </div>
    )
}

function Field({ label, name, type, placeholder, value, onChange }: any) {
    return (
        <div className="space-y-3 relative group">
            <label className="block text-[12px] uppercase tracking-[0.3em] font-black text-stone-400 ml-1">
                {label}
            </label>
            <input
                name={name}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full px-1 py-4 text-2xl bg-transparent border-b-2 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-300 dark:placeholder-stone-700 focus:outline-none focus:border-[#B7848C] transition-all duration-300 font-medium"
            />
            <div className="absolute bottom-0 left-0 w-0 h-[3px] bg-[#B7848C] transition-all duration-500 group-focus-within:w-full" />
        </div>
    )
}
