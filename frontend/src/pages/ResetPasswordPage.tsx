import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { applyTheme } from '../context/AuthContext';

const FONT_STACK = {
    serif: '"Times New Roman", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // Áp dụng theme mặc định hoặc theo system nếu chưa có profile
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Kiểm tra xem có session do hash trả về hay không, supabase.auth.getSession() sẽ tự parse
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
            }
        });
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setLoading(true);

        // Supabase sẽ tự động cập nhật mật khẩu cho user hiện tại (nếu session được tạo từ recovery link)
        const { error } = await supabase.auth.updateUser({
            password: password
        });

        if (error) {
            setError(error.message);
        } else {
            setSuccess('Cập nhật mật khẩu thành công! Chuyển hướng về trang chủ...');
            setTimeout(() => {
                navigate('/');
            }, 2000);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0D0C] flex flex-col items-center justify-center p-6" style={{ fontFamily: FONT_STACK.sans }}>
            <div className="absolute top-12 left-12 cursor-pointer" onClick={() => navigate('/')}>
                <span className="text-3xl font-bold text-[#B7848C]" style={{ fontFamily: FONT_STACK.serif }}>PriceHawk</span>
            </div>

            <div className="max-w-md w-full bg-white dark:bg-[#1A1614] rounded-[34px] shadow-[0_14px_35px_rgba(15,23,42,0.04)] p-10 border border-stone-200/80 dark:border-stone-700/40">
                <h1 className="text-4xl text-center text-stone-900 dark:text-stone-100 tracking-tight mb-4" style={{ fontFamily: FONT_STACK.serif }}>
                    Tạo mật khẩu mới
                </h1>
                <p className="text-center text-sm text-stone-500 dark:text-stone-400 mb-8">
                    Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
                </p>

                {error && <p className="text-red-500 text-xs text-center py-3 mb-6 bg-red-50 dark:bg-red-900/20 rounded-lg">{error}</p>}
                {success && <p className="text-green-600 text-xs text-center py-3 mb-6 bg-green-50 dark:bg-green-900/20 rounded-lg">{success}</p>}

                <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="space-y-3 relative group">
                        <label className="block text-[12px] uppercase tracking-[0.3em] font-black text-stone-400 ml-1">
                            Mật khẩu mới
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-1 py-4 text-2xl bg-transparent border-b-2 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-300 dark:placeholder-stone-700 focus:outline-none focus:border-[#B7848C] transition-all duration-300 font-medium"
                        />
                        <div className="absolute bottom-0 left-0 w-0 h-[3px] bg-[#B7848C] transition-all duration-500 group-focus-within:w-full" />
                    </div>

                    <div className="space-y-3 relative group">
                        <label className="block text-[12px] uppercase tracking-[0.3em] font-black text-stone-400 ml-1">
                            Xác nhận mật khẩu
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-1 py-4 text-2xl bg-transparent border-b-2 border-stone-200 dark:border-stone-700 text-stone-900 dark:text-stone-100 placeholder-stone-300 dark:placeholder-stone-700 focus:outline-none focus:border-[#B7848C] transition-all duration-300 font-medium"
                        />
                        <div className="absolute bottom-0 left-0 w-0 h-[3px] bg-[#B7848C] transition-all duration-500 group-focus-within:w-full" />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !!success}
                        className="w-full py-5 bg-[#B7848C] hover:bg-[#a1737a] text-white rounded-full text-lg font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-50 mt-4 shadow-2xl shadow-[#B7848C]/30"
                    >
                        {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                    </button>
                </form>

                <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-8">
                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        className="font-bold text-stone-900 dark:text-stone-100 border-b-2 border-stone-200 dark:border-stone-700 hover:border-[#B7848C] transition-colors"
                    >
                        Quay lại Đăng nhập
                    </button>
                </p>
            </div>
        </div>
    );
}
