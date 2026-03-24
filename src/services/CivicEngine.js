/**
 * Advanced Civic Intelligence Engine
 */
import { translateWithGemini } from '@/services/GeminiService';

/**
 * Calculates a Priority Score (0-100)
 */
export const calculatePriorityScore = (issue, votes = {}) => {
  const { severity = 'Low', upvotes = 0, downvotes = 0, isHospitalArea = false, isRepeat = false } = issue;
  
  let score = 0;
  
  // 1. Severity Base Score (0-40)
  const severityMap = { 'Low': 10, 'Medium': 25, 'High': 40, 'Critical': 40 };
  score += severityMap[severity] || 10;
  
  // 2. Community Engagement (0-30)
  const totalVotes = upvotes - downvotes;
  const engagementScore = Math.min(Math.max(totalVotes * 2, 0), 30);
  score += engagementScore;
  
  // 3. Location Importance (0-20)
  if (isHospitalArea || issue.location?.toLowerCase().includes('hospital')) score += 20;
  else if (issue.location?.toLowerCase().includes('school')) score += 15;
  else if (issue.location?.toLowerCase().includes('market')) score += 10;
  
  // 4. Repeat Frequency (0-10)
  if (isRepeat) score += 10;
  
  return Math.min(score, 100);
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
