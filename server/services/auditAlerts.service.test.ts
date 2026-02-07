import { describe, it, expect } from 'vitest';
import { isCriticalAction, CRITICAL_ACTIONS } from './auditAlerts.service';

describe('Audit Alerts Service', () => {
  describe('isCriticalAction', () => {
    it('should identify user deletions as critical', () => {
      expect(isCriticalAction('delete', 'user')).toBe(true);
    });

    it('should identify bulk updates as critical', () => {
      expect(isCriticalAction('bulk_update', 'menu_item')).toBe(true);
      expect(isCriticalAction('bulk_update', 'order')).toBe(true);
    });

    it('should identify settings modifications as critical', () => {
      expect(isCriticalAction('update', 'settings')).toBe(true);
      expect(isCriticalAction('create', 'settings')).toBe(true);
      expect(isCriticalAction('update', 'restaurant_settings')).toBe(true);
    });

    it('should identify role changes as critical', () => {
      expect(isCriticalAction('role_change', 'user')).toBe(true);
      expect(isCriticalAction('update', 'user')).toBe(true);
    });

    it('should identify delivery zone changes as critical', () => {
      expect(isCriticalAction('create', 'delivery_zone')).toBe(true);
      expect(isCriticalAction('update', 'delivery_zone')).toBe(true);
      expect(isCriticalAction('delete', 'delivery_zone')).toBe(true);
    });

    it('should identify template changes as critical', () => {
      expect(isCriticalAction('update', 'email_template')).toBe(true);
      expect(isCriticalAction('update', 'sms_template')).toBe(true);
    });

    it('should not identify regular menu item operations as critical', () => {
      expect(isCriticalAction('create', 'menu_item')).toBe(false);
      expect(isCriticalAction('update', 'menu_item')).toBe(false);
      expect(isCriticalAction('delete', 'menu_item')).toBe(false);
    });

    it('should not identify order status changes as critical', () => {
      expect(isCriticalAction('status_change', 'order')).toBe(false);
      expect(isCriticalAction('update', 'order')).toBe(false);
    });

    it('should not identify reservation operations as critical', () => {
      expect(isCriticalAction('create', 'reservation')).toBe(false);
      expect(isCriticalAction('update', 'reservation')).toBe(false);
      expect(isCriticalAction('delete', 'reservation')).toBe(false);
    });
  });

  describe('CRITICAL_ACTIONS constants', () => {
    it('should define all critical action types', () => {
      expect(CRITICAL_ACTIONS.USER_DELETION).toBe('user_deletion');
      expect(CRITICAL_ACTIONS.BULK_PRICE_UPDATE).toBe('bulk_price_update');
      expect(CRITICAL_ACTIONS.SETTINGS_MODIFICATION).toBe('settings_modification');
      expect(CRITICAL_ACTIONS.ROLE_CHANGE).toBe('role_change');
      expect(CRITICAL_ACTIONS.DELIVERY_ZONE_CHANGE).toBe('delivery_zone_change');
      expect(CRITICAL_ACTIONS.EMAIL_TEMPLATE_CHANGE).toBe('email_template_change');
      expect(CRITICAL_ACTIONS.SMS_TEMPLATE_CHANGE).toBe('sms_template_change');
    });
  });
});
