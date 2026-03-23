import { Router } from 'express';
import { Issue } from '../models/Issue.js';
import { requireAuth } from '../middleware/auth.js';
import * as AIService from '../services/AIService.js';

const router = Router();

function applyVoteLogic(voteMap, userId, voteValue) {
  const uid = String(userId);
  const current = { ...voteMap };
  const prev = current[uid];
  let upvoteDiff = 0;
  let downvoteDiff = 0;

  if (prev === voteValue) {
    delete current[uid];
    if (voteValue === 1) upvoteDiff = -1;
    if (voteValue === -1) downvoteDiff = -1;
  } else {
    current[uid] = voteValue;
    if (voteValue === 1) {
      upvoteDiff = 1;
      if (prev === -1) downvoteDiff = -1;
    } else if (voteValue === -1) {
      downvoteDiff = 1;
      if (prev === 1) upvoteDiff = -1;
    }
  }
  return { voteMap: current, upvoteDiff, downvoteDiff };
}

router.post('/', requireAuth, async (req, res) => {
  try {
    const existingIssues = await Issue.find({ progress: { $ne: 'Resolved' } }).lean();
    const duplicate = AIService.findDuplicate(req.body, existingIssues);

    if (duplicate) {
      // Auto-upvote the duplicate
      const vm = duplicate.voteMap && typeof duplicate.voteMap === 'object' ? { ...duplicate.voteMap } : {};
      const { voteMap, upvoteDiff, downvoteDiff } = applyVoteLogic(vm, req.user.id, 1);
      
      const updatedDuplicate = await Issue.findOneAndUpdate(
        { id: duplicate.id },
        { 
          voteMap, 
          $inc: { upvotes: upvoteDiff, downvotes: downvoteDiff },
          isRepeat: true 
        },
        { new: true }
      );

      const o = updatedDuplicate.toObject();
      delete o.voteMap;
      delete o.comments;
      return res.status(200).json({ ...o, duplicate: true });
    }

    const aiFeatures = await AIService.classifyIssue(req.body.title, req.body.description);
    const prediction = await AIService.analyzePredictiveRisks(req.body);
    const priorityScore = AIService.calculatePriorityScore({ ...req.body, ...aiFeatures });
    const priorityLabel = AIService.getPriorityLabel(priorityScore);

    const maxDoc = await Issue.findOne().sort({ id: -1 }).select('id').lean();
    const nextId = maxDoc?.id != null ? maxDoc.id + 1 : Date.now();

    const doc = await Issue.create({
      id: nextId,
      title: req.body.title,
      description: req.body.description || '',
      category: aiFeatures.category || req.body.category,
      location: req.body.location || '',
      lat: req.body.lat,
      lng: req.body.lng,
      authorId: req.user.id,
      img: req.body.img,
      progress: 'Reported',
      upvotes: 0,
      downvotes: 0,
      voteMap: {},
      comments: [],
      
      // AI Features
      department: aiFeatures.department,
      priorityScore,
      priorityLabel,
      prediction,
      verificationStatus: 'Pending'
    });

    const o = doc.toObject();
    delete o.voteMap;
    delete o.comments;
    res.status(201).json(o);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:issueId/vote', requireAuth, async (req, res) => {
  try {
    const issueId = Number(req.params.issueId);
    const { voteValue } = req.body;
    if (voteValue === undefined || voteValue === null) {
      return res.status(400).json({ error: 'voteValue is required' });
    }
    const userId = req.user.id;

    const issue = await Issue.findOne({ id: issueId });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const vm = issue.voteMap && typeof issue.voteMap === 'object' ? { ...issue.voteMap } : {};
    const { voteMap, upvoteDiff, downvoteDiff } = applyVoteLogic(vm, userId, voteValue);

    issue.voteMap = voteMap;
    issue.upvotes = (issue.upvotes ?? 0) + upvoteDiff;
    issue.downvotes = (issue.downvotes ?? 0) + downvoteDiff;

    // Recalculate Priority
    issue.priorityScore = AIService.calculatePriorityScore(issue, voteMap);
    issue.priorityLabel = AIService.getPriorityLabel(issue.priorityScore);

    // Escalation Logic: If upvotes > 5, flag as escalated
    if (issue.upvotes > 5 && !issue.escalation) {
      issue.escalation = {
        type: 'Public Escalation',
        message: 'High community interest detected. Escalated to Department Head.',
        level: 'Urgent'
      };
    }

    await issue.save();

    const o = issue.toObject();
    const votesForIssue = o.voteMap && typeof o.voteMap === 'object' ? { ...o.voteMap } : {};
    delete o.voteMap;
    delete o.comments;

    res.json({ issue: o, votesForIssue });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:issueId/comments', requireAuth, async (req, res) => {
  try {
    const issueId = Number(req.params.issueId);
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Comment text is required' });

    const issue = await Issue.findOne({ id: issueId });
    if (!issue) return res.status(404).json({ error: 'Issue not found' });

    const comment = {
      id: Date.now(),
      text: text.trim(),
      authorId: req.user.id,
      authorName: req.user.name || 'Citizen',
      timestamp: new Date().toISOString(),
    };
    issue.comments = [...(issue.comments || []), comment];
    await issue.save();

    res.status(201).json(comment);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Authority Assignment (Admin only)
router.patch('/:issueId/assign', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { authorityId, deadline } = req.body;
    
    const issue = await Issue.findOneAndUpdate(
      { id: Number(req.params.issueId) },
      { 
        assignedTo: authorityId, 
        deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        progress: 'In Progress'
      },
      { new: true }
    );
    res.json(issue);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Completion Upload (Authority only)
router.patch('/:issueId/resolve', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'authority') return res.status(403).json({ error: 'Authority access required' });
    const { completionImg } = req.body;
    
    const issue = await Issue.findOneAndUpdate(
      { id: Number(req.params.issueId) },
      { 
        progress: 'Resolved',
        completionImg,
        verificationStatus: 'Pending'
      },
      { new: true }
    );
    res.json(issue);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// User Verification
router.post('/:issueId/verify', requireAuth, async (req, res) => {
  try {
    const { status, comment } = req.body; 
    const issueId = Number(req.params.issueId);
    
    const issue = await Issue.findOne({ id: issueId });
    if (!issue || issue.progress !== 'Resolved') return res.status(400).json({ error: 'Issue must be resolved to verify' });

    issue.verificationStatus = status;
    await issue.save();
    
    res.json({ message: 'Verification recorded', status });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
