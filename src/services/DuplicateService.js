/**
 * Duplicate Detection and Clustering Service
 */
import { getDistance } from '@/lib/geoUtils';

const DUPLICATE_RADIUS_METERS = 50; // 50 meters
const SIMILARITY_THRESHOLD = 0.7; // 70% similarity

/**
 * Simple string similarity check (Levenshtein distance simplified)
 */
const stringSimilarity = (s1, s2) => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = (a, b) => {
    const costs = [];
    for (let i = 0; i <= a.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= b.length; j++) {
        if (i === 0) costs[j] = j;
        else if (j > 0) {
          let newValue = costs[j - 1];
          if (a.charAt(i - 1) !== b.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[b.length] = lastValue;
    }
    return costs[b.length];
  };

  return (longer.length - editDistance(longer, shorter)) / longer.length;
};

/**
 * Finds duplicate/matching issue in existing reports
 */
export const findDuplicate = (newIssue, existingIssues) => {
  return existingIssues.find(existing => {
    // 1. Check distance
    const distance = getDistance(newIssue.lat, newIssue.lng, existing.lat, existing.lng);
    if (distance > DUPLICATE_RADIUS_METERS) return false;

    // 2. Check category
    if (newIssue.category && existing.category && newIssue.category !== existing.category) {
      return false;
    }

    // 3. Check text similarity
    const similarity = stringSimilarity(newIssue.description.toLowerCase(), existing.description.toLowerCase());
    return similarity >= SIMILARITY_THRESHOLD;
  });
};

/**
 * Clusters issues that are duplicates
 */
export const clusterIssues = (issues) => {
  // This would be used to group existing issues (e.g. for Admin heatmaps)
  const clusters = [];
  const processed = new Set();

  issues.forEach(issue => {
    if (processed.has(issue.id)) return;
    
    const cluster = [issue];
    processed.add(issue.id);
    
    issues.forEach(other => {
      if (processed.has(other.id)) return;
      if (findDuplicate(issue, [other])) {
        cluster.push(other);
        processed.add(other.id);
      }
    });
    
    clusters.push(cluster);
  });

  return clusters;
};
