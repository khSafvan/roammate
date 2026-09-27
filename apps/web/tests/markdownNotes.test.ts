import { describe, it, expect } from 'vitest';
import React from 'react';
import { parseMarkdownToElements } from '../src/components/MarkdownText';
import { ItineraryStop, StopCategory } from '../src/types/trip';

describe('MarkdownText parser & renderer', () => {
  it('renders null for undefined or empty text', () => {
    const resEmpty = parseMarkdownToElements('');
    const resUndefined = parseMarkdownToElements(undefined);
    expect(resEmpty).toBeNull();
    expect(resUndefined).toBeNull();
  });

  it('correctly constructs element tree for bold and italic text', () => {
    const element = parseMarkdownToElements('This is **bold** and *italic* note.');
    expect(element).not.toBeNull();
    expect(React.isValidElement(element)).toBe(true);
  });

  it('correctly structures unordered list lines', () => {
    const markdown = `- Pack sunscreen\n- Bring sunglasses\n- Drink water`;
    const element = parseMarkdownToElements(markdown);
    expect(element).not.toBeNull();
    expect(React.isValidElement(element)).toBe(true);
  });

  it('handles mixed content with code, link, and lists', () => {
    const markdown = `**Notice**: Code is \`DXB123\`\n[Visit Website](https://example.com)\n1. First step\n2. Second step`;
    const element = parseMarkdownToElements(markdown);
    expect(element).not.toBeNull();
  });
});

describe('ItineraryStop with note category and rich notes', () => {
  it('supports note as a valid StopCategory on ItineraryStop', () => {
    const noteStop: ItineraryStop = {
      id: 'stop_note_1',
      orderIndex: 2,
      title: 'Marina Dining Dress Code',
      subtitle: 'Dress Code & Tips',
      category: 'note',
      startTime: '07:30 PM',
      durationMinutes: 0,
      coordinates: { latitude: 25.1950, longitude: 55.2798 },
      address: 'Dubai Marina Walk',
      notes: '**Smart Casual**: No flip-flops allowed.\n- Men: collar shirt\n- Women: casual chic',
    };

    expect(noteStop.category).toBe('note');
    expect(noteStop.notes).toContain('**Smart Casual**');
    expect(noteStop.notes).toContain('- Men: collar shirt');
  });

  it('preserves existing location categories alongside note category', () => {
    const categories: StopCategory[] = ['flight', 'lodging', 'sight', 'dining', 'transit', 'note'];
    expect(categories.length).toBe(6);
    expect(categories).toContain('note');
  });
});
