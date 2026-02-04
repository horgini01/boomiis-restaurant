import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import { db } from './db';
import * as schema from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('About and Legal Pages', () => {
  const caller = appRouter.createCaller({
    db,
    user: null,
    req: {} as any,
    res: {} as any,
  });

  describe('About Page Content', () => {
    it('should fetch about page content', async () => {
      const content = await caller.about.content();
      expect(Array.isArray(content)).toBe(true);
      
      // Check if hero content exists
      const heroTitle = content.find(c => c.sectionKey === 'hero_title');
      expect(heroTitle).toBeDefined();
      expect(heroTitle?.sectionValue).toBeTruthy();
    });

    it('should fetch values', async () => {
      const values = await caller.about.values();
      expect(Array.isArray(values)).toBe(true);
      expect(values.length).toBeGreaterThan(0);
      
      // Check structure
      if (values.length > 0) {
        const value = values[0];
        expect(value).toHaveProperty('title');
        expect(value).toHaveProperty('description');
        expect(value).toHaveProperty('icon');
        expect(value).toHaveProperty('isActive');
      }
    });

    it('should fetch team members', async () => {
      const team = await caller.about.team();
      expect(Array.isArray(team)).toBe(true);
      expect(team.length).toBeGreaterThan(0);
      
      // Check structure
      if (team.length > 0) {
        const member = team[0];
        expect(member).toHaveProperty('name');
        expect(member).toHaveProperty('title');
        expect(member).toHaveProperty('bio');
        expect(member).toHaveProperty('isActive');
      }
    });

    it('should fetch awards', async () => {
      const awards = await caller.about.awards();
      expect(Array.isArray(awards)).toBe(true);
      expect(awards.length).toBeGreaterThan(0);
      
      // Check structure
      if (awards.length > 0) {
        const award = awards[0];
        expect(award).toHaveProperty('title');
        expect(award).toHaveProperty('description');
        expect(award).toHaveProperty('isActive');
      }
    });

    it('should only return active values', async () => {
      const values = await caller.about.values();
      const allActive = values.every(v => v.isActive === true);
      expect(allActive).toBe(true);
    });

    it('should return items sorted by display order', async () => {
      const values = await caller.about.values();
      if (values.length > 1) {
        for (let i = 1; i < values.length; i++) {
          expect(values[i].displayOrder).toBeGreaterThanOrEqual(values[i - 1].displayOrder);
        }
      }
    });
  });

  describe('Legal Pages', () => {
    it('should fetch privacy policy', async () => {
      const page = await caller.legal.getByType({ pageType: 'privacy-policy' });
      expect(page).toBeDefined();
      expect(page?.pageType).toBe('privacy-policy');
      expect(page?.title).toBeTruthy();
      expect(page?.content).toBeTruthy();
    });

    it('should fetch terms and conditions', async () => {
      const page = await caller.legal.getByType({ pageType: 'terms-conditions' });
      expect(page).toBeDefined();
      expect(page?.pageType).toBe('terms-conditions');
      expect(page?.title).toBeTruthy();
      expect(page?.content).toBeTruthy();
    });

    it('should fetch accessibility statement', async () => {
      const page = await caller.legal.getByType({ pageType: 'accessibility' });
      expect(page).toBeDefined();
      expect(page?.pageType).toBe('accessibility');
      expect(page?.title).toBeTruthy();
      expect(page?.content).toBeTruthy();
    });

    it('should only return published legal pages', async () => {
      const page = await caller.legal.getByType({ pageType: 'privacy-policy' });
      if (page) {
        expect(page.isPublished).toBe(true);
      }
    });

    it('should return null for non-existent page type', async () => {
      const page = await caller.legal.getByType({ pageType: 'non-existent' as any });
      expect(page).toBeNull();
    });
  });

  describe('Admin About Management', () => {
    // Create mock admin context
    const adminCaller = appRouter.createCaller({
      db,
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin', openId: 'test' },
      req: {} as any,
      res: {} as any,
    });

    it('should fetch all content for admin', async () => {
      const content = await adminCaller.adminAbout.getAllContent();
      expect(Array.isArray(content)).toBe(true);
    });

    it('should fetch all values for admin', async () => {
      const values = await adminCaller.adminAbout.getAllValues();
      expect(Array.isArray(values)).toBe(true);
    });

    it('should fetch all team members for admin', async () => {
      const team = await adminCaller.adminAbout.getAllTeam();
      expect(Array.isArray(team)).toBe(true);
    });

    it('should fetch all awards for admin', async () => {
      const awards = await adminCaller.adminAbout.getAllAwards();
      expect(Array.isArray(awards)).toBe(true);
    });

    it('should update about content', async () => {
      const testValue = `Test value ${Date.now()}`;
      await adminCaller.adminAbout.updateContent({
        sectionKey: 'test_key',
        sectionValue: testValue,
      });

      const content = await adminCaller.adminAbout.getAllContent();
      const updated = content.find(c => c.sectionKey === 'test_key');
      expect(updated?.sectionValue).toBe(testValue);

      // Note: Test data will remain in database but won't affect other tests
    });
  });

  describe('Admin Legal Management', () => {
    const adminCaller = appRouter.createCaller({
      db,
      user: { id: 1, email: 'admin@test.com', name: 'Admin', role: 'admin', openId: 'test' },
      req: {} as any,
      res: {} as any,
    });

    it('should fetch all legal pages for admin', async () => {
      const pages = await adminCaller.adminLegal.getAll();
      expect(Array.isArray(pages)).toBe(true);
      expect(pages.length).toBeGreaterThanOrEqual(3); // At least 3 legal pages
    });

    it('should update legal page content', async () => {
      const testContent = `Test content ${Date.now()}`;
      await adminCaller.adminLegal.update({
        pageType: 'privacy-policy',
        title: 'Test Privacy Policy',
        content: testContent,
        isPublished: true,
      });

      const page = await caller.legal.getByType({ pageType: 'privacy-policy' });
      expect(page?.content).toBe(testContent);
    });
  });

  describe('Authorization', () => {
    const publicCaller = appRouter.createCaller({
      db,
      user: null,
      req: {} as any,
      res: {} as any,
    });

    it('should allow public access to about content', async () => {
      await expect(publicCaller.about.content()).resolves.toBeDefined();
    });

    it('should allow public access to legal pages', async () => {
      await expect(
        publicCaller.legal.getByType({ pageType: 'privacy-policy' })
      ).resolves.toBeDefined();
    });

    it('should deny public access to admin about endpoints', async () => {
      await expect(publicCaller.adminAbout.getAllContent()).rejects.toThrow();
    });

    it('should deny public access to admin legal endpoints', async () => {
      await expect(publicCaller.adminLegal.getAll()).rejects.toThrow();
    });
  });
});
