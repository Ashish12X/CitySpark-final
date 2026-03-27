import React, { createContext, useContext, useEffect, useLayoutEffect, useState, useCallback, useRef } from 'react';
import { apiHealth, apiJson } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { findDuplicate } from '@/services/DuplicateService';
import { calculatePriorityScore, getPriorityLabel, classifyIssue } from '@/services/CivicEngine';
import { analyzePatterns, generateEscalation } from '@/services/PredictiveService';
import { isWithinRadius } from '@/lib/geoUtils';
import { useLanguage } from './LanguageContext';

const AppContext = createContext();

const MOCK_ISSUES = [
  {
    id: 1,
    title: 'Pothole on Main St',
    titles: {
      hi: 'मेन स्ट्रीट पर गड्ढा',
      mr: 'मेन स्ट्रीटवर खड्डा',
      bn: 'মেইন স্ট্রিটে গর্ত',
      ta: 'மெயின் ஸ்ட்ரீட்டில் குழி',
      te: 'మెయిన్ స్ట్రీట్‌లోని గుంత',
      gu: 'મેઈન స్ట્રીટ પર ખાડો',
      kn: 'ಮೇಯಿನ್ ಸ್ಟ್ರೀಟ್‌ನಲ್ಲಿ ಗುಂಡಿ',
      pa: 'ਮੇਨ ਸਟਰੀਟ ਤੇ ਟੋਆ',
      ur: 'مین سٹریٹ پر گڈھا',
    },
    description: 'A large pothole has formed on the main street causing damage to vehicles.',
    descriptions: {
      hi: 'मुख्य सड़क पर एक बड़ा गड्ढा बन गया है जिससे वाहनों को नुकसान हो रहा है।',
      mr: 'मुख्य रस्त्यावर एक मोठा खड्डा तयार झाला आहे ज्यामुळे वाहनांचे नुकसान होत आहे।',
      bn: 'প্রধান রাস্তায় একটি বড় গর্ত তৈরি হয়েছে যা যানবাহনের ক্ষতি করছে।',
      ta: 'முக்கிய சாலையில் ஒரு பெரிய குழி உருவாகியுள்ளது, வாகனங்களுக்கு சேதம் ஏற்படுகிறது.',
      te: 'ప్రధాన రోడ్డులో పెద్ద గుంత ఏర్పడింది, వాహనాలకు నష్టం కలుగుతోంది.',
      gu: 'મુખ્ય રસ્તા પર એક મોટો ખાડો પડ્યો છે જે વાહનોને નુકસાન કરી રહ્યો છે.',
      kn: 'ಮುಖ್ಯ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಗುಂಡಿ ಬಿದ್ದಿದ್ದು ವಾಹನಗಳಿಗೆ ಹಾನಿ ಉಂಟಾಗುತ್ತಿದೆ.',
      pa: 'ਮੁੱਖ ਸੜਕ ਤੇ ਇਕ ਵੱਡਾ ਟੋਆ ਬਣ ਗਿਆ ਹੈ ਜੋ ਵਾਹਨਾਂ ਨੂੰ ਨੁਕਸਾਨ ਪਹੁੰਚਾ ਰਿਹਾ ਹੈ।',
      ur: 'مین سٹریٹ پر ایک بڑا گڈھا بن گیا ہے جو گاڑیوں کو نقصان پہنچا رہا ہے۔',
    },
    category: 'Infrastructure',
    location: '123 Main St',
    progress: 'In Progress',
    upvotes: 12,
    downvotes: 2,
    authorId: 100,
    lat: 51.505,
    lng: -0.09,
    img: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800',
  },
  {
    id: 2,
    title: 'Broken Streetlight',
    titles: {
      hi: 'टूटी हुई सड़क की बत्ती',
      mr: 'तुटलेला रस्त्यावरचा दिवा',
      bn: 'ভাঙা রাস্তার বাতি',
      ta: 'உடைந்த தெரு விளக்கு',
      te: 'విరిగిన వీధి దీపం',
      gu: 'તૂટેલી શેરી લાઈટ',
      kn: 'ಮುರಿದ ಬೀದಿ ದೀಪ',
      pa: 'ਟੁੱਟਿਆ ਸੜਕ ਦਾ ਦੀਵਾ',
      ur: 'ٹوٹی ہوئی سڑک کی روشنی',
    },
    description:
      'The streetlight at Oak Ave has been broken for weeks, creating a safety hazard at night.',
    descriptions: {
      hi: 'ओक एवेन्यू की सड़क बत्ती कई हफ्तों से टूटी है, जिससे रात में सुरक्षा का खतरा है।',
      mr: 'ओक एव्हेन्यूवरचा दिवा अनेक आठवड्यांपासून बंद आहे, रात्री सुरक्षेचा धोका आहे।',
      bn: 'ওক অ্যাভিনিউর রাস্তার বাতি কয়েক সপ্তাহ ধরে নষ্ট, রাতে নিরাপত্তার ঝুঁকি তৈরি হচ্ছে।',
      ta: 'ஓக் அவென்யூவின் தெரு விளக்கு வாரங்களாக கேடாக உள்ளது, இரவில் பாதுகாப்பு அபாயம் உள்ளது.',
      te: 'ఓక్ అవెన్యూ వద్ద వీధి దీపం వారాల తరబడి పాడైపోయింది, రాత్రి సమయంలో ప్రమాదం.',
      gu: 'ઓક એવ.ની શેરી લાઈટ અઠવાડિયાથી બંધ છે, રાત્રે સુરક્ષા જોખમ ઊભું થઈ ગયું છે.',
      kn: 'ಓಕ್ ಅವೆನ್ಯೂ ರಸ್ತೆಯ ಬೀದಿ ದೀಪವು ವಾರಗಳಿಂದ ಕೆಟ್ಟಿದ್ದು, ರಾತ್ರಿಯಲ್ಲಿ ಓಡಾಡಲು ಭಯವಾಗುತ್ತದೆ.',
      pa: 'ਓਕ ਐਵੇਨਿਊ ਦਾ ਦੀਵਾ ਹਫ਼ਤਿਆਂ ਤੋਂ ਟੁੱਟਿਆ ਹੈ, ਰਾਤ ਵੇਲੇ ਸੁਰੱਖਿਆ ਖ਼ਤਰਾ ਬਣ ਗਿਆ ਹੈ।',
      ur: 'اوک ایونیو کی سڑک کی بتی ہفتوں سے خراب ہے، رات کو حفاظتی خطرہ ہے۔',
    },
    category: 'Electricity',
    location: '45 Oak Ave',
    progress: 'Reported',
    upvotes: 34,
    downvotes: 5,
    authorId: 101,
    lat: 51.51,
    lng: -0.1,
    img: 'https://images.unsplash.com/photo-1542482324-4f05cd43cbeb?auto=format&fit=crop&q=80&w=800',
    priorityScore: 65,
    priorityLabel: 'High',
  },
  {
    id: 3,
    title: 'Major Water Leakage',
    titles: { hi: 'पानी का भारी रिसाव', bn: 'বড় জল নিঃসরণ', te: 'భారీ నీటి లీకేజీ' },
    description: 'There is a massive water leak near the hospital entrance. The road is flooded.',
    descriptions: { hi: 'अस्पताल के प्रवेश द्वार के पास पानी का भारी रिसाव हो रहा है। सड़क पर पानी भरा है।' },
    category: 'Water',
    location: 'City Hospital South Gate',
    progress: 'Reported',
    upvotes: 45,
    downvotes: 1,
    authorId: 102,
    lat: 51.508,
    lng: -0.095,
    img: 'https://images.unsplash.com/photo-1584281722572-870026685890?auto=format&fit=crop&q=80&w=800',
    priorityScore: 92,
    priorityLabel: 'Critical',
    prediction: {
      type: 'Predictive Alert',
      message: 'High Risk: Unusual water leakage detected near critical infrastructure (Hospital). Potential main supply line failure.',
      riskLevel: 'High'
    }
  },
  {
    id: 10,
    title: 'Streetlight Repair Needed (Nearby)',
    titles: { hi: 'स्ट्रीट लाइट मरम्मत (पास में)', te: 'వీధిలైట్ల మరమ్మత్తు (సమీపంలో)' },
    description: 'The streetlights on the main road are flickering.',
    descriptions: { hi: 'मुख्य सड़क की स्ट्रीट लाइटें टिमटिमा रही हैं।' },
    category: 'Electricity',
    location: 'Rajnagar Ext, Ghaziabad',
    progress: 'Reported',
    upvotes: 5,
    downvotes: 0,
    authorId: 999,
    lat: 28.7534,
    lng: 77.4963,
    img: 'https://images.unsplash.com/photo-1542482324-4f05cd43cbeb?auto=format&fit=crop&q=80&w=800',
    priorityScore: 40,
    priorityLabel: 'Medium',
  },
];

