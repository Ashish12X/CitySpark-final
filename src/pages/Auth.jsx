import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { validatePassword, PASSWORD_HINT } from '@/lib/passwordPolicy';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';

const Auth = ({ isLogin = true }) => {
  const navigate = useNavigate();
  const { user, login, signup, sendOtp, verifyOtp } = useAuth();
  const { t } = useLanguage();
  
  const [step, setStep] = useState('auth'); // auth, otp
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', address: '' });
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loc = useLocation();
  const from = loc.state?.from?.pathname || "/feed";

  useEffect(() => {
    if (user && !user.isVerified && !isLogin) {
      setStep('otp');
    } else if (user && user.isVerified) {
      navigate(from, { replace: true });
    }
  }, [user, isLogin, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        const pwdErr = validatePassword(formData.password);
        if (pwdErr) {
          setError(t(pwdErr));
          setLoading(false);
          return;
        }
        await signup(formData.name, formData.email, formData.password, formData.phone, formData.address);
        await sendOtp();
        setStep('otp');
      }
    } catch (err) {
      const msg = err?.message || 'Something went wrong';
      setError(msg.length > 200 ? msg.substring(0, 200) + '...' : t(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await verifyOtp(otpCode);
    if (success) {
      navigate(from, { replace: true });
    } else {
      setError(t('Invalid or expired OTP'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-card/10">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-antigravity border-primary/10 bg-background/95 backdrop-blur-sm overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 'auth' ? (
              <motion.div
                key="auth"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader className="space-y-1 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-3xl shadow-lg">C</div>
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">
                    {isLogin ? t('Welcome Back') : t('Create Account')}
                  </CardTitle>
                  <CardDescription>
                    {isLogin ? t('Enter your credentials to access your city dashboard.') : t('Join CitySpark to report issues and improve your neighborhood.')}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-3">
                    {!isLogin && (
                      <>
                        <div className="space-y-1">
                          <Label htmlFor="name">{t('Full Name')}</Label>
                          <Input id="name" placeholder={t('John Doe')} required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} voice />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label htmlFor="phone">{t('Phone Number')}</Label>
                            <Input id="phone" placeholder="+91..." required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="address">{t('Area/Address')}</Label>
                            <Input id="address" placeholder={t('Sector 12...')} required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                          </div>
                        </div>
                      </>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="email">{t('Email Address')}</Label>
                      <Input id="email" type="email" placeholder="citizen@example.com" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="password">{t('Password')}</Label>
                      <Input id="password" type="password" required autoComplete={isLogin ? 'current-password' : 'new-password'} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                      {!isLogin && <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">{t(PASSWORD_HINT)}</p>}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4 pt-2">
                    {error && <p className="text-sm text-destructive text-center w-full font-medium" role="alert">{error}</p>}
                    <Button type="submit" className="w-full h-10 shadow-md transition-all active:scale-[0.98]" disabled={loading}>
                      {loading ? t('Processing...') : (isLogin ? t('Sign In') : t('Create Account'))}
                    </Button>
                    <div className="text-sm text-center text-muted-foreground hover:text-primary transition-colors">
                      {isLogin ? <Link to="/signup">{t('Don\'t have an account? Sign up')}</Link> : <Link to="/login">{t('Already have an account? Log in')}</Link>}
                    </div>
                  </CardFooter>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CardHeader className="space-y-1 text-center">
                  <div className="flex justify-center mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-3xl shadow-lg">!</div>
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">{t('Verify Mobile')}</CardTitle>
                  <CardDescription>
                    {t('We\'ve sent a 6-digit code to')} <span className="font-bold text-foreground">{formData.phone || user?.phone}</span>.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleVerifyOtp}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp" className="text-center block">{t('Enter Code')}</Label>
                      <Input 
                        id="otp" 
                        placeholder="123456" 
                        required 
                        maxLength={6}
                        className="text-center text-2xl tracking-[0.5em] font-mono h-12"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4 pt-4">
                    {error && <p className="text-sm text-destructive text-center w-full font-medium" role="alert">{error}</p>}
                    <Button type="submit" className="w-full h-11 shadow-lg bg-orange-500 hover:bg-orange-600 transition-all font-bold" disabled={loading}>
                      {loading ? t('Verifying...') : t('Verify & Continue')}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      {t('Didn\'t receive the code?')} <button type="button" onClick={() => sendOtp()} className="text-primary font-bold underline ml-1">{t('Resend')}</button>
                    </p>
                  </CardFooter>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
