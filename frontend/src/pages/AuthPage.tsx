// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import perfumeImage from '../assets/perfume.jpg';

type Mode = 'login' | 'register' | 'forgot'

interface FormState {
    email: string
    password: string
    name: string
    phone: string
}

const FONT_STACK = {
    serif: '"Playfair Display", "Times New Roman", Georgia, serif',
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
}

export default function AuthPage() {
    const navigate = useNavigate()
    const [mode, setMode] = useState<Mode>('login')
    const [form, setForm] = useState<FormState>({ email: '', password: '', name: '', phone: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showConfirmMessage, setShowConfirmMessage] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setError('')
        setSuccess('')
    }

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
        <div className="min-h-screen bg-white dark:bg-[#0A0A0A] flex flex-col lg:flex-row" style={{ fontFamily: FONT_STACK.sans }}>
            
            {/* Left Panel: Form */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center px-8 sm:px-16 xl:px-24 relative bg-white dark:bg-[#0A0A0A] py-12 lg:py-0">
                {/* Logo */}
                <div className="absolute top-8 left-8 sm:top-10 sm:left-10 cursor-pointer" onClick={() => navigate('/')}>
                    <span className="text-2xl font-normal tracking-tight text-stone-900 dark:text-white transition-opacity hover:opacity-80" style={{ fontFamily: FONT_STACK.serif }}>
                        Price<span className="italic text-[#B7848C]">Hawk</span>
                    </span>
                </div>

                <div className="max-w-[380px] w-full mx-auto mt-10 lg:mt-0">
                    {showConfirmMessage ? (
                        <div className="text-center space-y-6 animate-in fade-in zoom-in duration-500">
                            <div className="w-16 h-16 bg-[#B7848C]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-[#B7848C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-medium text-stone-900 dark:text-white" style={{ fontFamily: FONT_STACK.serif }}>Kiểm tra email của bạn</h2>
                            <p className="text-stone-500 dark:text-stone-400 text-sm leading-relaxed">
                                Chúng tôi đã gửi một liên kết xác thực đến <span className="font-medium text-stone-800 dark:text-stone-200">{form.email}</span>. Vui lòng kiểm tra hộp thư để kích hoạt tài khoản.
                            </p>
                            <button
                                onClick={() => { setShowConfirmMessage(false); setMode('login'); }}
                                className="mt-4 text-sm font-medium text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
                            >
                                ← Quay lại đăng nhập
                            </button>
                        </div>

                    ) : mode === 'forgot' ? (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h1 className="text-3xl font-medium text-stone-900 dark:text-white" style={{ fontFamily: FONT_STACK.serif }}>
                                    Khôi phục mật khẩu
                                </h1>
                                <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                                    Nhập email của bạn, chúng tôi sẽ gửi liên kết để tạo mật khẩu mới.
                                </p>
                            </div>

                            {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-500/20">{error}</div>}
                            {success && <div className="p-3 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-500/20">{success}</div>}

                            <form onSubmit={handleForgotPassword} className="space-y-5">
                                <Field label="Email" name="email" type="email" placeholder="Nhập địa chỉ email" value={form.email} onChange={handleChange} />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-200 text-white dark:text-stone-900 rounded-xl text-sm font-medium transition-all disabled:opacity-50 mt-2 shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
                                >
                                    {loading ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
                                </button>
                            </form>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                                    className="text-sm font-medium text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
                                >
                                    ← Quay lại đăng nhập
                                </button>
                            </div>
                        </div>

                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div>
                                <h1 className="text-[2rem] font-medium text-stone-900 dark:text-white leading-tight" style={{ fontFamily: FONT_STACK.serif }}>
                                    {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
                                </h1>
                                <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
                                    {mode === 'login' ? 'Vui lòng đăng nhập để tiếp tục' : 'Đăng ký để trải nghiệm mua sắm thông minh'}
                                </p>
                            </div>

                            {error && <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-500/20">{error}</div>}

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={loading}
                                className="w-full py-3 flex items-center justify-center gap-3 bg-white dark:bg-[#141414] border border-stone-200 dark:border-stone-800 rounded-xl text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/80 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)] disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Tiếp tục với Google
                            </button>

                            <div className="flex items-center gap-4 py-2">
                                <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
                                <span className="text-xs font-medium text-stone-400 uppercase tracking-widest">hoặc</span>
                                <div className="flex-1 h-px bg-stone-100 dark:bg-stone-800" />
                            </div>

                            <form onSubmit={handleAuth} className="space-y-4">
                                {mode === 'register' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Họ và tên" name="name" type="text" placeholder="Nguyễn Văn A" value={form.name} onChange={handleChange} />
                                        <Field label="Số điện thoại" name="phone" type="tel" placeholder="090 123 4567" value={form.phone} onChange={handleChange} />
                                    </div>
                                )}
                                <Field label="Email" name="email" type="email" placeholder="name@example.com" value={form.email} onChange={handleChange} />
                                
                                <div className="space-y-1 relative">
                                    <Field label="Mật khẩu" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} />
                                    {mode === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
                                            className="absolute right-0 top-0 text-[13px] font-medium text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
                                        >
                                            Quên mật khẩu?
                                        </button>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 dark:bg-white dark:hover:bg-stone-200 text-white dark:text-stone-900 rounded-xl text-sm font-medium transition-all disabled:opacity-50 mt-6 shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
                                >
                                    {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Đăng ký')}
                                </button>
                            </form>

                            <p className="text-center text-sm text-stone-500 pt-2">
                                {mode === 'login' ? 'Bạn chưa có tài khoản?' : 'Đã có tài khoản?'} {' '}
                                <button 
                                    type="button" 
                                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} 
                                    className="font-medium text-stone-900 dark:text-white hover:underline underline-offset-4 decoration-stone-300"
                                >
                                    {mode === 'login' ? 'Tạo tài khoản' : 'Đăng nhập'}
                                </button>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Panel: Image Split */}
            <div className="hidden lg:block lg:w-[55%] relative overflow-hidden bg-stone-100 dark:bg-stone-900">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${perfumeImage})` }}
                />
                {/* Lớp overlay gradient thay vì bệt đen mờ, giúp text nổi nhưng vẫn thấy rõ hình ảnh */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                <div className="absolute bottom-20 left-20 right-20 z-10 pointer-events-none text-white">
                    <h2 className="text-[3.5rem] leading-[1.1] font-normal tracking-tight" style={{ fontFamily: FONT_STACK.serif }}>
                        Mua sắm <span className="italic text-white/80">tinh tế,</span><br />
                        thấy đúng <span className="text-[#E8C2C7]">giá đẹp.</span>
                    </h2>
                    <p className="mt-4 text-white/70 text-lg font-light max-w-md">
                        Trải nghiệm không gian mua sắm tuyển chọn với mức giá được tối ưu hóa tốt nhất cho bạn.
                    </p>
                </div>
            </div>
        </div>
    )
}

// Component Field được thiết kế lại tối giản, sạch sẽ hơn
function Field({ label, name, type, placeholder, value, onChange }: any) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="block text-[13px] font-medium text-stone-700 dark:text-stone-300">
                {label}
            </label>
            <input
                name={name}
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className="w-full px-4 py-3 text-sm bg-stone-50 dark:bg-[#141414] border border-stone-200 dark:border-stone-800 rounded-xl text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-white/10 focus:border-stone-900 dark:focus:border-white transition-all duration-200"
            />
        </div>
    )
}