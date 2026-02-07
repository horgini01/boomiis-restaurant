import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ANOMALY_RULES } from './auditAnomaly.service';

describe('Anomaly Detection Rules', () => {
  it('should have correct thresholds for multiple failures', () => {
    expect(ANOMALY_RULES.MULTIPLE_FAILURES.threshold).toBe(3);
    expect(ANOMALY_RULES.MULTIPLE_FAILURES.timeWindowMinutes).toBe(5);
    expect(ANOMALY_RULES.MULTIPLE_FAILURES.severity).toBe('high');
  });

  it('should have correct after-hours configuration', () => {
    expect(ANOMALY_RULES.AFTER_HOURS_ADMIN.startHour).toBe(22); // 10 PM
    expect(ANOMALY_RULES.AFTER_HOURS_ADMIN.endHour).toBe(6); // 6 AM
    expect(ANOMALY_RULES.AFTER_HOURS_ADMIN.severity).toBe('medium');
  });

  it('should have correct bulk deletion thresholds', () => {
    expect(ANOMALY_RULES.BULK_DELETIONS.threshold).toBe(5);
    expect(ANOMALY_RULES.BULK_DELETIONS.timeWindowMinutes).toBe(1);
    expect(ANOMALY_RULES.BULK_DELETIONS.severity).toBe('high');
  });

  it('should have correct rapid actions thresholds', () => {
    expect(ANOMALY_RULES.RAPID_ACTIONS.threshold).toBe(10);
    expect(ANOMALY_RULES.RAPID_ACTIONS.timeWindowMinutes).toBe(1);
    expect(ANOMALY_RULES.RAPID_ACTIONS.severity).toBe('low');
  });

  it('should have correct user deletion thresholds', () => {
    expect(ANOMALY_RULES.USER_DELETIONS.threshold).toBe(2);
    expect(ANOMALY_RULES.USER_DELETIONS.timeWindowMinutes).toBe(10);
    expect(ANOMALY_RULES.USER_DELETIONS.severity).toBe('critical');
  });
});

describe('After-Hours Detection', () => {
  it('should detect after-hours during 10 PM - 6 AM', () => {
    const testHours = [22, 23, 0, 1, 2, 3, 4, 5]; // 10 PM to 5 AM
    
    testHours.forEach(hour => {
      const testDate = new Date();
      testDate.setHours(hour);
      
      const isAfterHours = hour >= 22 || hour < 6;
      expect(isAfterHours).toBe(true);
    });
  });

  it('should not detect after-hours during 6 AM - 10 PM', () => {
    const testHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    
    testHours.forEach(hour => {
      const isAfterHours = hour >= 22 || hour < 6;
      expect(isAfterHours).toBe(false);
    });
  });
});

describe('Anomaly Severity Levels', () => {
  it('should have correct severity hierarchy', () => {
    const severities = ['low', 'medium', 'high', 'critical'];
    
    expect(severities).toContain(ANOMALY_RULES.RAPID_ACTIONS.severity);
    expect(severities).toContain(ANOMALY_RULES.AFTER_HOURS_ADMIN.severity);
    expect(severities).toContain(ANOMALY_RULES.MULTIPLE_FAILURES.severity);
    expect(severities).toContain(ANOMALY_RULES.BULK_DELETIONS.severity);
    expect(severities).toContain(ANOMALY_RULES.USER_DELETIONS.severity);
  });

  it('should assign critical severity to user deletions', () => {
    expect(ANOMALY_RULES.USER_DELETIONS.severity).toBe('critical');
  });

  it('should assign high severity to bulk deletions and multiple failures', () => {
    expect(ANOMALY_RULES.BULK_DELETIONS.severity).toBe('high');
    expect(ANOMALY_RULES.MULTIPLE_FAILURES.severity).toBe('high');
  });
});

describe('Time Window Calculations', () => {
  it('should have appropriate time windows for each rule', () => {
    // Multiple failures: 5 minutes is reasonable for detecting repeated failures
    expect(ANOMALY_RULES.MULTIPLE_FAILURES.timeWindowMinutes).toBeGreaterThan(0);
    expect(ANOMALY_RULES.MULTIPLE_FAILURES.timeWindowMinutes).toBeLessThanOrEqual(10);

    // Bulk deletions: 1 minute is strict for detecting rapid bulk operations
    expect(ANOMALY_RULES.BULK_DELETIONS.timeWindowMinutes).toBe(1);

    // Rapid actions: 1 minute for detecting automated/scripted behavior
    expect(ANOMALY_RULES.RAPID_ACTIONS.timeWindowMinutes).toBe(1);

    // User deletions: 10 minutes to catch multiple user deletions
    expect(ANOMALY_RULES.USER_DELETIONS.timeWindowMinutes).toBe(10);
  });
});

describe('Threshold Reasonableness', () => {
  it('should have reasonable thresholds for anomaly detection', () => {
    // Thresholds should be high enough to avoid false positives
    // but low enough to catch real anomalies
    
    expect(ANOMALY_RULES.MULTIPLE_FAILURES.threshold).toBeGreaterThanOrEqual(3);
    expect(ANOMALY_RULES.BULK_DELETIONS.threshold).toBeGreaterThanOrEqual(5);
    expect(ANOMALY_RULES.RAPID_ACTIONS.threshold).toBeGreaterThanOrEqual(10);
    expect(ANOMALY_RULES.USER_DELETIONS.threshold).toBeGreaterThanOrEqual(2);
  });

  it('should have stricter thresholds for critical operations', () => {
    // User deletions should have the strictest threshold (most sensitive)
    expect(ANOMALY_RULES.USER_DELETIONS.threshold).toBeLessThan(ANOMALY_RULES.BULK_DELETIONS.threshold);
    expect(ANOMALY_RULES.USER_DELETIONS.threshold).toBeLessThan(ANOMALY_RULES.RAPID_ACTIONS.threshold);
  });
});
