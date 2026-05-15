import { describe, it, expect } from 'vitest';
import { parseResponse } from '../../src/parser/response-parser.js';

describe('parseResponse', () => {
  it('parses clarifying questions with suggestions and need-more status', () => {
    const raw = `### QUESTION
Who is the website for?
### SUGGESTIONS
Potential clients
Friends and family
My employer
### QUESTION
What style do you want?
### SUGGESTIONS
Minimal
Bold and colorful
### STATUS
need-more`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('questions');
    if (result.kind === 'questions') {
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]!.question).toBe('Who is the website for?');
      expect(result.questions[0]!.suggestions).toEqual([
        'Potential clients',
        'Friends and family',
        'My employer',
      ]);
      expect(result.status).toBe('need-more');
    }
  });

  it('parses a ready status with no questions', () => {
    const result = parseResponse(`### STATUS\nready`);
    expect(result.kind).toBe('questions');
    if (result.kind === 'questions') {
      expect(result.questions).toHaveLength(0);
      expect(result.status).toBe('ready');
    }
  });

  it('parses 5 options', () => {
    const raw = `### OPTION 1
First option text
### OPTION 2
Second option text
### OPTION 3
Third option text
### OPTION 4
Fourth option text
### OPTION 5
Fifth option text [___]`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('options');
    if (result.kind === 'options') {
      expect(result.options).toHaveLength(5);
      expect(result.options[0]).toBe('First option text');
      expect(result.options[4]).toContain('[___]');
    }
  });

  it('returns kind "unknown" when no recognizable markers are present', () => {
    expect(parseResponse('Just some normal prose.').kind).toBe('unknown');
  });

  it('tolerates extra prose around the markers', () => {
    const raw = `Sure! Here you go:

### OPTION 1
A
### OPTION 2
B
### OPTION 3
C
### OPTION 4
D
### OPTION 5
E

Let me know if you want changes.`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('options');
    if (result.kind === 'options') {
      expect(result.options).toHaveLength(5);
      expect(result.options[0]).toBe('A');
      expect(result.options[4]).toBe('E');
    }
  });

  it('parses PLAIN (no "#") question/suggestions/status markers', () => {
    const raw = `QUESTION
Who is the website for?
SUGGESTIONS
Potential clients
Friends and family
STATUS
need-more`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('questions');
    if (result.kind === 'questions') {
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]!.question).toBe('Who is the website for?');
      expect(result.questions[0]!.suggestions).toEqual([
        'Potential clients',
        'Friends and family',
      ]);
      expect(result.status).toBe('need-more');
    }
  });

  it('parses PLAIN (no "#") OPTION markers', () => {
    const raw = `OPTION 1
First option text
OPTION 2
Second option text
OPTION 3
Third option text
OPTION 4
Fourth option text
OPTION 5
Fifth option text [___]`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('options');
    if (result.kind === 'options') {
      expect(result.options).toHaveLength(5);
      expect(result.options[0]).toBe('First option text');
      expect(result.options[4]).toContain('[___]');
    }
  });

  it('parses inline marker+content lines (Claude format)', () => {
    const raw = `QUESTION What is the website for?
SUGGESTIONS
Personal portfolio
Landing page
QUESTION What tech approach do you want?
SUGGESTIONS
Vanilla HTML
React
STATUS need-more`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('questions');
    if (result.kind === 'questions') {
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0]!.question).toBe('What is the website for?');
      expect(result.questions[0]!.suggestions).toEqual(['Personal portfolio', 'Landing page']);
      expect(result.questions[1]!.question).toBe('What tech approach do you want?');
      expect(result.status).toBe('need-more');
    }
  });

  it('parses STATUS with inline value', () => {
    const result = parseResponse('STATUS ready');
    expect(result.kind).toBe('questions');
    if (result.kind === 'questions') {
      expect(result.status).toBe('ready');
    }
  });

  it('parses OPTION n with inline text on the same line', () => {
    const raw = `OPTION 1 Build a minimal portfolio site for a wedding photographer with [___] sections
OPTION 2 Build a developer showcase with project cards and a contact form
OPTION 3 Build a landing page for a SaaS product with a hero, features, and pricing
OPTION 4 Build a blog with markdown posts and tag filtering
OPTION 5 Build a single-page artifact with embedded interactive demos for [___]`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('options');
    if (result.kind === 'options') {
      expect(result.options).toHaveLength(5);
      expect(result.options[0]).toContain('wedding photographer');
      expect(result.options[4]).toContain('[___]');
    }
  });

  it('handles multi-line option bodies', () => {
    const raw = `### OPTION 1
line one
line two
### OPTION 2
B
### OPTION 3
C
### OPTION 4
D
### OPTION 5
E`;
    const result = parseResponse(raw);
    expect(result.kind).toBe('options');
    if (result.kind === 'options') {
      expect(result.options[0]).toBe('line one\nline two');
    }
  });
});
