import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../api/apiClient'

const FONT_STACK = {
  serif: '"Times New Roman", Georgia, serif',
  sans:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
} as const

const ADMIN_EMAILS = ['lethituphuong151020055@gmail.com']

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

type NotificationItem = {
  id: string
  productId: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const isAdmin = ADMIN_EMAILS.includes(user?.email ?? '')

  useEffect(() => {
    const handleScroll = (): void => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return
    try {
      const res = await apiClient.get('/notifications/unread-count')
      setUnreadCount(res.data.count ?? 0)
    } catch {
      // silent
    }
  }, [user])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 10_000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications')
      setNotifications(res.data)
    } catch {
      // silent
    }
  }

  const handleOpenNotif = async () => {
    setNotifOpen((prev) => !prev)
    setDropdownOpen(false)
    if (!notifOpen) {
      await fetchNotifications()
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all')
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      // silent
    }
  }

  const handleNotifClick = (productId: string) => {
    setNotifOpen(false)
    navigate(`/product/${productId}`)
  }

  const handleLogout = async () => {
    setDropdownOpen(false)
    await signOut()
    navigate('/login')
  }

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

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
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

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          {user && (
            <>
              {/* Bell notification */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={handleOpenNotif}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-white/10 transition hover:bg-stone-50 dark:hover:bg-white/15"
                >
                  <svg className="h-4 w-4 text-stone-600 dark:text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#B7848C] text-[9px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-stone-100 dark:border-stone-700/60 bg-white dark:bg-[#1E1916] shadow-lg overflow-hidden">
                    <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-700/60 px-4 py-3">
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">Thông báo</p>
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-[11px] text-[#B7848C] hover:underline">
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                          <svg className="mx-auto mb-2 h-8 w-8 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                          </svg>
                          <p className="text-xs text-stone-400">Chưa có thông báo nào</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <button key={n.id} onClick={() => handleNotifClick(n.productId)}
                            className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-stone-50 dark:hover:bg-stone-800/50 ${!n.isRead ? 'bg-[#FBF3F4] dark:bg-[#2A1A1D]/30' : ''}`}>
                            <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${!n.isRead ? 'bg-[#B7848C]' : 'bg-transparent'}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">{n.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] text-stone-500 dark:text-stone-400">{n.message}</p>
                              <p className="mt-1 text-[10px] text-stone-400">{formatTime(n.createdAt)}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Avatar dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => { setDropdownOpen((prev) => !prev); setNotifOpen(false) }}
                  className="flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-white/10 px-3 py-1.5 transition hover:bg-stone-50 dark:hover:bg-white/15"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B7848C] text-xs font-bold text-white">
                    {getInitials()}
                  </div>
                  <span className="hidden text-sm text-stone-700 dark:text-stone-300 sm:block">
                    {profile?.name ?? user.email}
                  </span>
                  {isAdmin && (
                    <span className="hidden rounded-full bg-[#FBF3F4] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#B7848C] sm:block">
                      Admin
                    </span>
                  )}
                  <svg
                    className={`h-3 w-3 text-stone-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

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
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Hồ sơ cá nhân
                    </button>

                    {/* ← Link Admin — chỉ hiện với admin email */}
                    {isAdmin && (
                      <>
                        <div className="my-1 border-t border-stone-100 dark:border-stone-700/60" />
                        <button
                          onClick={() => { setDropdownOpen(false); navigate('/admin') }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-[#B7848C] hover:bg-[#FBF3F4] dark:hover:bg-[#2A1A1D]/40"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0H3" />
                          </svg>
                          Admin Dashboard
                        </button>
                        <div className="my-1 border-t border-stone-100 dark:border-stone-700/60" />
                      </>
                    )}

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {!user && (
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