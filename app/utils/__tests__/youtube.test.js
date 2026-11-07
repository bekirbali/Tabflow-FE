import { describe, it, expect } from 'vitest';
import { getYouTubeId, generateMockDuration, getRecommendations, RECOMMENDED_CATALOG } from '../youtube';

describe('YouTube Utils: getYouTubeId', () => {
  it('should extract video ID from standard watch URL', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from watch URL with extra query params', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120s&feature=shared')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from short URL (youtu.be)', () => {
    expect(getYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(getYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=20')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from YouTube Shorts', () => {
    expect(getYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should extract video ID from embed URL', () => {
    expect(getYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('should return null for non-YouTube URLs', () => {
    expect(getYouTubeId('https://github.com/facebook/react')).toBeNull();
    expect(getYouTubeId('https://example.com')).toBeNull();
  });

  it('should return null for empty, null, or undefined values', () => {
    expect(getYouTubeId('')).toBeNull();
    expect(getYouTubeId(null)).toBeNull();
    expect(getYouTubeId(undefined)).toBeNull();
  });
});

describe('YouTube Utils: generateMockDuration', () => {
  it('should return duration format mm:ss', () => {
    const duration = generateMockDuration();
    expect(duration).toMatch(/^\d+:\d{2}$/);
  });
});

describe('YouTube Utils: getRecommendations', () => {
  it('should return an array and not crash with empty user links', () => {
    const recs = getRecommendations([]);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeLessThanOrEqual(6);
  });

  it('should not recommend videos already present in user links', () => {
    // If user already saved a video
    const existingUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const userLinks = [
      { url: existingUrl, is_clean: false, liked: true }
    ];
    const recs = getRecommendations(userLinks);
    expect(recs.some(r => r.url === existingUrl)).toBe(false);
  });
});

