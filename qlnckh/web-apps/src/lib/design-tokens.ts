/**
 * Design Tokens
 *
 * Centralized design tokens for consistent styling across the application.
 * Use these tokens instead of hardcoding Tailwind classes.
 *
 * @example
 * import { gradients, shadows, colors } from '@/lib/design-tokens';
 * <div className={gradients.primary}>...</div>
 */

// =============================================================================
// GRADIENTS
// =============================================================================

/**
 * Gradient backgrounds for various UI elements
 */
export const gradients = {
  // Primary gradients
  primary: 'bg-gradient-to-r from-primary-600 to-primary-500',
  primaryHover: 'bg-gradient-to-r from-primary-700 to-primary-600',
  primaryBr: 'bg-gradient-to-br from-primary-500 to-indigo-600',

  // Surface/Page gradients
  surface: 'bg-gradient-to-br from-slate-50 via-white to-blue-50',
  surfaceAlt: 'bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20',

  // Card gradients
  cardBlue: 'bg-gradient-to-br from-blue-900 to-blue-800',
  cardSlate: 'bg-gradient-to-br from-slate-700 to-slate-800',
  cardAmber: 'bg-gradient-to-br from-amber-500 to-amber-600',
  cardAmberDark: 'bg-gradient-to-br from-amber-600 to-amber-700',
  cardRed: 'bg-gradient-to-br from-red-500 to-red-600',
  cardEmerald: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
  cardPurple: 'bg-gradient-to-br from-purple-500 to-purple-600',
  cardIndigo: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
  cardTeal: 'bg-gradient-to-br from-teal-500 to-teal-600',

  // Header gradients (for tables, sections)
  headerBlue: 'bg-gradient-to-r from-blue-900 to-blue-800',
  headerRed: 'bg-gradient-to-r from-red-600 to-red-700',
  headerEmerald: 'bg-gradient-to-r from-emerald-600 to-emerald-700',
  headerAmber: 'bg-gradient-to-r from-amber-500 to-amber-600',

  // Sidebar nav item gradients
  navBlue: 'bg-gradient-to-r from-blue-500 to-blue-600',
  navEmerald: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
  navIndigo: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
  navPurple: 'bg-gradient-to-r from-purple-500 to-purple-600',
  navOrange: 'bg-gradient-to-r from-orange-500 to-orange-600',
  navHover: 'hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100',

  // User section gradient
  userSection: 'bg-gradient-to-r from-gray-50 to-blue-50',
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

/**
 * Shadow styles for depth and elevation
 */
export const shadows = {
  // Soft shadows (custom)
  soft: 'shadow-soft',
  softMd: 'shadow-soft-md',
  softLg: 'shadow-soft-lg',
  softXl: 'shadow-soft-xl',

  // Standard shadows
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',

  // Interactive shadows
  hover: 'hover:shadow-lg',
  hoverXl: 'hover:shadow-xl',
  hoverSoft: 'hover:shadow-soft-lg',
} as const;

// =============================================================================
// COLORS (Semantic)
// =============================================================================

/**
 * Semantic color classes for consistent theming
 */
export const colors = {
  // Text colors
  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-600',
  textMuted: 'text-gray-500',
  textDisabled: 'text-gray-400',
  textWhite: 'text-white',
  textWhiteMuted: 'text-white/80',

  // Background colors
  bgWhite: 'bg-white',
  bgWhiteTranslucent: 'bg-white/90',
  bgWhiteGlass: 'bg-white/95',
  bgGray: 'bg-gray-50',
  bgGrayLight: 'bg-gray-100',

  // Border colors
  borderLight: 'border-gray-200',
  borderLighter: 'border-gray-100',
  borderTranslucent: 'border-gray-200/50',

  // State colors - backgrounds
  bgSuccess: 'bg-emerald-100',
  bgWarning: 'bg-amber-100',
  bgError: 'bg-red-100',
  bgInfo: 'bg-blue-100',

  // State colors - text
  textSuccess: 'text-emerald-800',
  textWarning: 'text-amber-800',
  textError: 'text-red-800',
  textInfo: 'text-blue-800',

  // State colors - borders
  borderSuccess: 'border-emerald-200',
  borderWarning: 'border-amber-200',
  borderError: 'border-red-200',
  borderInfo: 'border-blue-200',
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

/**
 * Border radius tokens
 */
export const radius = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
  full: 'rounded-full',
} as const;

// =============================================================================
// TRANSITIONS
// =============================================================================

/**
 * Transition/animation tokens
 */
export const transitions = {
  fast: 'transition-all duration-150',
  normal: 'transition-all duration-200',
  slow: 'transition-all duration-300',
  slower: 'transition-all duration-500',

  // Specific transitions
  colors: 'transition-colors duration-200',
  transform: 'transition-transform duration-200',
  opacity: 'transition-opacity duration-200',

  // Ease functions
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
} as const;

// =============================================================================
// SPACING
// =============================================================================

/**
 * Common spacing patterns
 */
export const spacing = {
  // Page padding
  pagePx: 'px-4 sm:px-6 lg:px-8',
  pagePy: 'py-8',
  page: 'px-4 sm:px-6 lg:px-8 py-8',

  // Section spacing
  sectionGap: 'mb-8',
  sectionGapSm: 'mb-6',
  sectionGapLg: 'mb-12',

  // Card padding
  cardPadding: 'p-6',
  cardPaddingSm: 'p-4',
  cardPaddingLg: 'p-8',

  // Form spacing
  formGap: 'space-y-4',
  formGapSm: 'space-y-2',
  formGapLg: 'space-y-6',
} as const;

// =============================================================================
// LAYOUT
// =============================================================================

/**
 * Common layout patterns
 */
export const layout = {
  // Max widths
  maxWidth: 'max-w-7xl mx-auto',
  maxWidthSm: 'max-w-md mx-auto',
  maxWidthMd: 'max-w-lg mx-auto',
  maxWidthLg: 'max-w-4xl mx-auto',

  // Flex patterns
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  flexStart: 'flex items-center justify-start',
  flexEnd: 'flex items-center justify-end',
  flexCol: 'flex flex-col',

  // Grid patterns
  grid2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  grid3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
} as const;

// =============================================================================
// COMPONENT PATTERNS
// =============================================================================

/**
 * Common component style patterns
 */
export const components = {
  // Cards
  card: 'bg-white rounded-2xl shadow-lg',
  cardHover: 'bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow',
  cardGlass: 'bg-white/95 backdrop-blur-md rounded-2xl shadow-soft-lg',

  // Buttons
  btnBase:
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30',
  btnPrimary:
    'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5',
  btnSecondary:
    'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm',
  btnGhost: 'bg-transparent text-gray-600 hover:bg-gray-100',
  btnDanger: 'bg-error-500 text-white hover:bg-error-600',

  // Inputs
  input:
    'block w-full rounded-lg border border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-primary-600 focus:ring-2 focus:ring-primary-100 transition-all',

  // Badges
  badgeBase: 'px-3 py-1 text-xs font-semibold rounded-full border',
  badgeSuccess: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  badgeWarning: 'bg-amber-100 text-amber-800 border-amber-200',
  badgeError: 'bg-red-100 text-red-800 border-red-200',
  badgeInfo: 'bg-blue-100 text-blue-800 border-blue-200',
  badgeNeutral: 'bg-gray-100 text-gray-800 border-gray-200',

  // Tables
  tableHeader: 'bg-gray-50',
  tableHeaderCell:
    'px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider',
  tableCell: 'px-6 py-4 whitespace-nowrap text-sm',
  tableRowHover: 'hover:bg-gray-50 cursor-pointer transition-colors',

  // Sidebar
  sidebarBase:
    'fixed left-0 top-0 h-full bg-white/90 backdrop-blur-xl border-r border-gray-200/50 shadow-soft-xl z-50 transition-all duration-300 flex flex-col',

  // Dialog/Modal
  dialogBackdrop: 'fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[9999]',
  dialogContent:
    'bg-white/95 backdrop-blur-md rounded-2xl shadow-soft-lg w-full relative',
} as const;

// =============================================================================
// ICON CONTAINERS
// =============================================================================

/**
 * Icon container styles
 */
export const iconContainers = {
  // Square containers
  sm: 'w-6 h-6 rounded-lg flex items-center justify-center',
  md: 'w-8 h-8 rounded-lg flex items-center justify-center',
  lg: 'w-10 h-10 rounded-lg flex items-center justify-center',
  xl: 'w-12 h-12 rounded-lg flex items-center justify-center',
  '2xl': 'w-16 h-16 rounded-lg flex items-center justify-center',

  // Circle containers
  circleSm: 'w-6 h-6 rounded-full flex items-center justify-center',
  circleMd: 'w-8 h-8 rounded-full flex items-center justify-center',
  circleLg: 'w-10 h-10 rounded-full flex items-center justify-center',
  circleXl: 'w-12 h-12 rounded-full flex items-center justify-center',
  circle2xl: 'w-16 h-16 rounded-full flex items-center justify-center',
  circle3xl: 'w-20 h-20 rounded-full flex items-center justify-center',
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

/**
 * Z-index scale for layering
 */
export const zIndex = {
  dropdown: 'z-dropdown', // 1000
  sticky: 'z-sticky', // 1020
  fixed: 'z-fixed', // 1030
  modalBackdrop: 'z-modalBackdrop', // 1040
  modal: 'z-modal', // 1050
  popover: 'z-popover', // 1060
  tooltip: 'z-tooltip', // 1070
} as const;

// =============================================================================
// ANIMATION CLASSES
// =============================================================================

/**
 * Animation utility classes
 */
export const animations = {
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  fadeIn: 'animate-in fade-in-0',
  fadeOut: 'animate-out fade-out-0',
  slideIn: 'animate-in slide-in-from-bottom-4',
  zoomIn: 'animate-in zoom-in-95',
  hoverLift: 'hover:-translate-y-0.5',
  hoverScale: 'hover:scale-[1.02]',
  activeScale: 'active:scale-95',
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Combine multiple token classes
 */
export function cx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Create a gradient card style based on color
 */
export function getGradientCard(
  color: 'blue' | 'slate' | 'amber' | 'red' | 'emerald' | 'purple' | 'indigo' | 'teal'
): string {
  const gradientMap = {
    blue: gradients.cardBlue,
    slate: gradients.cardSlate,
    amber: gradients.cardAmber,
    red: gradients.cardRed,
    emerald: gradients.cardEmerald,
    purple: gradients.cardPurple,
    indigo: gradients.cardIndigo,
    teal: gradients.cardTeal,
  };
  return gradientMap[color];
}

/**
 * Create a badge style based on variant
 */
export function getBadgeStyle(
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'
): string {
  const variantMap = {
    success: components.badgeSuccess,
    warning: components.badgeWarning,
    error: components.badgeError,
    info: components.badgeInfo,
    neutral: components.badgeNeutral,
  };
  return `${components.badgeBase} ${variantMap[variant]}`;
}
