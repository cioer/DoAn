import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar Component (Story 2.4)', () => {
  it('should render progress bar with 0% progress', () => {
    render(<ProgressBar progress={0} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeDefined();
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('should render progress bar with 50% progress', () => {
    render(<ProgressBar progress={50} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('50');

    // Check that the progress bar has correct width via style attribute
    expect(bar.getAttribute('style')).toContain('50%');
  });

  it('should render progress bar with 100% progress', () => {
    render(<ProgressBar progress={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('100');

    expect(bar.getAttribute('style')).toContain('100%');
  });

  it('should clamp progress to minimum 0', () => {
    render(<ProgressBar progress={-10} />);
    const bar = screen.getByRole('progressbar');
    // Math.max(0, -10) = 0, so width should be 0%
    expect(bar.getAttribute('style')).toContain('0%');
  });

  it('should clamp progress to maximum 100', () => {
    render(<ProgressBar progress={150} />);
    const bar = screen.getByRole('progressbar');
    // Math.min(100, 150) = 100, so width should be 100%
    expect(bar.getAttribute('style')).toContain('100%');
  });

  it('should have correct CSS classes', () => {
    render(<ProgressBar progress={50} />);
    const bar = screen.getByRole('progressbar');

    // Check for className attribute - component uses gradient from-primary-500
    expect(bar.getAttribute('class')).toContain('from-primary-500');
    expect(bar.getAttribute('class')).toContain('h-2');
    expect(bar.getAttribute('class')).toContain('rounded-full');
  });
});
