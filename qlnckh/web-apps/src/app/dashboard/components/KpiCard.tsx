import { ReactNode } from 'react';
import {
  gradients,
  shadows,
  colors,
  transitions,
  animations,
  iconContainers,
  cx,
} from '../../../lib/design-tokens';
import type { KpiCardColor } from '../types';

/**
 * KPI Card Props
 */
export interface KpiCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  color: KpiCardColor;
  onClick?: () => void;
  gradient?: boolean;
}

/**
 * Gradient color classes for cards
 */
const gradientColors: Record<KpiCardColor, string> = {
  blue: gradients.cardBlue,
  yellow: gradients.cardAmber,
  red: gradients.cardRed,
  green: gradients.cardEmerald,
  purple: gradients.cardPurple,
  emerald: gradients.cardEmerald,
  amber: gradients.cardAmber,
  teal: gradients.cardTeal,
  slate: gradients.cardSlate,
};

/**
 * Background color classes for non-gradient cards
 */
const bgColors: Record<KpiCardColor, string> = {
  blue: 'bg-blue-50 text-blue-900',
  yellow: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  green: 'bg-emerald-50 text-emerald-600',
  purple: 'bg-purple-50 text-purple-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  teal: 'bg-teal-50 text-teal-600',
  slate: 'bg-slate-100 text-slate-700',
};

/**
 * Hover border color classes
 */
const borderColors: Record<KpiCardColor, string> = {
  blue: 'hover:border-blue-300 hover:shadow-blue-100',
  yellow: 'hover:border-amber-300 hover:shadow-amber-100',
  red: 'hover:border-red-300 hover:shadow-red-100',
  green: 'hover:border-emerald-300 hover:shadow-emerald-100',
  purple: 'hover:border-purple-300 hover:shadow-purple-100',
  emerald: 'hover:border-emerald-300 hover:shadow-emerald-100',
  amber: 'hover:border-amber-300 hover:shadow-amber-100',
  teal: 'hover:border-teal-300 hover:shadow-teal-100',
  slate: 'hover:border-slate-300 hover:shadow-slate-100',
};

// Shared styles
const gradientCardBase = cx(
  'rounded-lg p-6 relative overflow-hidden group',
  shadows.lg,
  transitions.slow,
  colors.textWhite
);

const gradientCardInteractive = cx(
  gradientCardBase,
  'w-full text-left cursor-pointer',
  animations.hoverScale,
  shadows.hoverXl
);

const decorativeCircle =
  'absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500';

const iconContainer = cx(iconContainers.xl, 'bg-white/20 mb-4');

const flatCardBase = cx(
  'bg-white rounded-lg p-5',
  shadows.md
);

const flatCardInteractive = cx(
  flatCardBase,
  'border-2 border-transparent cursor-pointer w-full text-left group',
  transitions.slow,
  shadows.hover
);

/**
 * KPI Card Component - Login Page Style (Blue-900 + Slate)
 *
 * Displays a KPI metric with icon, title, and value.
 * Supports gradient and flat styles, with optional click handler.
 */
export function KpiCard({
  title,
  value,
  icon,
  color,
  onClick,
  gradient = false,
}: KpiCardProps) {
  // Gradient style with click handler
  if (gradient && onClick) {
    return (
      <button
        onClick={onClick}
        className={cx(gradientCardInteractive, gradientColors[color])}
      >
        <div className={decorativeCircle} />
        <div className="relative">
          <div className={iconContainer}>{icon}</div>
          <p className={cx(colors.textWhiteMuted, 'text-sm font-medium mb-1')}>
            {title}
          </p>
          <p className="text-4xl font-bold">{value}</p>
        </div>
      </button>
    );
  }

  // Gradient style without click handler
  if (gradient) {
    return (
      <div className={cx(gradientCardBase, gradientColors[color])}>
        <div className={decorativeCircle} />
        <div className="relative">
          <div className={iconContainer}>{icon}</div>
          <p className={cx(colors.textWhiteMuted, 'text-sm font-medium mb-1')}>
            {title}
          </p>
          <p className="text-4xl font-bold">{value}</p>
        </div>
      </div>
    );
  }

  // Flat style with click handler
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cx(flatCardInteractive, borderColors[color])}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              {title}
            </p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <div
            className={cx(iconContainers.xl, bgColors[color], shadows.sm)}
          >
            {icon}
          </div>
        </div>
      </button>
    );
  }

  // Flat style without click handler
  return (
    <div className={flatCardBase}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={cx(iconContainers.xl, bgColors[color], shadows.sm)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
