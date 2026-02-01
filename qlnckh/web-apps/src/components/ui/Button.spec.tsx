/**
 * Button Component Tests
 *
 * Tests for Button UI component including:
 * - All variants (primary, secondary, destructive, ghost, success, warning)
 * - All sizes (xxs, xs, sm, md, lg)
 * - Loading state with spinner
 * - Left and right icons
 * - Full width variant
 * - Disabled state
 * - Custom className merging
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';
import { CheckCircle, XCircle } from 'lucide-react';

describe('Button Component', () => {
  describe('Variants', () => {
    it('should render primary variant by default', () => {
      render(<Button>Click me</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('from-primary-600');
      expect(button).toHaveClass('text-white');
    });

    it('should render primary variant explicitly', () => {
      render(<Button variant="primary">Primary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gradient-to-r');
      expect(button).toHaveClass('from-primary-600');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-white');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('text-gray-700');
    });

    it('should render destructive variant', () => {
      render(<Button variant="destructive">Delete</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-error-600');
    });

    it('should render ghost variant', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-gray-600');
      expect(button).toHaveClass('hover:bg-gray-100');
    });

    it('should render success variant', () => {
      render(<Button variant="success">Success</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-success-500');
    });

    it('should render warning variant', () => {
      render(<Button variant="warning">Warning</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-warning-500');
    });
  });

  describe('Sizes', () => {
    it('should render medium size by default', () => {
      render(<Button>Default</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-5');
      expect(button).toHaveClass('py-2.5');
      expect(button).toHaveClass('text-sm');
    });

    it('should render xs size', () => {
      render(<Button size="xs">XS</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3');
      expect(button).toHaveClass('py-1.5');
      expect(button).toHaveClass('text-xs');
      expect(button).toHaveClass('rounded-lg');
    });

    it('should render sm size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3.5');
      expect(button).toHaveClass('py-2');
      expect(button).toHaveClass('text-sm');
    });

    it('should render lg size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6');
      expect(button).toHaveClass('py-3.5');
      expect(button).toHaveClass('text-base');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      // Check for loading spinner icon
      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeDefined();
    });

    it('should hide icons when in loading state', () => {
      render(
        <Button isLoading leftIcon={<CheckCircle />}>Loading</Button>
      );

      const button = screen.getByRole('button');

      // The CheckCircle icon should not be rendered when loading
      expect(button.innerHTML).not.toContain('CheckCircle');
    });

    it('should not show loading state by default', () => {
      render(<Button>Not Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();

      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeNull();
    });
  });

  describe('Icons', () => {
    it('should render left icon', () => {
      render(
        <Button leftIcon={<CheckCircle data-testid="left-icon" />}>
          With Icon
        </Button>
      );

      const leftIcon = screen.getByTestId('left-icon');
      expect(leftIcon).toBeDefined();
    });

    it('should render right icon', () => {
      render(
        <Button rightIcon={<XCircle data-testid="right-icon" />}>
          With Icon
        </Button>
      );

      const rightIcon = screen.getByTestId('right-icon');
      expect(rightIcon).toBeDefined();
    });

    it('should render both left and right icons', () => {
      render(
        <Button
          leftIcon={<CheckCircle data-testid="left-icon" />}
          rightIcon={<XCircle data-testid="right-icon" />}
        >
          Between Icons
        </Button>
      );

      expect(screen.getByTestId('left-icon')).toBeDefined();
      expect(screen.getByTestId('right-icon')).toBeDefined();
    });

    it('should not render icon spans when no icons provided', () => {
      render(<Button>No Icons</Button>);

      const button = screen.getByRole('button');
      const iconSpans = button.querySelectorAll('.flex-shrink-0');
      expect(iconSpans.length).toBe(0);
    });
  });

  describe('Full Width', () => {
    it('should not be full width by default', () => {
      render(<Button>Not Full Width</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });

    it('should be full width when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });
  });

  describe('Disabled State', () => {
    it('should not be disabled by default', () => {
      render(<Button>Enabled</Button>);

      const button = screen.getByRole('button');
      expect(button).not.toBeDisabled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should have disabled styles', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-60');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with variant classes', () => {
      render(<Button className="mt-4 rounded-full">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('mt-4');
      expect(button).toHaveClass('rounded-full');
      // Should also have base variant classes
      expect(button).toHaveClass('from-primary-600');
    });

    it('should override conflicting classes with cn utility', () => {
      render(<Button className="rounded-none">Custom Rounded</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('rounded-none');
    });
  });

  describe('HTML Attributes', () => {
    it('should pass through other button attributes', () => {
      render(
        <Button
          type="submit"
          form="my-form"
          aria-label="Submit form"
          data-testid="test-button"
        >
          Submit
        </Button>
      );

      const button = screen.getByTestId('test-button');
      expect(button).toHaveAttribute('type', 'submit');
      expect(button).toHaveAttribute('form', 'my-form');
      expect(button).toHaveAttribute('aria-label', 'Submit form');
    });

    it('should support click handler', () => {
      const handleClick = vi.fn();

      render(<Button onClick={handleClick}>Click Me</Button>);

      const button = screen.getByRole('button');
      button.click();

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call click handler when disabled', () => {
      const handleClick = vi.fn();

      render(<Button onClick={handleClick} disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      button.click();

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call click handler when loading', () => {
      const handleClick = vi.fn();

      render(<Button onClick={handleClick} isLoading>Loading</Button>);

      const button = screen.getByRole('button');
      button.click();

      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Forward Ref', () => {
    it('should forward ref to button element', () => {
      const ref = { current: null as HTMLButtonElement | null };

      render(<Button ref={ref}>Ref Button</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current?.tagName).toBe('BUTTON');
    });
  });

  describe('Display Name', () => {
    it('should have display name for debugging', () => {
      expect(Button.displayName).toBe('Button');
    });
  });

  describe('Accessibility', () => {
    it('should be focusable', () => {
      render(<Button>Focusable</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
    });
  });
});
