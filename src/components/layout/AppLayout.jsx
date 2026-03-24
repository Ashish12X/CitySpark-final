import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { UI_LANGUAGES } from '@/context/translations';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/DropdownMenu';
import { Bell, Map, List, User, Settings, LogOut, Moon, Sun, Eye, Briefcase, X, CheckCheck, Info, AlertCircle, CheckCircle2, Globe } from 'lucide-react';
import Footer from '@/components/layout/Footer';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
    case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />;
    default: return <Info className="w-4 h-4 text-primary shrink-0" />;
  }
};

const NotificationPanel = ({ onClose }) => {
  const { notifications, markNotificationRead, markAllRead, clearNotification } = useApp();
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="absolute right-0 top-12 w-80 bg-card border border-border/60 rounded-2xl shadow-2xl z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <span className="font-semibold text-sm">{t('Notifications')}</span>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.read) && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" /> {t('Mark all as read')}
            </button>
          )}
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
        {notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            🎉 {t('All caught up!')}
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer ${!n.read ? 'bg-primary/5' : ''}`}
              onClick={() => markNotificationRead(n.id)}
            >
              <NotificationIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${!n.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                  {t(n.message)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                <button
                  onClick={(e) => { e.stopPropagation(); clearNotification(n.id); }}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-2 border-t border-border/40 text-center">
          <Link
            to="/dashboard"
            onClick={onClose}
            className="text-xs text-primary hover:underline"
          >
            {t('View Dashboard')}
          </Link>
        </div>
      )}
    </motion.div>
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { notifications } = useApp();
  const { t, language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { name: t('Feed'), path: '/feed', icon: List },
    { name: t('Map'), path: '/map', icon: Map },
    { name: t('Services'), path: '/services', icon: Briefcase },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link to={user ? '/feed' : '/'} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl shadow-antigravity">
              C
            </div>
            <span className="text-xl font-bold tracking-tight hidden sm:inline-block">
              CitySpark <span className="text-primary tracking-tighter">AI</span>
            </span>
          </Link>

          {user && (
            <nav className="hidden md:flex gap-1 items-center">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.name}
                  </Link>
                );
              })}
              <div className="w-px h-6 bg-border mx-2"></div>
              <Button asChild size="sm" className="rounded-full shadow-sm">
                <Link to="/report">{t('Report Issue')}</Link>
              </Button>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark' ? <Moon className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="sr-only">{t('Toggle theme')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme('light')}>{t('Light')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>{t('Dark')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('eye-comfort')}>{t('Eye Comfort')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" title={t('Language')}>
                <Globe className="h-4 w-4" />
                <span className="sr-only">{t('Language')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
              {UI_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={language === lang.code ? 'bg-primary/10 text-primary' : ''}
                >
                  <span className="mr-2">{lang.flag}</span>
                  {lang.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="relative" ref={notifRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-9 w-9 rounded-full"
                  onClick={() => setNotifOpen(prev => !prev)}
                >
                  <Bell className="h-4 w-4" />
                  {unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[9px] text-white font-bold flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </Button>

                <AnimatePresence>
                  {notifOpen && (
                    <NotificationPanel onClose={() => setNotifOpen(false)} />
                  )}
                </AnimatePresence>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-full pl-2 pr-4 flex gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10">
                    <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('Dashboard')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>{t('Profile Settings')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('Log out')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost">{t('Log in')}</Button>
              </Link>
              <Link to="/signup">
                <Button>{t('Sign up')}</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans relative overflow-x-hidden w-full max-w-[100vw]">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default AppLayout;
