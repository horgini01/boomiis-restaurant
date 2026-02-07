import { describe, it, expect } from 'vitest';
import { containsSearchTerm, calculateRelevanceScore } from '../client/src/lib/searchHighlight';

describe('Search Highlight Utilities', () => {
  describe('containsSearchTerm', () => {
    it('should return true for exact match', () => {
      expect(containsSearchTerm('John Doe', 'John Doe')).toBe(true);
    });

    it('should return true for case-insensitive partial match', () => {
      expect(containsSearchTerm('John Doe', 'john')).toBe(true);
      expect(containsSearchTerm('John Doe', 'DOE')).toBe(true);
    });

    it('should return false when search term not found', () => {
      expect(containsSearchTerm('John Doe', 'Jane')).toBe(false);
    });

    it('should handle null/undefined text', () => {
      expect(containsSearchTerm(null, 'test')).toBe(false);
      expect(containsSearchTerm(undefined, 'test')).toBe(false);
    });

    it('should handle empty search term', () => {
      expect(containsSearchTerm('John Doe', '')).toBe(false);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should give highest score for exact userName match', () => {
      const log = { userName: 'admin', entityName: 'Test', ipAddress: '127.0.0.1' };
      const score = calculateRelevanceScore(log, 'admin');
      expect(score).toBeGreaterThan(90);
    });

    it('should give high score for exact entityName match', () => {
      const log = { userName: 'user', entityName: 'Order #123', ipAddress: '127.0.0.1' };
      const score = calculateRelevanceScore(log, 'Order #123');
      expect(score).toBeGreaterThan(70);
    });

    it('should give moderate score for partial userName match', () => {
      const log = { userName: 'admin-user', entityName: 'Test', ipAddress: '127.0.0.1' };
      const score = calculateRelevanceScore(log, 'admin');
      expect(score).toBeGreaterThan(40);
      expect(score).toBeLessThan(100);
    });

    it('should give score for IP address match', () => {
      const log = { userName: 'user', entityName: 'Test', ipAddress: '192.168.1.1' };
      const score = calculateRelevanceScore(log, '192.168');
      expect(score).toBeGreaterThan(0);
    });

    it('should give score for entityId match', () => {
      const log = { userName: 'user', entityName: 'Test', entityId: '12345', ipAddress: '127.0.0.1' };
      const exactScore = calculateRelevanceScore(log, '12345');
      const partialScore = calculateRelevanceScore(log, '123');
      expect(exactScore).toBeGreaterThan(partialScore);
      expect(exactScore).toBeGreaterThan(50);
    });

    it('should give low score for changes match', () => {
      const log = { 
        userName: 'user', 
        entityName: 'Test', 
        ipAddress: '127.0.0.1',
        changes: '{"status": "active"}' 
      };
      const score = calculateRelevanceScore(log, 'active');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(20);
    });

    it('should return 0 for no matches', () => {
      const log = { userName: 'user', entityName: 'Test', ipAddress: '127.0.0.1' };
      const score = calculateRelevanceScore(log, 'nomatch');
      expect(score).toBe(0);
    });

    it('should return 0 for empty search', () => {
      const log = { userName: 'user', entityName: 'Test', ipAddress: '127.0.0.1' };
      const score = calculateRelevanceScore(log, '');
      expect(score).toBe(0);
    });

    it('should accumulate scores for multiple matches', () => {
      const log = { 
        userName: 'admin', 
        entityName: 'admin-settings', 
        ipAddress: '127.0.0.1',
        changes: '{"admin": true}' 
      };
      const score = calculateRelevanceScore(log, 'admin');
      // Should have scores from userName (exact), entityName (partial), and changes
      expect(score).toBeGreaterThanOrEqual(150);
    });
  });
});
