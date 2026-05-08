import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const

export type AppHeaderPage =
  | 'home'
  | 'search'
  | 'deals'
  | 'wishlist'
  | 'alerts'
  | 'product'
  | 'category'

type AppHeaderProps = {
  currentPage: AppHeaderPage
  className?: string
}

const navItems: Array<{
  key: Exclude<AppHeaderPage, 'product'>
  label: string
  to: string
}> = [
    { key: 'home', label: 'Trang chủ', to: '/' },
    { key: 'search', label: 'So sánh giá', to: '/search' },
    { key: 'deals', label: 'Chọn lọc hôm nay', to: '/deals' },
    { key: 'wishlist', label: 'Yêu thích', to: '/wishlist' },
    { key: 'alerts', label: 'Theo dõi giá', to: '/alerts' },
  ]

export default function AppHeader({
  currentPage,
  className = '',
}: AppHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  // ✅ THÊM: dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ✅ THÊM: đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setDropdownOpen(false)
    await signOut()
    navigate('/login')
  }

  // ✅ THÊM: tạo chữ viết tắt cho avatar mặc định
  const getInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    }
    if (user?.email) return user.email[0].toUpperCase()
    return '?'
  }

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-40 px-6 transition-all duration-500 lg:px-12 ${scrolled ? 'py-4' : 'py-7'
        } ${className}`.trim()}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border px-5 py-3 transition-all duration-500 ${scrolled
            ? 'glass shadow-medium'
            : 'border-transparent bg-transparent'
          }`}
        style={{ fontFamily: FONT_STACK.sans }}
      >
        {/* LEFT */}
        <div className="flex items-center gap-10">
          <Link
            to="/"
            className="text-[1.7rem] tracking-normal text-stone-900 dark:text-stone-100"
            style={{ fontFamily: FONT_STACK.serif }}
          >
            Price<span className="text-[#B7848C]">Hawk</span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {navItems.map((item) => {
              const isActive = currentPage === item.key
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  aria-current={isActive ? 'page' : undefined}
                  className={`text-sm transition ${isActive
                      ? 'text-stone-900 dark:text-stone-100'
                      : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-100'
                    }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* RIGHT (AUTH) */}
        <div className="flex items-center gap-4">
          {user ? (
            // ✅ THAY ĐỔI: thay nút logout bằng avatar + dropdown
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-white/10 px-3 py-1.5 transition hover:bg-stone-50 dark:hover:bg-white/15"
              >
                {/* Avatar circle với chữ viết tắt */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B7848C] text-xs font-bold text-white">
                  {getInitials()}
                </div>
                <span className="hidden text-sm text-stone-700 dark:text-stone-300 sm:block">
                  {profile?.name ?? user.email}
                </span>
                {/* Chevron */}
                <svg
                  className={`h-3 w-3 text-stone-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-stone-100 dark:border-stone-700/60 bg-white dark:bg-[#1E1916] py-2 shadow-lg">
                  <div className="border-b border-stone-100 dark:border-stone-700/60 px-4 py-2">
                    <p className="text-xs font-medium text-stone-900 dark:text-stone-100">{profile?.name ?? 'Người dùng'}</p>
                    <p className="truncate text-[11px] text-stone-400 dark:text-stone-500">{user.email}</p>
                  </div>

                  <button
                    onClick={() => { setDropdownOpen(false); navigate('/profile') }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                  >
                    {/* Icon user */}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Hồ sơ cá nhân
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                  >
                    {/* Icon logout */}
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="rounded-full border border-stone-300 dark:border-stone-600 px-4 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
