/**
 * AIService.js
 * Server-side AI logic for Classification, Duplicate Detection, and Predictive Alerts.
 */

const CATEGORIES = ['Infrastructure', 'Electricity', 'Water', 'Sanitation', 'Public Transport', 'Other'];
const DEPARTMENTS = {
  'Infrastructure': 'Public Works Department',
  'Electricity': 'Electricity Board',
  'Water': 'Water & Sewage Board',
  'Sanitation': 'Municipal Corporation - Health Dept',
  'Public Transport': 'Transport Authority',
  'Other': 'General Administration'
};

export const classifyIssue = async (title, description) => {
  const content = (title + ' ' + description).toLowerCase();
  
  let category = 'Other';
  if (content.includes('pothole') || content.includes('road') || content.includes('bridge') || content.includes('crack')) {
    category = 'Infrastructure';
  } else if (content.includes('light') || content.includes('wire') || content.includes('power') || content.includes('electricity')) {
    category = 'Electricity';
  } else if (content.includes('water') || content.includes('leak') || content.includes('pipe') || content.includes('sewage')) {
    category = 'Water';
  } else if (content.includes('garbage') || content.includes('trash') || content.includes('clean') || content.includes('smell')) {
    category = 'Sanitation';
  } else if (content.includes('bus') || content.includes('metro') || content.includes('train') || content.includes('stop')) {
    category = 'Public Transport';
  }

  return {
    category,
    department: DEPARTMENTS[category] || 'General Administration',
    urgency: content.includes('danger') || content.includes('accident') || content.includes('critical') ? 'High' : 'Medium'
  };
};

export const findDuplicate = (newIssue, existingIssues) => {
  return existingIssues.find(issue => {
    const latDiff = Math.abs(newIssue.lat - issue.lat);
    const lngDiff = Math.abs(newIssue.lng - issue.lng);
    const locationMatch = latDiff < 0.001 && lngDiff < 0.001; // ~100m radius
    
    // Simplistic title checking
    const titleMatch = newIssue.title.toLowerCase().split(' ').some(word => 
      word.length > 3 && issue.title.toLowerCase().includes(word)
    );

    return locationMatch && titleMatch && issue.progress !== 'Resolved';
  });
};

export const calculatePriorityScore = (issue, votes = {}) => {
  let score = 30; // Base score
  
  // Vote impact
  const upvotes = issue.upvotes || 0;
  const downvotes = issue.downvotes || 0;
  score += upvotes * 5;
  score -= downvotes * 2;
  
  // Severity/Category impact
  if (issue.category === 'Water' || issue.category === 'Infrastructure') score += 20;
  if (issue.urgency === 'High') score += 20;
  
  // Repetition frequency
  if (issue.isRepeat) score += 15;

  return Math.min(Math.max(score, 0), 100);
};

export const getPriorityLabel = (score) => {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

export const analyzePredictiveRisks = (issue, history = []) => {
  const content = (issue.title + ' ' + issue.description).toLowerCase();
  
  if (content.includes('water') && content.includes('leak')) {
    return {
      type: 'Predictive Alert',
      message: 'High Risk: Sustained water leakage detected. Potential structural soil erosion and road subsidence expected within 48-72 hours.',
      riskLevel: 'High'
    };
  }
  
  if (issue.category === 'Infrastructure' && issue.isRepeat) {
    return {
      type: 'Structural Risk',
      message: 'Persistent issues reported in this segment. Potential long-term structural failure. Recommend deep inspection.',
      riskLevel: 'Medium'
    };
  }

  return null;
};

export const getCivicGuidance = async (query) => {
  const q = query.toLowerCase();
  
  if (q.includes('license') || q.includes('permit')) {
    return {
      department: 'General Administration / Licensing Dept',
      steps: [
        '1. Submit application via CitySpark Portal',
        '2. Upload identity & address proof',
        '3. Pay processing fee online',
        '4. Schedule physical verification if required'
      ],
      documents: ['Identity Proof (Aadhar/PAN)', 'Address Proof', 'Passport Photo'],
      location: 'Municipal Office - Room 204'
    };
  }

  if (q.includes('birth') || q.includes('death') || q.includes('certificate')) {
    return {
      department: 'Health & Vital Statistics',
      steps: [
        '1. Register event within 21 days',
        '2. Provide hospital discharge/death summary',
        '3. Verify details at the Zonal Office',
        '4. Download digital certificate'
      ],
      documents: ['Hospital Record', 'Parent/Relative ID Proof', 'Declaration Form'],
      location: 'Zonal Health Center / Online'
    };
  }

  return {
    department: 'Civic Help Desk',
    steps: [
      '1. Clearly describe your query in the assistant',
      '2. We will route you to the relevant department',
      '3. Follow the specific instructions provided'
    ],
    documents: ['General Identity Proof'],
    location: 'Main City Hall - Information Kiosk'
  };
};
