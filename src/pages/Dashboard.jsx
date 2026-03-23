import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  Activity, CheckCircle, Clock, AlertTriangle, FileText, Bell, MapPin, 
  Tag, X, ChevronDown, ChevronUp, ShieldCheck, UserCheck, Send, Image as ImageIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiJson } from '@/lib/api';

const StatCard = ({ title, value, icon: Icon, description, colorClass = "text-primary bg-primary/10" }) => (
  <Card className="shadow-sm border-primary/10 transition-all hover:shadow-md">
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold">{value}</h3>
          {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className={`p-3 rounded-xl shadow-inner ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const progressColor = (progress) => {
  switch (progress) {
    case 'Resolved': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
    case 'In Progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
    default: return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400';
  }
};

const IssueDetailRow = ({ issue, isAuthority = false, onAction }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { verifyIssue, resolveIssue } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleVerify = async (status) => {
    setSubmitting(true);
    await verifyIssue(issue.id, status, 'User verified via dashboard');
    setSubmitting(false);
  };

  const handleResolve = async () => {
    const imgUrl = prompt(t('Enter completion image URL (Simulation):'), 'https://images.unsplash.com/photo-1541698444083-023c97d3f4b6?auto=format&fit=crop&q=80&w=800');
    if (!imgUrl) return;
    setSubmitting(true);
    await resolveIssue(issue.id, imgUrl);
    setSubmitting(false);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} layout>
      <Card className={`shadow-sm border-border/70 hover:border-primary/30 transition-all ${issue.priorityLabel === 'Critical' ? 'border-l-4 border-l-red-500' : ''}`}>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex h-12 w-12 rounded-xl bg-secondary items-center justify-center shrink-0 border border-border overflow-hidden">
                {issue.img ? <img src={issue.img} className="object-cover h-full w-full" alt="" /> : <FileText className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div>
                <h4 className="font-semibold text-base mb-0.5">{t(issue.title)}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {t(issue.location)}
                  <span className="mx-1">•</span>
                  <Tag className="w-3 h-3" /> {t(issue.category)}
                  {issue.department && <><span className="mx-1">•</span>🏢 {t(issue.department)}</>}
                </p>
              </div>
            </div>
            <div className="flex flex-row-reverse sm:flex-row items-center justify-end gap-3">
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider uppercase ${progressColor(issue.progress)}`}>
                {t(issue.progress)}
              </span>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => setExpanded(!expanded)}>
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 pt-4 border-t border-border/40 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-3">
                       <p className="text-sm text-muted-foreground leading-relaxed italic">"{t(issue.description)}"</p>
                       <div className="flex flex-wrap gap-2">
                         {issue.priorityLabel && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black uppercase">{t(issue.priorityLabel)}</span>}
                         {issue.isRepeat && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-black uppercase">{t('RECURRING')}</span>}
                       </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('Meta Information')}</p>
                       <div className="text-xs space-y-1.5">
                         <div className="flex justify-between"><span>{t('Votes')}</span><span className="font-bold">👍 {issue.upvotes}</span></div>
                         <div className="flex justify-between"><span>{t('Status')}</span><span className="font-bold">{t(issue.verificationStatus || 'Pending')}</span></div>
                         {issue.deadline && <div className="flex justify-between text-red-600 font-bold"><span>{t('Deadline')}</span><span>{new Date(issue.deadline).toLocaleDateString()}</span></div>}
                       </div>
                    </div>
                  </div>

                  {/* Actions based on role and status */}
                  <div className="flex justify-end gap-2 pt-2">
                    {isAuthority && issue.progress === 'In Progress' && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-2" onClick={handleResolve} disabled={submitting}>
                        <CheckCircle className="w-4 h-4" /> {t('Mark as Fixed')}
                      </Button>
                    )}
                    
                    {!isAuthority && issue.progress === 'Resolved' && issue.verificationStatus === 'Pending' && issue.authorId === user?.id && (
                      <div className="flex items-center gap-2 bg-primary/5 p-2 rounded-xl border border-primary/20">
                         <p className="text-xs font-bold mr-2 text-primary">{t('Verify Completion?')}</p>
                         <Button size="sm" variant="outline" className="h-7 text-[10px] border-green-500 text-green-600 hover:bg-green-50" onClick={() => handleVerify('Verified')} disabled={submitting}>{t('YES')}</Button>
                         <Button size="sm" variant="outline" className="h-7 text-[10px] border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleVerify('Rejected')} disabled={submitting}>{t('NO')}</Button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const UserDashboard = ({ issues, stats, user }) => {
  const { t } = useLanguage();
  const userIssues = issues.filter(i => i.authorId === user.id);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard title={t('My Reports')} value={stats.Reported + stats['In Progress'] + stats.Resolved} icon={FileText} colorClass="text-blue-600 bg-blue-50" />
        <StatCard title={t('Action Pending')} value={stats['In Progress']} icon={Clock} colorClass="text-amber-600 bg-amber-50" />
        <StatCard title={t('Issues Resolved')} value={stats.Resolved} icon={CheckCircle} colorClass="text-emerald-600 bg-emerald-50" />
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> {t('Your Civic Activity')}
        </h3>
        <div className="space-y-4">
          {userIssues.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-muted/10">
              <p className="text-muted-foreground font-medium">{t('You haven\'t started your civic journey yet.')}</p>
              <Button variant="link" className="mt-2 text-primary uppercase text-xs font-bold tracking-widest">{t('Report Neighbor Issue')}</Button>
            </div>
          ) : (
            userIssues.slice().reverse().map(issue => <IssueDetailRow key={issue.id} issue={issue} />)
          )}
        </div>
      </div>
    </div>
  );
};