// Helper to sanitize text (keeping it simple since we fixed the MOCK data)
function sanitizeIssueText(issue) {
  return issue;
}

// Deduplication helper to remove duplicate issues by ID
function deduplicateIssues(issues) {
  if (!Array.isArray(issues)) return [];
  const seen = new Set();
  return issues.filter(issue => {
    const id = String(issue?.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function loadLocalIssues() {
  const saved = localStorage.getItem('cityspark_issues');
  let issues = saved ? JSON.parse(saved) : [...MOCK_ISSUES];
  if (!issues.find(i => i.id === 10)) {
    issues.push(MOCK_ISSUES.find(i => i.id === 10));
  }
  return deduplicateIssues(issues.map(sanitizeIssueText));
}

function notificationsStorageKey(userId) {
  return `cityspark_notifications_${userId}`;
}

function normalizeEntityId(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') {
    const normalized = String(value).trim();
    return normalized || null;
  }
  if (typeof value === 'object') {
    const candidate = value.$oid || value._id || value.id;
    if (candidate !== undefined && candidate !== null) {
      const normalized = String(candidate).trim();
      return normalized || null;
    }
    if (typeof value.toString === 'function') {
      const normalized = String(value.toString()).trim();
      if (normalized && normalized !== '[object Object]') return normalized;
    }
  }
  return null;
}

function defaultWelcomeNotification(t) {
  return { id: 1, message: t('Welcome to CitySpark!'), type: 'info', read: false, createdAt: new Date().toISOString() };
}

export const AppProvider = ({ children }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [useRemoteDb, setUseRemoteDb] = useState(false);

  const [issues, setIssues] = useState(loadLocalIssues);
  const [votes, setVotes] = useState(() => {
    const saved = localStorage.getItem('cityspark_votes');
    return saved ? JSON.parse(saved) : {};
  });
  const [notifications, setNotifications] = useState([]);
  const [comments, setComments] = useState(() => {
    const saved = localStorage.getItem('cityspark_comments');
    return saved ? JSON.parse(saved) : {};
  });
  const [userStats, setUserStats] = useState(() => {
    const saved = localStorage.getItem('cityspark_user_stats');
    return saved ? JSON.parse(saved) : {};
  });

  const checkBadges = useCallback((points) => {
    const badges = [];
    if (points >= 100) badges.push({ id: 'watcher', name: t('Watcher'), icon: '👁️' });
    if (points >= 500) badges.push({ id: 'guardian', name: t('Guardian'), icon: '🛡️' });
    if (points >= 1000) badges.push({ id: 'hero', name: t('Hero'), icon: '🦸' });
    return badges;
  }, [t]);

  const addAuditLog = useCallback((issueId, action, performedBy, previousStatus, newStatus) => {
    setIssues(prev => prev.map(i => {
      if (i.id === issueId) {
        const logs = i.auditLogs || [];
        return { 
          ...i, 
          auditLogs: [...logs, { timestamp: new Date().toISOString(), action, performedBy, previousStatus, newStatus }] 
        };
      }
      return i;
    }));
  }, []);

  const addNotification = useCallback(
    async (message, type = 'info') => {
      if (useRemoteDb) {
        try {
          const n = await apiJson('/api/notifications', { method: 'POST', body: { message, type } });
          setNotifications((prev) => [n, ...prev]);
        } catch (e) { console.error(e); }
        return;
      }
      setNotifications((prev) => [{ id: Date.now(), message, type, read: false, createdAt: new Date().toISOString() }, ...prev]);
    },
    [useRemoteDb]
  );

  const prevUserStats = useRef(userStats);
  useEffect(() => {
    Object.keys(userStats).forEach(userId => {
      const stats = userStats[userId];
      const prevStats = prevUserStats.current[userId] || { badges: [] };
      if (stats.badges && stats.badges.length > (prevStats.badges ? prevStats.badges.length : 0)) {
        const latestBadge = stats.badges[stats.badges.length - 1];
        addNotification(`${t("Congratulations! You've earned the")} ${latestBadge.name} ${t('badge!')} ${latestBadge.icon}`, 'success');
      }
    });
    prevUserStats.current = userStats;
  }, [userStats, addNotification, t]);

  useEffect(() => {
    localStorage.setItem('cityspark_user_stats', JSON.stringify(userStats));
  }, [userStats]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await apiHealth();
      if (!ok || cancelled) return;
      try {
        const data = await apiJson('/api/bootstrap');
        if (cancelled) return;
        setIssues(deduplicateIssues((data.issues || []).map(sanitizeIssueText)));
        setVotes(data.votes || {});
        setComments(data.comments || {});
        setUseRemoteDb(true);
      } catch { /* keep local */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!useRemoteDb || !user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await apiJson('/api/notifications');
        if (!cancelled) setNotifications(Array.isArray(list) ? list : []);
      } catch { if (!cancelled) setNotifications([]); }
    })();
    return () => { cancelled = true; };
  }, [useRemoteDb, user?.id]);

  // Dynamic Deadline Escalation Engine
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setIssues(prev => prev.map(i => {
        if (i.deadline && new Date(i.deadline) < now && i.progress === 'In Progress') {
          addNotification(`${t('SLA Breach')}: ${t('Issue')} [${i.title}] ${t('auto-escalated to higher authority.')}`, 'warning');
          addAuditLog(i.id, 'SLA Breach Auto-Escalation', 'System AI', i.progress, 'Escalated');
          return { ...i, progress: 'Escalated', priorityScore: 100, priorityLabel: 'Critical' };
        }
        return i;
      }));
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [addAuditLog, addNotification, t]);

  useLayoutEffect(() => {
    if (useRemoteDb || !user?.id) return;
    const key = notificationsStorageKey(user.id);
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setNotifications(Array.isArray(parsed) ? parsed : [defaultWelcomeNotification(t)]);
      } catch { setNotifications([defaultWelcomeNotification(t)]); }
    } else {
      setNotifications([defaultWelcomeNotification(t)]);
    }
  }, [useRemoteDb, user?.id, t]);

  useEffect(() => {
    if (useRemoteDb || !user?.id) return;
    localStorage.setItem(notificationsStorageKey(user.id), JSON.stringify(notifications));
  }, [notifications, useRemoteDb, user?.id]);

  useEffect(() => {
    if (!useRemoteDb) localStorage.setItem('cityspark_issues', JSON.stringify(issues));
  }, [issues, useRemoteDb]);

  useEffect(() => {
    if (!useRemoteDb) localStorage.setItem('cityspark_votes', JSON.stringify(votes));
  }, [votes, useRemoteDb]);

  useEffect(() => {
    if (!useRemoteDb) localStorage.setItem('cityspark_comments', JSON.stringify(comments));
  }, [comments, useRemoteDb]);

  const awardPoints = useCallback((userId, amount, reason) => {
    const normalizedUserId = normalizeEntityId(userId);
    if (!normalizedUserId) {
      console.warn('[AppContext] awardPoints failed: No userId provided');
      return;
    }
    
    console.log(`[AppContext] Awarding ${amount} points to User ${normalizedUserId} for: ${reason}`);
    
    setUserStats(prev => {
      const stats = prev[normalizedUserId] || { points: 0, badges: [], trustScore: 50 };
      const newPoints = stats.points + amount;
      
      // Dynamic Trust Score Logic
      let trustAdjustment = 0;
      if (reason.toLowerCase().includes('verified')) trustAdjustment = 5;
      if (reason.toLowerCase().includes('rejected')) trustAdjustment = -10;
      const newTrust = Math.min(Math.max((stats.trustScore || 50) + trustAdjustment, 0), 100);

      const newBadges = checkBadges(newPoints);
      const newState = { ...prev, [normalizedUserId]: { points: newPoints, badges: newBadges, trustScore: newTrust } };
      console.log(`[AppContext] Updated UserStats for ${normalizedUserId}:`, newState[normalizedUserId]);
      return newState;
    });

    addNotification(`${amount > 0 ? '+' : ''}${amount} ${t('pts')}: ${t(reason)}`, 'success');
  }, [checkBadges, addNotification, t]);

  const settleIssueOutcomePoints = useCallback((issue, outcomeStatus) => {
    if (!issue || !['Verified', 'Rejected'].includes(outcomeStatus)) return;

    const voteMap = votes?.[issue.id] || issue.voteMap || {};
    const reporterId = normalizeEntityId(issue.authorId);

    // Reporter gets points only when the report is genuinely completed and verified.
    if (outcomeStatus === 'Verified' && reporterId) {
      awardPoints(reporterId, 80, 'Genuine civic report completed and verified');
    }

    // Upvoters are rewarded/penalized only after final completion decision.
    Object.entries(voteMap).forEach(([voterId, vote]) => {
      if (vote !== 1) return;
      if (!voterId || String(voterId) === String(reporterId)) return;

      if (outcomeStatus === 'Verified') {
        awardPoints(voterId, 15, 'Supported a report that was approved and completed');
      } else if (outcomeStatus === 'Rejected') {
        awardPoints(voterId, -10, 'Upvoted a report that was later rejected');
      }
    });
  }, [votes, awardPoints]);

  const markNotificationRead = useCallback(async (id) => {
    if (useRemoteDb) {
      try {
        await apiJson(`/api/notifications/${id}/read`, { method: 'PATCH' });
      } catch (e) { console.error(e); }
    }
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, [useRemoteDb]);

  const markAllRead = useCallback(async () => {
    if (useRemoteDb) {
      try {
        const list = await apiJson('/api/notifications/read-all', { method: 'PATCH' });
        setNotifications(list);
        return;
      } catch (e) { console.error(e); }
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [useRemoteDb]);

  const clearNotification = useCallback(async (id) => {
    if (useRemoteDb) {
      try {
        await apiJson(`/api/notifications/${id}`, { method: 'DELETE' });
      } catch (e) { console.error(e); }
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, [useRemoteDb]);

  const voteIssue = useCallback(
    async (issueId, userId, voteValue, userCoords = null) => {
      const issueToVote = issues.find(i => i.id === issueId);
      if (!issueToVote) return;
      
      const targetCoords = userCoords || ((user && user.lat && user.lng) ? { lat: user.lat, lng: user.lng } : null);

      if (targetCoords && issueToVote.lat && issueToVote.lng) {
        if (!isWithinRadius(targetCoords, { lat: issueToVote.lat, lng: issueToVote.lng }, 5, 'km')) {
          addNotification(t('You can only vote for issues near your location'), 'error');
          return;
        }
      }

      const deviceId = localStorage.getItem('cityspark_device_id') || 'dev_' + Math.random().toString(36).substr(2, 9);
      if (!localStorage.getItem('cityspark_device_id')) localStorage.setItem('cityspark_device_id', deviceId);
      
      const votedDevices = JSON.parse(localStorage.getItem(`cityspark_voted_${issueId}`) || '[]');
      if (voteValue !== 0 && votedDevices.includes(deviceId) && !votes[issueId]?.[userId]) {
        addNotification(t('Security Alert: Multiple votes from same device detected.'), 'warning');
        return;
      }

      const issueVotes = votes[issueId] || {};
      const currentVote = issueVotes[userId];
      if (useRemoteDb) {
        try {
          const { issue, votesForIssue } = await apiJson(`/api/issues/${issueId}/vote`, { method: 'POST', body: { voteValue } });
          setVotes((prev) => ({ ...prev, [issueId]: votesForIssue || {} }));
          setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, ...issue } : i)));
        } catch (e) { console.error('voteIssue', e); }
        return;
      }
      
      const newIssueVotes = { ...issueVotes };
      let upvoteDiff = 0, downvoteDiff = 0;
      if (currentVote === voteValue) {
        delete newIssueVotes[userId];
        if (voteValue === 1) upvoteDiff = -1;
        if (voteValue === -1) downvoteDiff = -1;
      } else {
        newIssueVotes[userId] = voteValue;
        if (voteValue === 1) { upvoteDiff = 1; if (currentVote === -1) downvoteDiff = -1; }
        else if (voteValue === -1) { downvoteDiff = 1; if (currentVote === 1) upvoteDiff = -1; }
      }
      setVotes((prev) => ({ ...prev, [issueId]: newIssueVotes }));
      
      if (voteValue !== 0 && !votedDevices.includes(deviceId)) {
        localStorage.setItem(`cityspark_voted_${issueId}`, JSON.stringify([...votedDevices, deviceId]));
      }

      setIssues((currentIssues) => currentIssues.map((i) => {
        if (i.id === issueId) {
          const baseUpvotes = i.upvotes !== undefined ? i.upvotes : i.votes || 0;
          const baseDownvotes = i.downvotes || 0;
          const newUpvotes = baseUpvotes + upvoteDiff;
          const newDownvotes = baseDownvotes + downvoteDiff;
          
          const totalVotes = Object.keys(newIssueVotes).length;
          const upvoteCount = Object.values(newIssueVotes).filter(v => v === 1).length;
          
          const nearbyUsers = Object.values(userStats).filter(u => u.points > 10).length || 10;
          const dynamicThreshold = Math.max(3, Math.floor(nearbyUsers * 0.25));
          
          const updatedIssue = { ...i, upvotes: newUpvotes, downvotes: newDownvotes };
          
          if (totalVotes >= dynamicThreshold && (upvoteCount / totalVotes) >= 0.7 && i.verificationStatus !== 'Verified') {
            updatedIssue.verificationStatus = 'Verified';
            updatedIssue.progress = 'Reported';
            addNotification(`${t('Issue')} [${i.title}] ${t('has been community verified!')}`, 'success');
            addAuditLog(i.id, 'Community Auto-Verification', 'Civic Network', 'Pending', 'Verified');
          }

          updatedIssue.priorityScore = calculatePriorityScore(updatedIssue, newIssueVotes);
          updatedIssue.priorityLabel = getPriorityLabel(updatedIssue.priorityScore);
          return updatedIssue;
        }
        return i;
      }));
    },
    [useRemoteDb, votes, issues, addNotification, calculatePriorityScore, getPriorityLabel, user, userStats, t]
  );

  const addIssue = useCallback(
    async (issue) => {
      const duplicate = findDuplicate(issue, issues);
      if (duplicate) {
        await voteIssue(duplicate.id, user?.id || 'anonymous', 1);
        return { duplicate: true, id: duplicate.id };
      }
      const classification = await classifyIssue(issue.title, issue.description);
      const enrichedIssue = { ...issue, ...classification, isRepeat: analyzePatterns(issue, issues) !== null };
      const priorityScore = calculatePriorityScore(enrichedIssue);
      const priorityLabel = getPriorityLabel(priorityScore);
      const prediction = analyzePatterns(enrichedIssue, issues);
      const escalation = generateEscalation(enrichedIssue, priorityScore);

      if (useRemoteDb) {
        try {
          const { authorId: _a, ...payload } = enrichedIssue;
          const created = await apiJson('/api/issues', { method: 'POST', body: { ...payload, priority_score: priorityScore, priority_label: priorityLabel, prediction, escalation } });
          setIssues((prev) => deduplicateIssues([{ ...created, upvotes: created.upvotes ?? 0, downvotes: created.downvotes ?? 0 }, ...prev]));
          return created;
        } catch (e) { console.error('addIssue', e); }
        return;
      }
      const newIssue = { ...enrichedIssue, id: Date.now(), upvotes: 0, downvotes: 0, progress: 'Reported', priorityScore, priorityLabel, prediction, escalation, createdAt: new Date().toISOString() };
      setIssues((prev) => deduplicateIssues([newIssue, ...prev]));
      if (issue.lat && issue.lng) addNotification(`${t('New Issue Reported Nearby')}: ${issue.title}`, 'nearby');
      if (escalation) addNotification(`${t('Urgent')}: ${t(escalation.message)}`, 'warning');
      else if (prediction) addNotification(`${t('AI Insight')}: ${t(prediction.message)}`, 'info');
      return newIssue;
    },
    [useRemoteDb, issues, addNotification, voteIssue, t, user?.id]
  );

  const addComment = useCallback(
    async (issueId, comment) => {
      if (useRemoteDb) {
        try {
          const saved = await apiJson(`/api/issues/${issueId}/comments`, { method: 'POST', body: { text: comment.text } });
          setComments((prev) => ({ ...prev, [issueId]: [...(prev[issueId] || []), saved] }));
          awardPoints(comment.authorId, 5, 'Contributing to the conversation');
        } catch (e) { console.error(e); }
        return;
      }
      setComments((prev) => ({ ...prev, [issueId]: [...(prev[issueId] || []), { ...comment, id: Date.now(), timestamp: new Date().toISOString() }] }));
      awardPoints(comment.authorId, 5, 'Contributing to the conversation');
    },
    [useRemoteDb, awardPoints]
  );

  const assignIssue = useCallback(
    async (issueId, authorityId, deadline, options = {}) => {
      if (useRemoteDb) {
        try {
          const { note, mode, authorityName } = options;
          const updated = await apiJson(`/api/issues/${issueId}/assign`, {
            method: 'PATCH',
            body: { authorityId, deadline, note, mode },
          });
          setIssues((prev) => {
            const list = prev.map((i) => (String(i.id) === String(issueId) ? { ...i, ...updated } : i));
            const issue = list.find((l) => String(l.id) === String(issueId));
            const assignee = authorityName || authorityId;
            if (issue) addNotification(`${t('Your report')} [${issue.title}] ${t('has been assigned to')} ${assignee}`, 'info');
            return list;
          });
          return updated;
        } catch (e) {
          console.error(e);
          throw e;
        }
      }
      setIssues(prev => prev.map(i => {
        if (i.id === issueId) {
          addNotification(`${t('Your report')} [${i.title}] ${t('has been assigned to')} ${authorityId}`, 'info');
          addAuditLog(i.id, 'Manual Assignment', 'Admin', i.progress, 'In Progress');
          return { ...i, assignedTo: authorityId, progress: 'In Progress', deadline };
        }
        return i;
      }));
    },
    [useRemoteDb, addNotification, t]
  );

  const resolveIssue = useCallback(
    async (issueId, completionImg, completionDescription) => {
      if (useRemoteDb) {
        try {
          const updated = await apiJson(`/api/issues/${issueId}/resolve`, {
            method: 'PATCH',
            body: { completionImg, completionDescription },
          });
          setIssues((prev) => {
            const list = prev.map((i) => (String(i.id) === String(issueId) ? { ...i, ...updated } : i));
            const issue = list.find((l) => String(l.id) === String(issueId));
            if (issue) addNotification(`${t('GREAT NEWS! Your report')} [${issue.title}] ${t('is marked as Fixed. Please verify.')}`, 'success');
            return list;
          });
          return updated;
        } catch (e) { console.error(e); }
      }
      setIssues(prev => prev.map(i => {
        if (i.id === issueId) {
          addNotification(`${t('GREAT NEWS! Your report')} [${i.title}] ${t('is marked as Fixed. Please verify.')}`, 'success');
          addAuditLog(i.id, 'Issue Resolved', i.assignedTo || 'Authority', i.progress, 'Resolved');
          return {
            ...i,
            progress: 'Resolved',
            completionImg,
            completionDescription,
            completedAt: new Date().toISOString(),
            verificationStatus: 'Pending',
          };
        }
        return i;
      }));
    },
    [useRemoteDb, addNotification, t]
  );

  const verifyIssue = useCallback(
    async (issueId, status, comment) => {
      const targetIssue = issues.find((i) => String(i.id) === String(issueId));
      const previousStatus = targetIssue?.verificationStatus;
      const shouldSettle = ['Verified', 'Rejected'].includes(status) && previousStatus !== status;

      if (useRemoteDb) {
        try {
          const res = await apiJson(`/api/issues/${issueId}/verify`, { method: 'POST', body: { status, comment } });
          setIssues((prev) => prev.map((i) => {
            if (String(i.id) !== String(issueId)) return i;
            const merged = { ...i, ...(res?.issue || {}), verificationStatus: status, pointsOutcomeApplied: shouldSettle ? status : i.pointsOutcomeApplied };
            return merged;
          }));
          if (shouldSettle && targetIssue) settleIssueOutcomePoints(targetIssue, status);
          addNotification(status === 'Rejected' ? t('Rework request sent to admin') : t('Verification recorded'), status === 'Rejected' ? 'warning' : 'success');
          return res;
        } catch (e) { console.error(e); }
      }
      setIssues(prev => prev.map(i => {
        if (String(i.id) === String(issueId)) {
          if (status === 'Rejected') {
            addNotification(`${t('Escalation Alert')}: ${t('Issue')} [${i.title}] ${t('fix rejected by user. Re-assigning...')}`, 'warning');
            addAuditLog(i.id, 'Resolution Rejected', user?.id || 'User', 'Resolved', 'In Progress');
            const newScore = Math.min((i.priorityScore || 50) + 25, 100);
            return {
              ...i,
              verificationStatus: 'Rejected',
              verificationComment: comment,
              verificationBy: user?.id,
              rejectedAt: new Date().toISOString(),
              needsAdminReview: true,
              progress: 'In Progress',
              priorityScore: newScore,
              priorityLabel: getPriorityLabel(newScore),
              pointsOutcomeApplied: shouldSettle ? 'Rejected' : i.pointsOutcomeApplied,
            };
          }
          if (status === 'Verified') {
             addAuditLog(i.id, 'User Verified Fix', user?.id || 'User', 'Resolved', 'Closed (Verified)');
          }
          return {
            ...i,
            verificationStatus: status,
            verificationComment: comment,
            verificationBy: user?.id,
            verifiedAt: status === 'Verified' ? new Date().toISOString() : i.verifiedAt,
            needsAdminReview: status === 'Rejected' ? true : false,
            pointsOutcomeApplied: shouldSettle ? status : i.pointsOutcomeApplied,
          };
        }
        return i;
      }));

      if (shouldSettle && targetIssue) settleIssueOutcomePoints(targetIssue, status);
    },
    [useRemoteDb, addNotification, user?.id, issues, settleIssueOutcomePoints, t]
  );

  const adminReviewIssue = useCallback(
    async (issueId, note = '', action = 'review') => {
      const targetIssue = issues.find((i) => String(i.id) === String(issueId));
      const shouldSettleVerified = action === 'mark_completed' && targetIssue?.verificationStatus !== 'Verified';

      if (useRemoteDb) {
        try {
          const updated = await apiJson(`/api/issues/${issueId}/admin-review`, {
            method: 'PATCH',
            body: { note, action },
          });
          setIssues((prev) => prev.map((i) => (String(i.id) === String(issueId) ? { ...i, ...updated } : i)));
          if (shouldSettleVerified && targetIssue) {
            settleIssueOutcomePoints(targetIssue, 'Verified');
          }
          return updated;
        } catch (e) {
          console.error(e);
          throw e;
        }
      }

      setIssues((prev) => prev.map((i) => {
        if (String(i.id) !== String(issueId)) return i;
        const base = {
          ...i,
          needsAdminReview: false,
          adminReviewNote: note,
          adminReviewedAt: new Date().toISOString(),
          adminReviewedBy: user?.id,
        };

        if (action === 'mark_completed') {
          return {
            ...base,
            progress: 'Resolved',
            verificationStatus: 'Verified',
            resolutionStatus: 'admin_override',
            verifiedAt: new Date().toISOString(),
            rejectedAt: undefined,
          };
        }

        return base;
      }));

      if (shouldSettleVerified && targetIssue) {
        settleIssueOutcomePoints(targetIssue, 'Verified');
      }
    },
    [useRemoteDb, user?.id, issues, settleIssueOutcomePoints]
  );

  const fileAppeal = useCallback(
    async (issueId, message) => {
      if (useRemoteDb) {
        try {
          const updated = await apiJson(`/api/issues/${issueId}/appeal`, {
            method: 'POST',
            body: { message },
          });
          setIssues((prev) => prev.map((i) => (String(i.id) === String(issueId) ? { ...i, ...updated.issue } : i)));
          return updated;
        } catch (e) {
          console.error(e);
          throw e;
        }
      }

      setIssues((prev) => prev.map((i) => {
        if (String(i.id) !== String(issueId)) return i;
        const maxAppeal = i.appeals && i.appeals.length > 0 
          ? Math.max(...i.appeals.map(a => a.id || 0))
          : 0;
        return {
          ...i,
          appeals: [
            ...(i.appeals || []),
            {
              id: maxAppeal + 1,
              userId: user?.id,
              userName: user?.name,
              message,
              timestamp: new Date().toISOString(),
              status: 'pending',
              adminAction: 'none',
              adminNote: '',
            },
          ],
        };
      }));
    },
    [useRemoteDb, user?.id, user?.name]
  );

  const handleAppealAction = useCallback(
    async (issueId, appealId, action, note, authorityId) => {
      if (useRemoteDb) {
        try {
          const updated = await apiJson(`/api/issues/${issueId}/appeal/${appealId}/action`, {
            method: 'PUT',
            body: { action, note, authorityId },
          });
          setIssues((prev) => prev.map((i) => (String(i.id) === String(issueId) ? { ...i, ...updated.issue } : i)));
          return updated;
        } catch (e) {
          console.error(e);
          throw e;
        }
      }

      setIssues((prev) => prev.map((i) => {
        if (String(i.id) !== String(issueId)) return i;
        const updatedAppeals = (i.appeals || []).map((a) => {
          if (a.id === appealId) {
            return {
              ...a,
              status: 'reviewed',
              adminAction: action,
              adminNote: note,
              adminReviewedAt: new Date().toISOString(),
              adminReviewedBy: user?.id,
            };
          }
          return a;
        });

        let updated = {
          ...i,
          appeals: updatedAppeals,
        };

        if (action === 'reassigned') {
          updated = {
            ...updated,
            progress: 'In Progress',
            resolutionStatus: 'reopened',
            assignedTo: authorityId,
            assignmentNote: `Admin reopened: ${note || 'Resolution was inadequate'}`,
            completionImg: '',
            completionDescription: '',
            completedAt: undefined,
            verificationStatus: 'Pending',
          };
        } else if (action === 'admin_override') {
          updated = {
            ...updated,
            resolutionStatus: 'admin_override',
          };
        }

        return updated;
      }));
    },
    [useRemoteDb, user?.id]
  );

  return (
    <AppContext.Provider
      value={{
        issues, addIssue, voteIssue, votes, notifications, markNotificationRead, markAllRead, clearNotification, addNotification, comments, addComment, userStats, useRemoteDb,
        assignIssue, resolveIssue, verifyIssue, adminReviewIssue, fileAppeal, handleAppealAction, isWithinRadius,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
