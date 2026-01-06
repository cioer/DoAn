import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar Component (Story 2.4)', () => {
  it('should render progress bar with 0% progress', () => {
    render(<ProgressBar progress={0} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('should render progress bar with 50% progress', () => {
    const { container } = render(<ProgressBar progress={50} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');

    // Check that the inner div has correct width
    const innerBar = container.querySelector('.bg-blue-600');
    expect(innerBar).toHaveStyle({ width: '50%' });
  });

  it('should render progress bar with 100% progress', () => {
    const { container } = render(<ProgressBar progress={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');

    const innerBar = container.querySelector('.bg-blue-600');
    expect(innerBar).toHaveStyle({ width: '100%' });
  });

  it('should clamp progress to minimum 0', () => {
    const { container } = render(<ProgressBar progress={-10} />);
    const innerBar = container.querySelector('.bg-blue-600');
    expect(innerBar).toHaveStyle({ width: '0%' });
  });

  it('should clamp progress to maximum 100', () => {
    const { container } = render(<ProgressBar progress={150} />);
    const innerBar = container.querySelector('.bg-blue-600');
    expect(innerBar).toHaveStyle({ width: '100%' });
  });
});
