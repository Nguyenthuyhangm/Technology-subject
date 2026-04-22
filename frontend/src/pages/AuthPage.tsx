import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import perfumeImage from '../assets/perfume.jpg';

type Mode = 'login' | 'register'

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
    const [showConfirmMessage, setShowConfirmMessage] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setError('')
    }

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        if (mode === 'register') {
            // Đăng ký qua Supabase Auth
            const { data, error: authError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: {
                        full_name: form.name,
                        phone: form.phone,
                    },
                    // Đảm bảo URL này đã được thêm vào "Redirect URLs" trong Supabase Dashboard
                    emailRedirectTo: window.location.origin + '/login'
                }
            })

            if (authError) {
                setError(authError.message)
                setLoading(false)
                return
            }

            // Nếu đăng ký thành công và cần xác nhận email (session sẽ null)
            if (data.user && !data.session) {
                setShowConfirmMessage(true)
            } else if (data.session) {
                // Trường hợp auto-confirm đang bật (không nên nếu muốn kích hoạt qua mail)
                navigate('/', { replace: true })
            }
            setLoading(false)
        } else {
            // Đăng nhập
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password,
            })

            if (authError) {
                // Thông báo lỗi nếu sai pass hoặc chưa kích hoạt email
                setError('Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được xác thực.')
                setLoading(false)
                return
            }
            navigate('/', { replace: true })
        }
    }

    return (
        <div className="min-h-screen bg-[#FAF8F5] flex flex-col lg:flex-row" style={{ fontFamily: FONT_STACK.sans }}>

            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative bg-[#FAF8F5]">
                <div className="absolute top-12 left-12 cursor-pointer" onClick={() => navigate('/')}>
                    <span className="text-3xl font-bold text-[#B7848C]" style={{ fontFamily: FONT_STACK.serif }}>PriceHawk</span>
                </div>

                <div className="max-w-md w-full">
                    {showConfirmMessage ? (
                        <div className="text-center space-y-8 animate-in fade-in zoom-in duration-500">
                            <h2 className="text-5xl text-stone-900" style={{ fontFamily: FONT_STACK.serif }}>Kích hoạt tài khoản</h2>
                            <p className="text-stone-600 text-xl leading-relaxed">
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
                    ) : (
                        <>
                            <h1 className="text-6xl text-center mb-16 text-stone-900 tracking-tight" style={{ fontFamily: FONT_STACK.serif }}>
                                {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                            </h1>

                            {error && <p className="text-red-500 text-xs mb-8 text-center py-3 bg-red-50 rounded-lg">{error}</p>}

                            <form onSubmit={handleAuth} className="space-y-12">
                                {mode === 'register' && (
                                    <>
                                        <Field label="Họ và tên" name="name" type="text" placeholder="Họ và tên" value={form.name} onChange={handleChange} />
                                        <Field label="Số điện thoại" name="phone" type="tel" placeholder="Số điện thoại" value={form.phone} onChange={handleChange} />
                                    </>
                                )}
                                <Field label="Email" name="email" type="email" placeholder="email@example.com" value={form.email} onChange={handleChange} />
                                <Field label="Mật khẩu" name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} />

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-6 bg-[#B7848C] hover:bg-[#a1737a] text-white rounded-full text-lg font-bold uppercase tracking-[0.25em] shadow-2xl shadow-[#B7848C]/30 transition-all active:scale-[0.96] disabled:opacity-50 mt-10"
                                >
                                    {loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')}
                                </button>
                            </form>

                            <p className="text-center text-sm text-stone-500 mt-12 tracking-wide">
                                {mode === 'login' ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'} {' '}
                                <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-stone-900 border-b-2 border-stone-200 hover:border-[#B7848C] transition-colors ml-2">
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
                className="w-full px-1 py-4 text-2xl bg-transparent border-b-2 border-stone-200 text-stone-900 placeholder-stone-300 focus:outline-none focus:border-[#B7848C] transition-all duration-300 font-medium"
            />
            <div className="absolute bottom-0 left-0 w-0 h-[3px] bg-[#B7848C] transition-all duration-500 group-focus-within:w-full" />
        </div>
    )
}