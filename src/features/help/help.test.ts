import { describe, it, expect } from 'vitest'
import { HELP_TOPICS, WORKFLOW_STAGES, SHOPKEEPER_FAQS } from './helpData'

describe('Help & Madad Feature Data', () => {
  it('should have comprehensive topics covering all primary panels', () => {
    const topicIds = HELP_TOPICS.map((t) => t.id)
    expect(topicIds).toContain('sales')
    expect(topicIds).toContain('new-sale')
    expect(topicIds).toContain('purchases')
    expect(topicIds).toContain('inventory')
    expect(topicIds).toContain('customers')
    expect(topicIds).toContain('suppliers')
    expect(topicIds).toContain('customer-payments')
    expect(topicIds).toContain('supplier-payments')
    expect(topicIds).toContain('returns')
    expect(topicIds).toContain('expenses')
    expect(topicIds).toContain('reports')
    expect(topicIds).toContain('dashboard')
    expect(topicIds).toContain('users')
    expect(topicIds).toContain('settings')
    expect(topicIds).toContain('khata-import')
  })

  it('should have complete bilingual (English & Urdu) content for every topic', () => {
    HELP_TOPICS.forEach((topic) => {
      expect(topic.titleEn.trim().length).toBeGreaterThan(0)
      expect(topic.titleUr.trim().length).toBeGreaterThan(0)
      expect(topic.overviewEn.trim().length).toBeGreaterThan(0)
      expect(topic.overviewUr.trim().length).toBeGreaterThan(0)
      expect(topic.steps.length).toBeGreaterThan(0)

      topic.steps.forEach((step) => {
        expect(step.titleEn.trim().length).toBeGreaterThan(0)
        expect(step.titleUr.trim().length).toBeGreaterThan(0)
        expect(step.descriptionEn.trim().length).toBeGreaterThan(0)
        expect(step.descriptionUr.trim().length).toBeGreaterThan(0)
      })

      expect(topic.behindTheScenesEn.length).toBeGreaterThan(0)
      expect(topic.behindTheScenesUr.length).toBeGreaterThan(0)
    })
  })

  it('should have complete 7-stage workflow pipeline for wholesale store lifecycle', () => {
    expect(WORKFLOW_STAGES.length).toBe(7)
    WORKFLOW_STAGES.forEach((stage) => {
      expect(stage.titleEn.trim().length).toBeGreaterThan(0)
      expect(stage.titleUr.trim().length).toBeGreaterThan(0)
      expect(stage.whatShopkeeperDoesEn.trim().length).toBeGreaterThan(0)
      expect(stage.whatShopkeeperDoesUr.trim().length).toBeGreaterThan(0)
      expect(stage.howSystemHandlesItEn.trim().length).toBeGreaterThan(0)
      expect(stage.howSystemHandlesItUr.trim().length).toBeGreaterThan(0)
      expect(stage.relatedRoute.startsWith('/')).toBe(true)
    })
  })

  it('should have practical shopkeeper FAQs in both English and Urdu', () => {
    expect(SHOPKEEPER_FAQS.length).toBeGreaterThanOrEqual(5)
    SHOPKEEPER_FAQS.forEach((faq) => {
      expect(faq.questionEn.trim().length).toBeGreaterThan(0)
      expect(faq.questionUr.trim().length).toBeGreaterThan(0)
      expect(faq.answerEn.trim().length).toBeGreaterThan(0)
      expect(faq.answerUr.trim().length).toBeGreaterThan(0)
    })
  })
})
