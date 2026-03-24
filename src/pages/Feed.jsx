import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThumbsUp, ThumbsDown, MapPin, Tag, Clock, ArrowUpDown, Filter, Search, MessageSquare, MoreHorizontal, Plus, ChevronDown, Send, ShieldCheck, AlertTriangle, Zap, Activity } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { SmartInput } from '@/components/ui/SmartInput';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const StatusBadge = ({ status }) => {
  const { t } = useLanguage();
  const label = t(status);
  
  switch(status) {
    case 'Reported':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-destructive/10 text-destructive border border-destructive/20"><span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5"></span>{label}</span>;
    case 'In Progress':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-amber-500/10 text-amber-600 border border-amber-500/20"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>{label}</span>;
    case 'Resolved':
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>{label}</span>;
    default:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase bg-secondary text-secondary-foreground"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1.5"></span>{label}</span>;
  }
}

const PriorityBadge = ({ score, label }) => {
  const { t } = useLanguage();
  if (!score) return null;
  
  const colors = {
    'Critical': 'bg-red-600 text-white border-red-700',
    'High': 'bg-orange-500 text-white border-orange-600',
    'Medium': 'bg-amber-400 text-black border-amber-500',
    'Low': 'bg-slate-200 text-slate-700 border-slate-300'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border shadow-sm text-[11px] font-bold uppercase tracking-tight ${colors[label] || colors['Low']}`}>
      <Zap className="w-3 h-3 fill-current" />
      {t('Priority')}: {score}% ({t(label)})
    </div>
  );
};

const IssueCard = ({ issue, onVote, userVote, issueComments, onAddComment, currentUser }) => {
  const { t } = useLanguage();
  const [isCommentsExpanded, setIsCommentsExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    onAddComment(issue.id, {
      text: newComment.trim(),
      authorId: currentUser.id,
      authorName: currentUser.name || 'Citizen'
    });
    setNewComment('');
  };

  return (
    <Card className="mb-6 overflow-hidden border-border/50 bg-card hover:border-primary/30 hover:shadow-antigravity transition-all duration-300 group cursor-pointer">
      <CardContent className="p-0 flex flex-col sm:flex-row h-full">
        {issue.img && (
          <div className="sm:w-[35%] h-56 sm:h-auto overflow-hidden relative shrink-0">
            <img src={issue.img} alt={t(issue.title)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent sm:hidden"></div>
          </div>
        )}
        <div className="p-5 sm:p-6 flex-1 flex flex-col relative bg-gradient-to-br from-card to-card/50">
          <div className="flex justify-between items-start mb-3 gap-4">
            <div className="space-y-2.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <StatusBadge status={issue.progress} />
                <span className="flex items-center text-xs font-medium text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-full">
                  <Tag className="h-3 w-3 mr-1"/>
                  {t(issue.category)}
                </span>
                <PriorityBadge score={issue.priorityScore} label={issue.priorityLabel} />
                <span className="text-xs text-muted-foreground flex items-center ml-auto sm:ml-0"><Clock className="h-3 w-3 mr-1"/> {t('2h ago')}</span>
              </div>
              <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors truncate whitespace-normal line-clamp-2">
                {t(issue.title)}
              </h3>
              <div className="flex items-center text-sm text-muted-foreground mt-1 truncate">
                <MapPin className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary/70" /> {t(issue.location)}
              </div>
            </div>
            
            <div className="flex flex-col gap-1 items-end shrink-0" onClick={e => e.stopPropagation()}>
                <div className="flex items-center bg-card border border-border/60 rounded-full shadow-sm p-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 rounded-full ${userVote === 1 ? 'text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20' : 'hover:bg-emerald-500/10 hover:text-emerald-600 text-muted-foreground'}`}
                    onClick={(e) => { e.preventDefault(); onVote(1); }}
                  >
                    <ThumbsUp className={`h-4 w-4 ${userVote === 1 ? 'fill-current' : ''}`} />
                  </Button>
                  <span className={`font-semibold px-2 min-w-[1.75rem] text-center text-sm ${userVote === 1 ? 'text-emerald-600' : 'text-foreground'}`}>
                    {issue.upvotes !== undefined ? issue.upvotes : (issue.votes || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pr-2 pt-1 opacity-60 hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-6 w-6 rounded-full ${userVote === -1 ? 'text-destructive bg-destructive/10 hover:bg-destructive/20' : 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'}`}
                    onClick={(e) => { e.preventDefault(); onVote(-1); }}
                  >
                    <ThumbsDown className={`h-3 w-3 ${userVote === -1 ? 'fill-current' : ''}`} />
                  </Button>
                  <span className={`font-medium text-[11px] ${userVote === -1 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {issue.downvotes || 0}
                  </span>
                </div>
            </div>
          </div>
          <p className="text-muted-foreground/90 line-clamp-2 text-sm leading-relaxed mb-4 mt-1">
            {t(issue.description || "No description provided for this issue.")}
          </p>
          
          {issue.prediction && (
             <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex gap-3 items-start animate-pulse">
               <Activity className="w-5 h-5 text-primary shrink-0 mt-0.5" />
               <div className="text-xs">
                 <p className="font-bold text-primary mb-1">{t('AI Predictive Insight')}</p>
                 <p className="text-muted-foreground leading-snug">{t(issue.prediction.message)}</p>
               </div>
             </div>
          )}
          <div className="mt-auto pt-4 border-t border-border/50 flex flex-wrap items-center justify-between text-sm">
             <div className="flex items-center gap-5 text-muted-foreground font-medium">
                <button 
                onClick={(e) => { e.stopPropagation(); setIsCommentsExpanded(!isCommentsExpanded); }}
                className={`flex items-center transition-colors ${isCommentsExpanded ? 'text-primary' : 'hover:text-primary'}`}
               >
                 <MessageSquare className={`w-4 h-4 mr-1.5 ${isCommentsExpanded ? 'fill-primary/20' : ''}`} /> 
                 {issueComments.length} {issueComments.length === 1 ? t('comment') : t('comments')}
               </button>
             </div>
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
               <MoreHorizontal className="w-4 h-4" />
             </Button>
          </div>
          
          <AnimatePresence>
            {isCommentsExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-2 border-t border-border/30 space-y-4" onClick={e => e.stopPropagation()}>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 no-scrollbar">
                    {issueComments.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-2 font-medium">📭 {t('No comments yet. Be the first!')}</p>
                    ) : (
                      issueComments.map(comment => (
                        <div key={comment.id} className="bg-background/50 rounded-xl p-3 text-sm border border-border/40 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <div className="h-4 w-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] uppercase">
                                {comment.authorName.charAt(0)}
                              </div>
                              {comment.authorName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{new Date(comment.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed pl-5.5">{t(comment.text)}</p>
                        </div>
                      ))
                    )}
                  </div>
                  
                  <form onSubmit={handleCommentSubmit} className="flex gap-2 relative">
                    <SmartInput 
                      placeholder={currentUser ? t('Add a comment...') : t('Log in to comment')}
                      className="bg-background shadow-sm pr-10 rounded-full h-9 text-sm"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onVoiceUpdate={(text) => setNewComment(newComment ? newComment + ' ' + text : text)}
                      disabled={!currentUser}
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      disabled={!newComment.trim() || !currentUser}
                      className="h-7 w-7 rounded-full absolute right-1 top-1 transition-transform active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5 ml-[-1px]" />
                    </Button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
};

const Feed = () => {
  const { issues, voteIssue, votes, comments, addComment, addNotification } = useApp();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isWithinRadius } = useApp();
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [filter, setFilter] = useState('All');
  const [sortBy, setSortBy] = useState('latest');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [userCoords, setUserCoords] = useState(null);

  React.useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('Geolocation error:', err)
      );
    }
  }, []);
  
  const sortOptions = [
    { value: 'latest', label: t('Latest') },
    { value: 'most_upvoted', label: t('Most Upvoted') },
    { value: 'nearest', label: t('Nearest') }
  ];

  const processedIssues = [...issues]
    .filter(i => {
      if (nearbyOnly && userCoords) {
        return isWithinRadius({ lat: i.lat, lng: i.lng }, userCoords, 5);
      }
      return true;
    })
    .filter(i => filter === 'All' ? true : i.category === filter)
    .filter(i => {
      if (authorFilter === 'mine') return i.authorId === user?.id;
      if (authorFilter === 'others') return i.authorId !== user?.id;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'most_upvoted') {
        const aVotes = a.upvotes !== undefined ? a.upvotes : (a.votes || 0);
        const bVotes = b.upvotes !== undefined ? b.upvotes : (b.votes || 0);
        return bVotes - aVotes;
      }
      return (b.id - a.id);
    });

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto px-4 py-8 lg:py-12 max-w-5xl">
        <div className="flex flex-col mb-10 gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border/50 pb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">{t('Civic Issue Feed')}</h1>
              <p className="text-muted-foreground text-lg">{t('Real-time reports from your community. Vote on issues to increase their priority.')}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild className="rounded-full shadow-sm font-semibold pl-3">
                <Link to="/report">
                  <Plus className="w-5 h-5 mr-1.5" /> {t('Report Issue')}
                </Link>
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex gap-2 p-1 bg-card border border-border/60 rounded-xl overflow-x-auto w-full sm:w-auto shadow-sm no-scrollbar">
              {[
                { key: 'All', label: t('All') },
                { key: 'Infrastructure', label: t('Infrastructure') },
                { key: 'Electricity', label: t('Electricity') },
                { key: 'Water', label: t('Water') },
                { key: 'Sanitation', label: t('Sanitation') },
              ].map(({ key, label }) => (
                <button 
                  key={key} 
                  onClick={() => setFilter(key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filter === key ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2">
               <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl border border-primary/20">
                  <button onClick={() => setNearbyOnly(true)} className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${nearbyOnly ? 'bg-primary text-white shadow' : 'text-muted-foreground'}`}>
                    📍 {t('NEARBY')}
                  </button>
                  <button onClick={() => setNearbyOnly(false)} className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${!nearbyOnly ? 'bg-primary text-white shadow' : 'text-muted-foreground'}`}>
                    🌐 {t('GLOBAL')}
                  </button>
               </div>

               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="outline" className="rounded-xl border-border/60 shadow-sm font-medium bg-card">
                     <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" /> 
                     {t('Sort by:')} {sortOptions.find(o => o.value === sortBy)?.label}
                     <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground opacity-50" />
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="w-[180px] rounded-xl">
                   {sortOptions.map(option => (
                     <DropdownMenuItem 
                       key={option.value} 
                       onClick={() => setSortBy(option.value)}
                       className={`cursor-pointer rounded-lg ${sortBy === option.value ? 'bg-primary/10 text-primary font-medium' : ''}`}
                     >
                       {option.label}
                     </DropdownMenuItem>
                   ))}
                 </DropdownMenuContent>
               </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium shrink-0">{t('Show:')}</span>
            <div className="flex gap-2 p-1 bg-card border border-border/60 rounded-xl overflow-x-auto shadow-sm no-scrollbar">
              {[
                { value: 'all', label: t('All Reports') },
                { value: 'mine', label: t('My Reports') },
                { value: 'others', label: t('Others') },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAuthorFilter(opt.value)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    authorFilter === opt.value
                      ? 'bg-primary text-primary-foreground shadow'
                      : 'hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="popLayout">
            {processedIssues.map((issue, idx) => (
              <motion.div 
                key={issue.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4, delay: idx * 0.05, ease: [0.23, 1, 0.32, 1] }}
              >
                <IssueCard 
                  issue={issue} 
                  userVote={(votes || {})[issue.id]?.[user?.id] || 0}
                  onVote={(val) => {
                    if(user?.id) {
                      voteIssue(issue.id, user.id, val, userCoords);
                    } else {
                      addNotification(t('logInToPulse'), 'info');
                    }
                  }} 
                  issueComments={comments[issue.id] || []}
                  onAddComment={addComment}
                  currentUser={user}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {processedIssues.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-24 bg-card rounded-2xl border border-dashed border-border/60 shadow-sm flex flex-col items-center justify-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-primary/5 rounded-2xl"></div>
              <div className="h-16 w-16 bg-muted rounded-2xl flex items-center justify-center mb-4 relative z-10 shadow-sm">
                <Search className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 relative z-10">{t('No issues reported yet')}</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6 relative z-10">
                {t('It looks quiet here! Be the first to report an issue in the')} <span className="text-foreground font-medium">{t(filter)}</span> {t('category.')}
              </p>
              <Button asChild className="relative z-10 shadow-antigravity rounded-full px-6">
                <Link to="/report">{t('Report an Issue')} <Plus className="w-4 h-4 ml-2" /></Link>
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feed;
