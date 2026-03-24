import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { validatePassword, PASSWORD_HINT } from '@/lib/passwordPolicy';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, CheckCircle2, RefreshCw, MapPin } from 'lucide-react';
import { parseAadhaar } from '@/lib/ocr';
import { SmartInput } from '@/components/ui/SmartInput';
import { SmartPasswordInput } from '@/components/ui/SmartPasswordInput';

const Auth = ({ isLogin = true }) => {
  const navigate = useNavigate();
  const { user, login, signup, sendOtp, verifyOtp, loginWithGoogle } = useAuth();
  const { t } = useLanguage();
  
  const [step, setStep] = useState('auth'); // auth, otp
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', address: '', zip: '', lat: null, lng: null });
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [geoError, setGeoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef(null);

  const loc = useLocation();
  const from = loc.state?.from?.pathname || "/feed";

  useEffect(() => {
    if (!isLogin && step === 'auth') {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setFormData(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
            setGeoError('');
          },
          (err) => {
            console.warn('Geolocation blocked', err);
            setGeoError(t('Location access is required to register on this platform'));
          }
        );
      } else {
        setGeoError(t('Location access is required to register on this platform'));
      }
    } else {
      setGeoError('');
    }
  }, [isLogin, step, t]);

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
        await signup(formData.name, formData.email, formData.password, formData.phone, formData.address, formData.zip, formData.lat, formData.lng);
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

  const handleGoogleAuth = async () => {
    setError('');
    const authUser = await loginWithGoogle();
    if (authUser) {
      setFormData(prev => ({
        ...prev,
        name: authUser.displayName || prev.name,
        email: authUser.email || prev.email,
      }));
      if (isLogin) {
        // Mock successful login if they just want auth
        await login(authUser.email, 'google-auth');
      }
    } else {
      setError(t('Google Sign-In failed or was cancelled.'));
    }
  };

  const handleAadhaarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setError('');
    try {
      const data = await parseAadhaar(file);
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        address: data.address || prev.address,
        zip: data.zip || prev.zip,
        phone: data.phone || prev.phone,
      }));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? `OCR Error: ${err.message}` : t('Failed to parse Aadhaar card. Please enter details manually.'));
    } finally {
      setOcrLoading(false);
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
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
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
                  <CardContent className="space-y-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full font-medium" 
                      onClick={handleGoogleAuth}
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                      {t('Continue with Google')}
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">{t('Or continue with')}</span></div>
                    </div>

                    {!isLogin && (
                      <div className="w-full rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-center cursor-pointer hover:bg-primary/10 transition-colors"
                           onClick={() => fileInputRef.current?.click()}>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg, image/png, application/pdf" onChange={handleAadhaarUpload} />
                        {ocrLoading ? (
                          <div className="flex flex-col items-center gap-2 text-primary">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span className="text-sm font-medium">{t('Scanning Aadhaar...')}</span>
                          </div>
                        ) : formData.name && formData.address ? (
                          <div className="flex flex-col items-center gap-2 text-emerald-600 dark:text-emerald-500">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="text-sm font-medium">{t('Data Extracted. You can edit below.')}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <UploadCloud className="w-5 h-5 text-primary" />
                            <span className="text-sm font-medium">{t('Upload Aadhaar for quick auto-fill')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {!isLogin && (
                      <div className="space-y-4">
                        <div className="space-y-1">
                          <Label htmlFor="name">{t('Full Name')}</Label>
                          <SmartInput id="name" placeholder={t('John Doe')} required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor="zip">{t('ZIP Code')}</Label>
                            <SmartInput id="zip" placeholder="110001" required value={formData.zip} onChange={(e) => setFormData({...formData, zip: e.target.value})} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="phone">{t('Phone Number')}</Label>
                            <SmartInput id="phone" placeholder="+91..." required value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                          </div>
                        </div>
                        <div className="space-y-2 bg-muted/20 p-4 rounded-xl border border-border/50">
                          <Label className="font-bold flex items-center gap-2 text-primary uppercase text-xs tracking-wider">
                             <MapPin className="w-3 h-3"/> {t('Mandatory GPS Verification')}
                          </Label>
                          <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                            {t('You must register from your original location. This location will be permanently linked to your account.')}
                          </p>
                          {formData.lat && formData.lng ? (
                            <div className="flex flex-col sm:flex-row gap-3 pt-1">
                               <div className="flex-1 bg-background border px-3 py-2 rounded-lg text-xs font-mono text-muted-foreground flex items-center shadow-inner">
                                  {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
                               </div>
                               <Button 
                                  type="button"
                                  variant={locationConfirmed ? 'secondary' : 'default'}
                                  onClick={() => setLocationConfirmed(true)}
                                  disabled={locationConfirmed}
                                  className="h-9 text-xs font-bold whitespace-nowrap transition-all shadow-sm"
                               >
                                  {locationConfirmed ? <><CheckCircle2 className="w-4 h-4 mr-1.5" />{t('Confirmed')}</> : t('Confirm Location')}
                               </Button>
                            </div>
                          ) : (
                             <p className="text-xs font-bold text-destructive mt-2">{geoError || t('Fetching coordinates...')}</p>
                          )}
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="address">{t('Area/Address')}</Label>
                           <SmartInput id="address" placeholder={t('Sector 12...')} required value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                        </div>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="email">{t('Email Address')}</Label>
                      <SmartInput id="email" type="email" placeholder="citizen@example.com" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="password">{t('Password')}</Label>
                      <SmartPasswordInput id="password" required autoComplete={isLogin ? 'current-password' : 'new-password'} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                      {!isLogin && <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold opacity-70">{t(PASSWORD_HINT)}</p>}
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col space-y-4 pt-2">
                    {geoError && !isLogin && <p className="text-sm text-destructive text-center w-full font-medium" role="alert">{geoError}</p>}
                    {error && <p className="text-sm text-destructive text-center w-full font-medium" role="alert">{error}</p>}
                    <Button type="submit" className="w-full h-10 shadow-md transition-all active:scale-[0.98]" disabled={loading || ocrLoading || (!isLogin && (!locationConfirmed || !!geoError))}>
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
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
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
