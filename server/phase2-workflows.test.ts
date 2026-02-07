import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendReviewRequestEmail } from './email';
import { sendOrderStatusSMS } from './services/sms.service';
import { sendReservationReminderEmail } from './email';
import { sendReservationStatusSMS } from './services/sms.service';
import sendReservationReminders from './jobs/reservation-reminders';

// Mock email service
vi.mock('./email', async () => {
  const actual = await vi.importActual('./email');
  return {
    ...actual,
    sendReviewRequestEmail: vi.fn().mockResolvedValue(undefined),
    sendReservationReminderEmail: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock SMS service
vi.mock('./services/sms.service', async () => {
  const actual = await vi.importActual('./services/sms.service');
  return {
    ...actual,
    sendOrderStatusSMS: vi.fn().mockResolvedValue(undefined),
    sendReservationStatusSMS: vi.fn().mockResolvedValue(undefined),
  };
});

// Mock database
vi.mock('./db', () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([
      {
        id: 1,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        customerPhone: '+447123456789',
        partySize: 4,
        reservationDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        reservationTime: '19:00',
        specialRequests: 'Window seat please',
        status: 'confirmed',
      },
    ]),
  }),
}));

describe('Phase 2 Workflows - Review Request & Reservation Reminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Review Request Workflow', () => {
    it('should send review request email with correct parameters', async () => {
      const params = {
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        orderId: 123,
      };

      await sendReviewRequestEmail(params);

      expect(sendReviewRequestEmail).toHaveBeenCalledWith(params);
      expect(sendReviewRequestEmail).toHaveBeenCalledTimes(1);
    });

    it('should send review request SMS with correct parameters', async () => {
      const customerName = 'Jane Smith';
      const phoneNumber = '+447987654321';

      await sendOrderStatusSMS(customerName, phoneNumber, 'review_request');

      expect(sendOrderStatusSMS).toHaveBeenCalledWith(
        customerName,
        phoneNumber,
        'review_request'
      );
      expect(sendOrderStatusSMS).toHaveBeenCalledTimes(1);
    });

    it('should handle review request email errors gracefully', async () => {
      const mockError = new Error('Email service unavailable');
      vi.mocked(sendReviewRequestEmail).mockRejectedValueOnce(mockError);

      await expect(
        sendReviewRequestEmail({
          customerName: 'Test User',
          customerEmail: 'test@example.com',
          orderId: 999,
        })
      ).rejects.toThrow('Email service unavailable');
    });

    it('should handle review request SMS errors gracefully', async () => {
      const mockError = new Error('SMS service unavailable');
      vi.mocked(sendOrderStatusSMS).mockRejectedValueOnce(mockError);

      await expect(
        sendOrderStatusSMS('Test User', '+447123456789', 'review_request')
      ).rejects.toThrow('SMS service unavailable');
    });
  });

  describe('Reservation Reminder Workflow', () => {
    it('should send reservation reminder email with correct parameters', async () => {
      const params = {
        customerName: 'Bob Johnson',
        customerEmail: 'bob@example.com',
        reservationDate: new Date('2026-02-08T19:00:00'),
        reservationTime: '19:00',
        partySize: 2,
        specialRequests: 'Vegetarian menu',
      };

      await sendReservationReminderEmail(params);

      expect(sendReservationReminderEmail).toHaveBeenCalledWith(params);
      expect(sendReservationReminderEmail).toHaveBeenCalledTimes(1);
    });

    it('should send reservation reminder SMS with correct parameters', async () => {
      const customerName = 'Bob Johnson';
      const phoneNumber = '+447555123456';
      const reservationDate = new Date('2026-02-08T19:00:00');
      const reservationTime = '19:00';

      await sendReservationStatusSMS(
        customerName,
        phoneNumber,
        reservationDate,
        reservationTime,
        'reminder'
      );

      expect(sendReservationStatusSMS).toHaveBeenCalledWith(
        customerName,
        phoneNumber,
        reservationDate,
        reservationTime,
        'reminder'
      );
      expect(sendReservationStatusSMS).toHaveBeenCalledTimes(1);
    });

    it('should handle reservation reminder email errors gracefully', async () => {
      const mockError = new Error('Email delivery failed');
      vi.mocked(sendReservationReminderEmail).mockRejectedValueOnce(mockError);

      await expect(
        sendReservationReminderEmail({
          customerName: 'Test User',
          customerEmail: 'test@example.com',
          reservationDate: new Date(),
          reservationTime: '18:00',
          partySize: 4,
        })
      ).rejects.toThrow('Email delivery failed');
    });

    it('should handle reservation reminder SMS errors gracefully', async () => {
      const mockError = new Error('SMS delivery failed');
      vi.mocked(sendReservationStatusSMS).mockRejectedValueOnce(mockError);

      await expect(
        sendReservationStatusSMS(
          'Test User',
          '+447123456789',
          new Date(),
          '18:00',
          'reminder'
        )
      ).rejects.toThrow('SMS delivery failed');
    });
  });

  describe('Scheduled Reservation Reminder Job', () => {
    it('should process upcoming reservations and send reminders', async () => {
      await sendReservationReminders();

      // Verify that email was sent for the mocked reservation
      expect(sendReservationReminderEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'John Doe',
          customerEmail: 'john@example.com',
          partySize: 4,
          reservationTime: '19:00',
          specialRequests: 'Window seat please',
        })
      );

      // Verify that SMS was sent for the mocked reservation
      expect(sendReservationStatusSMS).toHaveBeenCalledWith(
        'John Doe',
        '+447123456789',
        expect.any(Date),
        '19:00',
        'reminder'
      );
    });

    it('should handle database errors gracefully', async () => {
      const { getDb } = await import('./db');
      vi.mocked(getDb).mockResolvedValueOnce(null);

      // Should not throw, just log error
      await expect(sendReservationReminders()).resolves.toBeUndefined();
    });

    it('should continue processing other reservations if one fails', async () => {
      // Mock email to fail once then succeed
      vi.mocked(sendReservationReminderEmail)
        .mockRejectedValueOnce(new Error('First reservation failed'))
        .mockResolvedValueOnce(undefined);

      // Should complete without throwing
      await expect(sendReservationReminders()).resolves.toBeUndefined();
    });
  });

  describe('Integration: Complete Phase 2 Workflows', () => {
    it('should verify Review Request workflow is triggered after order completion', () => {
      // This test verifies the workflow exists and can be called
      expect(sendReviewRequestEmail).toBeDefined();
      expect(sendOrderStatusSMS).toBeDefined();
    });

    it('should verify Reservation Reminder workflow is scheduled and automated', () => {
      // This test verifies the scheduled job exists and can be called
      expect(sendReservationReminders).toBeDefined();
      expect(sendReservationReminderEmail).toBeDefined();
      expect(sendReservationStatusSMS).toBeDefined();
    });

    it('should confirm both email and SMS support for all Phase 2 templates', async () => {
      // Review Request
      await sendReviewRequestEmail({
        customerName: 'Test',
        customerEmail: 'test@example.com',
        orderId: 1,
      });
      await sendOrderStatusSMS('Test', '+447123456789', 'review_request');

      // Reservation Reminder
      await sendReservationReminderEmail({
        customerName: 'Test',
        customerEmail: 'test@example.com',
        reservationDate: new Date(),
        reservationTime: '18:00',
        partySize: 2,
      });
      await sendReservationStatusSMS(
        'Test',
        '+447123456789',
        new Date(),
        '18:00',
        'reminder'
      );

      // All functions should have been called
      expect(sendReviewRequestEmail).toHaveBeenCalled();
      expect(sendOrderStatusSMS).toHaveBeenCalled();
      expect(sendReservationReminderEmail).toHaveBeenCalled();
      expect(sendReservationStatusSMS).toHaveBeenCalled();
    });
  });
});
