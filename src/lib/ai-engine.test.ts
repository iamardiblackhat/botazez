import { describe, expect, it, vi } from 'vitest';
import type Groq from 'groq-sdk';
import type { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeIntelligence, generateBriefing, GROQ_ANALYSIS_MODEL, type IntelligenceContext } from './ai-engine';
const context: IntelligenceContext = { earthquakes: [], news: [], threats: [], cyberAlerts: [], timestamp: '2026-10-26T00:00:00Z' };
describe('intelligence provider dispatch', () => {
  it('uses Groq chat for analysis and briefing with bounded output', async () => {
    const create = vi.fn().mockResolvedValue({ choices: [{ message: { content: 'Evidence-based answer' } }] });
    const client = { chat: { completions: { create } } } as unknown as Groq;
    expect(await analyzeIntelligence(client, context, 'Summarise the evidence')).toBe('Evidence-based answer');
    expect(await generateBriefing(client, context)).toBe('Evidence-based answer');
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0]).toMatchObject({ model: GROQ_ANALYSIS_MODEL, max_tokens: 1200 });
  });
  it('preserves Gemini generation for Gemini clients', async () => {
    const generateContent = vi.fn().mockResolvedValue({ response: { text: () => 'Gemini answer' } });
    const getGenerativeModel = vi.fn().mockReturnValue({ generateContent });
    expect(await analyzeIntelligence({ getGenerativeModel } as unknown as GoogleGenerativeAI, context, 'Explain')).toBe('Gemini answer');
    expect(generateContent).toHaveBeenCalledOnce();
  });
  it('reports an empty provider response', async () => {
    const client = { chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [] }) } } } as unknown as Groq;
    await expect(generateBriefing(client, context)).rejects.toThrow('empty response');
  });
});
