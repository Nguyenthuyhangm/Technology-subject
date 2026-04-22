import { useEffect, useState } from 'react'
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
                                  }: AppHeaderProps): JSX.Element {
  const [scrolled, setScrolled] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
      <header
          className={`fixed left-0 right-0 top-0 z-40 px-6 transition-all duration-500 lg:px-12 ${
              scrolled ? 'py-4' : 'py-7'
          } ${className}`.trim()}
      >
        <div
            className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border px-5 py-3 transition-all duration-500 ${
                scrolled
                    ? 'glass shadow-medium'
                    : 'border-transparent bg-transparent'
            }`}
            style={{ fontFamily: FONT_STACK.sans }}
        >
          {/* LEFT */}
          <div className="flex items-center gap-10">
            <Link
                to="/"
                className="text-[1.7rem] tracking-normal text-stone-900"
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
                        className={`text-sm transition ${
                            isActive
                                ? 'text-stone-900'
                                : 'text-stone-500 hover:text-stone-900'
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
                <>
              <span className="hidden sm:block text-sm text-stone-500">
                {user.email}
              </span>

                  <button
                      onClick={handleLogout}
                      className="rounded-full bg-stone-900 px-4 py-2 text-sm text-white transition hover:opacity-90"
                  >
                    Logout
                  </button>
                </>
            ) : (
                <button
                    onClick={() => navigate('/login')}
                    className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 transition"
                >
                  Login
                </button>
            )}
          </div>
        </div>
      </header>
  )
}