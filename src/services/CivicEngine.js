/**
 * Advanced Civic Intelligence Engine
 */
import { translateWithGemini } from '@/services/GeminiService';

/**
 * Calculates a Priority Score (0-100)
 */
export const calculatePriorityScore = (issue, votes = {}) => {
  const { severity = 'Low', upvotes = 0, downvotes = 0, isHospitalArea = false, isRepeat = false } = issue;

  const severityMap = { Low: 25, Medium: 50, High: 75, Critical: 100 };
  const severityScore = severityMap[severity] ?? 25;

  let aiScore = severityScore;
  if (isHospitalArea || issue.location?.toLowerCase().includes('hospital')) aiScore += 15;
  else if (issue.location?.toLowerCase().includes('school')) aiScore += 10;
  else if (issue.location?.toLowerCase().includes('market')) aiScore += 6;
  if (isRepeat) aiScore += 10;
  aiScore = Math.min(Math.max(aiScore, 0), 100);

  // Community score: upvotes / totalVotes mapped to 0-100.
  const resolvedVotes = Object.keys(votes || {}).length > 0
    ? Object.values(votes)
    : Array(upvotes).fill(1).concat(Array(downvotes).fill(-1));
  const total = resolvedVotes.length;
  const up = resolvedVotes.filter(v => v === 1).length;
  const voteScore = total === 0
    ? 0
    : Math.round((up / total) * 100);

  const weightedScore = Math.round(aiScore * 0.3 + voteScore * 0.7);
  return Math.min(Math.max(weightedScore, 0), 100);
};

/**
 * Gets Priority Label from Score
 */
export const getPriorityLabel = (score) => {
  if (score >= 85) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
};

/**
 * Uses AI to classify issue details
 */
export const classifyIssue = async (title, description) => {
  const prompt = `Classify this civic issue:\nTitle: ${title}\nDescription: ${description}\n\nReturn JSON only: { "severity": "Low|Medium|High|Critical", "urgency": "Low|Medium|High", "category": "Infrastructure|Water|Electricity|Sanitation|Other", "is_emergency": boolean, "department": "string" }`;
  
  try {
    const aiResponse = await translateWithGemini(prompt, 'en'); // Using Gemini for analysis
    if (aiResponse) {
      // Clean possible MD markers
      const cleanJson = aiResponse.replace(/```json|```/g, '').trim();
      return JSON.parse(cleanJson);
    }
  } catch (err) {
    console.error('AI Classification failed:', err);
  }
  
  return { severity: 'Medium', urgency: 'Medium', category: 'Infrastructure', is_emergency: false, department: 'General Public Works' };
};