const AuthorityDashboard = ({ issues, user }) => {
  const { t } = useLanguage();
  const assignedIssues = issues.filter(i => i.assignedTo === user.id);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard title={t('Assigned Tasks')} value={assignedIssues.length} icon={ShieldCheck} colorClass="text-indigo-600 bg-indigo-50" />
        <StatCard title={t('Urgent Tasks')} value={assignedIssues.filter(i => i.priorityLabel === 'Critical' || i.priorityLabel === 'High').length} icon={AlertTriangle} colorClass="text-red-600 bg-red-50" />
        <StatCard title={t('Fixed This Month')} value={assignedIssues.filter(i => i.progress === 'Resolved').length} icon={CheckCircle} colorClass="text-emerald-600 bg-emerald-50" />
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold tracking-tight">{t('Mission Control: Your Tasks')}</h3>
        <div className="space-y-4">
          {assignedIssues.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-muted/10 text-muted-foreground">{t('No active assignments.')}</div>
          ) : (
            assignedIssues.map(issue => <IssueDetailRow key={issue.id} issue={issue} isAuthority={true} />)
          )}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ issues, stats }) => {
  const { t } = useLanguage();
  const { assignIssue } = useApp();
  const [authorities, setAuthorities] = useState([]);

  useEffect(() => {
    // Simulated authority list fetching
    setAuthorities([
      { id: 'auth1', name: 'Zonal Engineer (South)' },
      { id: 'auth2', name: 'Sanitation Officer' },
      { id: 'auth3', name: 'PWD Supervisor' }
    ]);
  }, []);

  const handleAssign = async (issueId) => {
    const authId = prompt('Enter Authority ID (auth1, auth2, auth3):', 'auth1');
    if (!authId) return;
    await assignIssue(issueId, authId);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('Total Issues')} value={stats.totalIssues} icon={FileText} />
        <StatCard title={t('Unresolved Critical')} value={stats.urgentIssues} icon={AlertTriangle} colorClass="text-red-600 bg-red-50" />
        <StatCard title={t('Resolved')} value={stats.resolvedIssues} icon={CheckCircle} colorClass="text-emerald-600 bg-emerald-50" />
        <StatCard title={t('Verify Wait')} value={stats.pendingVerification} icon={UserCheck} colorClass="text-amber-600 bg-amber-50" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          <h3 className="text-xl font-bold tracking-tight flex items-center justify-between">
            {t('High-Priority Intelligence Feed')}
            <span className="text-[10px] bg-red-600 text-white px-2 py-1 rounded-full animate-pulse">{t('LIVE CONTROL')}</span>
          </h3>
          <div className="space-y-4">
             {issues.filter(i => i.priorityScore > 60 || i.prediction).map(issue => (
               <Card key={issue.id} className="shadow-antigravity border-l-4 border-l-red-500">
                  <CardContent className="p-5 flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-2">
                         <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-black tracking-tighter uppercase">{t(issue.priorityLabel)}</span>
                         {issue.prediction && <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-bold uppercase">AI Prediction</span>}
                      </div>
                      <h4 className="font-bold text-lg">{t(issue.title)}</h4>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {t(issue.location)}</p>
                      {issue.prediction && <p className="mt-3 text-xs bg-primary/5 p-3 rounded-xl border border-primary/10 text-primary font-medium italic">⚠️ {t(issue.prediction.message)}</p>}
                    </div>
                    <div className="flex flex-col gap-2 justify-center">
                       <Button size="sm" className="h-9 font-bold bg-primary uppercase tracking-wider" onClick={() => handleAssign(issue.id)}>{t('Assign Authority')}</Button>
                       <Button size="sm" variant="outline" className="h-9 font-bold uppercase tracking-wider">{t('Contact Reporter')}</Button>
                    </div>
                  </CardContent>
               </Card>
             ))}
          </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-xl font-bold tracking-tight">{t('Platform Health')}</h3>
           <Card className="shadow-antigravity overflow-hidden">
             <CardHeader className="bg-muted/50 pb-4">
               <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t('Performance Metrics')}</CardTitle>
             </CardHeader>
             <CardContent className="p-6 space-y-6">
                <div>
                   <div className="flex justify-between text-xs font-bold mb-2"><span>{t('Avg Resolution Time')}</span><span className="text-primary">4.2 {t('Days')}</span></div>
                   <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary w-[65%]" /></div>
                </div>
                <div>
                   <div className="flex justify-between text-xs font-bold mb-2"><span>{t('Community Satisfaction')}</span><span className="text-emerald-600">89%</span></div>
                   <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[89%]" /></div>
                </div>
                <div>
                   <div className="flex justify-between text-xs font-bold mb-2"><span>{t('AI Prediction Accuracy')}</span><span className="text-indigo-600">92%</span></div>
                   <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden"><div className="h-full bg-indigo-500 w-[92%]" /></div>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { issues, notifications, isWithinRadius } = useApp();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [userCoords, setUserCoords] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Geolocation error:', err)
      );
    }
  }, []);

  const filteredIssues = user?.role === 'user' && userCoords
    ? issues.filter(i => isWithinRadius({ lat: i.lat, lng: i.lng }, userCoords, 5))
    : issues;

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const url = user?.role === 'admin' ? '/api/dashboard/admin-stats' : '/api/dashboard/user-stats';
        const data = await apiJson(url);
        setStats(data);
      } catch (e) { console.error(e); }
    };
    if (user) fetchStats();
  }, [user]);

  if (!stats) return <div className="min-h-screen flex items-center justify-center font-bold text-primary animate-pulse uppercase tracking-widest">{t('Initializing Intelligence...')}</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-10 gap-6 border-b border-border/40 pb-8">
        <div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-2 uppercase italic flex items-center gap-3">
             <span className="text-primary">City</span>Spark
             <span className="text-2xl font-bold not-italic bg-secondary px-3 py-1 rounded-xl text-foreground">AI</span>
          </h1>
          <p className="text-muted-foreground text-lg italic font-medium">
            {user?.role === 'admin' ? t('COMMAND CENTER: SYSTEM ADM-CORE ACTIVE') : 
             user?.role === 'authority' ? t('AUTHORITY CONSOLE: MISSION READY') : 
             t('Welcome to your CitySpark dashboard.')}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden sm:flex flex-col items-end">
             <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('Civic Standing')}</span>
             <span className="text-lg font-black text-primary">{user?.points || 0} PTS</span>
           </div>
           <motion.div whileHover={{ scale: 1.02 }} className="flex items-center gap-3 bg-card px-5 py-3 rounded-2xl border border-primary/30 shadow-antigravity cursor-pointer">
             <div className="relative"><Bell className="h-5 w-5 text-primary" />{unreadCount > 0 && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-600 border-2 border-card"></span>}</div>
             <div className="flex flex-col"><span className="text-sm font-black leading-none">{unreadCount} {t('Updates')}</span></div>
           </motion.div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {user?.role === 'admin' ? <AdminDashboard issues={issues} stats={stats} /> : 
         user?.role === 'authority' ? <AuthorityDashboard issues={filteredIssues} user={user} /> : 
         <UserDashboard issues={filteredIssues} stats={stats} user={user} />}
      </motion.div>
    </div>
  );
};

export default Dashboard;
