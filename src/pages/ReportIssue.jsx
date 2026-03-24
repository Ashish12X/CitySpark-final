import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SmartInput } from '@/components/ui/SmartInput';
import { SmartTextarea } from '@/components/ui/SmartTextarea';
import { Label } from '@/components/ui/Label';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Image as ImageIcon, MapPin, Navigation, AlertCircle, CheckCircle2, ArrowRight, X, Upload, Loader2, Zap, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORY_VALUES = ['Infrastructure', 'Electricity', 'Water', 'Sanitation', 'Public Transport', 'Other'];

function categoryLabel(value, t) {
  if (value === 'Public Transport') return t('public transport');
  if (value === 'Other') return t('other');
  return t(value.toLowerCase());
}

const ReportIssue = () => {
  const navigate = useNavigate();
  const { addIssue, addNotification } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({ title: '', description: '', category: 'Infrastructure', locationText: '', address: '' });
  const [coords, setCoords] = useState(null);
  const [geoStatus, setGeoStatus] = useState('idle');
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const [aiResult, setAiResult] = useState(null);

  const categoryOptions = useMemo(() => CATEGORY_VALUES.map((value) => ({ value, label: categoryLabel(value, t) })), [t]);

  useEffect(() => { fetchLocation(); }, []);

  const fetchLocation = () => {
    setGeoStatus('loading');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setFormData(prev => ({ ...prev, locationText: `${t('detectedPrefix')}: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` }));
          setGeoStatus('success');
        },
        () => setGeoStatus('error'),
        { timeout: 10000 }
      );
    } else setGeoStatus('error');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await addIssue({
        ...formData,
        lat: coords?.lat,
        lng: coords?.lng,
        authorId: user?.id,
        img: imagePreview || 'https://images.unsplash.com/photo-1542482324-4f05cd43cbeb?auto=format&fit=crop&q=80&w=800',
      });
      setAiResult(result);
      if (result?.duplicate) {
        setSubmitStatus('duplicate');
        addNotification(t('duplicateDetected'), 'info');
      } else {
        setSubmitStatus('success');
      }
      setTimeout(() => navigate('/feed'), 5000);
    } catch (err) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter mb-2 uppercase italic">{t('reportAnIssue')}</h1>
          <p className="text-muted-foreground text-lg font-medium">{t('Your contribution fuels the city\'s digital twin and predictive engine.')}</p>
        </div>

        <Card className="shadow-antigravity bg-card border-border/50 overflow-hidden relative">
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 md:p-8 space-y-8">
              <div className="space-y-6">
                {/* Image Upload */}
                <div 
                   className="border-2 border-dashed border-primary/20 bg-primary/5 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-all relative overflow-hidden"
                   onClick={() => fileInputRef.current.click()}
                >
                   {imagePreview ? (
                     <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                   ) : (
                     <div className="text-center">
                        <ImageIcon className="h-10 w-10 text-primary mx-auto mb-2" />
                        <p className="font-bold text-sm uppercase tracking-widest">{t('Upload Proof')}</p>
                     </div>
                   )}
                   <input ref={fileInputRef} type="file" className="hidden" onChange={handleImageChange} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('Issue Title')}</Label>
                    <SmartInput required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} onVoiceUpdate={t => setFormData({...formData, title: formData.title ? formData.title + ' ' + t : t})} placeholder={t('eg: Water leakage on Main St')} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('Category')}</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                   <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('Description')}</Label>
                   <SmartTextarea required className="min-h-[100px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} onVoiceUpdate={text => setFormData({...formData, description: formData.description ? formData.description + ' ' + text : text})} placeholder={t('Provide details for AI analysis...')} />
                </div>

                <div className="space-y-1">
                   <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('Address')}</Label>
                   <SmartInput required value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} onVoiceUpdate={text => setFormData({...formData, address: formData.address ? formData.address + ' ' + text : text})} placeholder={t('e.g., 123 Main St, Near Central Park')} />
                </div>

                <div className="space-y-1">
                   <div className="flex justify-between items-end mb-1">
                      <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('Location Intelligence')}</Label>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-primary px-2" onClick={fetchLocation} disabled={geoStatus === 'loading'}>
                        {geoStatus === 'loading' ? <Loader2 className="w-3 h-3 animate-spin mr-1 inline" /> : null}
                        {geoStatus === 'loading' ? t('FETCHING...') : t('REFRESH GPS')}
                      </Button>
                   </div>
                   <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 z-10 text-muted-foreground" />
                      <Input readOnly disabled className="pl-9 bg-muted/40 cursor-not-allowed text-xs font-mono opacity-100" value={formData.locationText || (geoStatus === 'loading' ? t('Fetching coordinates...') : '')} placeholder={t('Auto-detecting location...')} />
                   </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="p-6 md:p-8 bg-muted/20 border-t flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/feed')} className="rounded-xl px-8 h-11 font-bold">{t('CANCEL')}</Button>
              <Button type="submit" className="rounded-xl px-12 h-11 font-bold shadow-antigravity bg-primary" disabled={isSubmitting}>
                 {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : t('SUBMIT REPORT')}
              </Button>
            </CardFooter>

            <AnimatePresence>
              {submitStatus && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-50 bg-background/98 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                  {submitStatus === 'duplicate' ? (
                    <div className="max-w-md space-y-6">
                       <div className="h-24 w-24 rounded-full bg-orange-100 flex items-center justify-center mx-auto shadow-inner"><Zap className="h-12 w-12 text-orange-600 animate-pulse" /></div>
                       <h2 className="text-3xl font-black italic tracking-tighter text-orange-600 uppercase">{t('Syncing Duplicate')}</h2>
                       <p className="text-sm font-medium text-muted-foreground">{t('Our Neural Engine detected an existing report for this issue. We\'ve merged your entry to amplify the priority level.')}</p>
                       <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200">
                          <p className="text-[10px] font-black uppercase text-orange-800 tracking-widest mb-2">{t('Impact Analysis')}</p>
                          <div className="flex justify-between text-sm font-bold text-orange-900 px-4"><span>{t('New Priority Score')}</span><span>{aiResult?.priorityScore}%</span></div>
                       </div>
                    </div>
                  ) : (
                    <div className="max-w-md space-y-6">
                       <div className="h-24 w-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto shadow-inner"><ShieldCheck className="h-12 w-12 text-emerald-600" /></div>
                       <h2 className="text-3xl font-black italic tracking-tighter text-emerald-600 uppercase">{t('Analysis Complete')}</h2>
                       <p className="text-sm font-medium text-muted-foreground">{t('CitySpark AI has successfully categorized and prioritized your report.')}</p>
                       
                       <div className="grid grid-cols-2 gap-3 text-left">
                          <div className="p-4 bg-muted/50 rounded-2xl border border-border/50">
                             <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('Department')}</p>
                             <p className="text-sm font-bold">{t(aiResult?.department || t('General'))}</p>
                          </div>
                          <div className="p-4 bg-muted/50 rounded-2xl border border-border/50">
                             <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t('Priority')}</p>
                             <p className="text-sm font-bold text-red-600">{t(aiResult?.priorityLabel || 'Medium')}</p>
                          </div>
                          {aiResult?.prediction && (
                            <div className="col-span-2 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                               <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-1">{t('Predictive Risk')}</p>
                               <p className="text-xs font-semibold italic">⚠️ {t(aiResult.prediction.message)}</p>
                            </div>
                          )}
                       </div>
                    </div>
                  )}
                  <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">{t('Redirecting to Intelligence Feed...')}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};

export default ReportIssue;
