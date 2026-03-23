import { Router } from 'express';
import { getCivicGuidance } from '../services/AIService.js';

const router = Router();

router.post('/assistant', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });
    
    const guidance = await getCivicGuidance(query);
    res.json(guidance);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
