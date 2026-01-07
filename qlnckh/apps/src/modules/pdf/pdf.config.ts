/**
 * PDF Configuration
 *
 * Shared Playwright configuration for all PDF generation services.
 * Ensures consistent PDF output across all export types.
 *
 * Epic 7 Story 7.1: Document Export Completion (Refinement)
 */

/**
 * PDF Options interface
 * Based on Playwright's PDFOptions type
 */
export interface PdfOptions {
  format?: 'A4' | 'Letter';
  margin?: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
  };
  printBackground?: boolean;
  preferCssPageSize?: boolean;
  displayHeaderFooter?: boolean;
}

/**
 * Default viewport for PDF generation
 * Wider viewport ensures proper layout rendering
 */
export const PDF_VIEWPORT = {
  width: 1200,
  height: 800,
};

/**
 * Default PDF generation options
 * Ensures consistent output format across all exports
 */
export const DEFAULT_PDF_OPTIONS: PdfOptions = {
  format: 'A4' as const,
  printBackground: true,
  margin: {
    top: '20px',
    bottom: '20px',
    left: '20px',
    right: '20px',
  },
  preferCssPageSize: false,
  displayHeaderFooter: false,
};

/**
 * PDF Generation timeout (SLA: 30 seconds)
 * Matches Epic 6 SLA requirements
 */
export const PDF_TIMEOUT_MS = 30000;

/**
 * Wait until condition for page load
 * 'networkidle' ensures all resources are loaded before PDF generation
 */
export const PDF_WAIT_UNTIL: 'networkidle' = 'networkidle';

/**
 * Font configuration for Vietnamese language support
 */
export const FONT_CONFIG = {
  /**
   * Primary font family with Vietnamese support
   * Uses Google Fonts with display-swap for performance
   */
  fontFamily: "'Roboto', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",

  /**
   * Available font weights
   */
  weights: [400, 500, 600, 700] as const,

  /**
   * Google Fonts URL for Vietnamese support
   */
  googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap',

  /**
   * Fallback fonts in case Google Fonts fails to load
   */
  fallbackFonts: 'Arial, "Liberation Sans", "Noto Sans", sans-serif',
};

/**
 * Complete PDF configuration object
 */
export const PDF_CONFIG = {
  viewport: PDF_VIEWPORT,
  pdfOptions: DEFAULT_PDF_OPTIONS,
  timeout: PDF_TIMEOUT_MS,
  waitUntil: PDF_WAIT_UNTIL,
  fonts: FONT_CONFIG,
} as const;

/**
 * Page break CSS classes
 * Used for controlling page breaks in PDF exports
 */
export const PAGE_BREAK_CSS = {
  /**
   * Avoid breaking after this element
   */
  breakAfter: '.page-break-after { break-after: avoid; }',

  /**
   * Avoid breaking before this element
   */
  breakBefore: '.page-break-before { break-before: avoid; }',

  /**
   * Avoid breaking inside this element
   */
  noBreak: '.no-break { break-inside: avoid; }',

  /**
   * Force page break before this element
   */
  forceBreakBefore: '.page-break-before-force { page-break-before: always; }',

  /**
   * Force page break after this element
   */
  forceBreakAfter: '.page-break-after-force { page-break-after: always; }',

  /**
   * Table header repeat
   */
  tableHeader: 'thead { display: table-header-group; }',

  /**
   * Orphan and widow control
   */
  orphanWidow: 'p, li, td, th { orphans: 3; widows: 3; }',
} as const;

/**
 * Dark mode handling CSS
 * Forces light theme for PDF generation regardless of UI theme
 */
export const DARK_MODE_CSS = `
  @media print {
    :root {
      --background: #ffffff !important;
      --foreground: #000000 !important;
      --primary: #000000 !important;
      --secondary: #666666 !important;
      --accent: #0066cc !important;
      --muted: #999999 !important;
      --border: #cccccc !important;
    }

    /* Override dark mode styles */
    .dark,
    [data-theme="dark"],
    [data-mode="dark"] {
      color-scheme: light !important;
      background: #ffffff !important;
      color: #000000 !important;
    }

    /* Force light backgrounds */
    .dark body,
    .dark .container,
    .dark .card,
    .dark .section {
      background: #ffffff !important;
      color: #000000 !important;
    }

    /* Force light text colors */
    .dark h1,
    .dark h2,
    .dark h3,
    .dark h4,
    .dark h5,
    .dark h6,
    .dark p,
    .dark span,
    .dark div,
    .dark td,
    .dark th {
      color: #000000 !important;
    }
  }
`;

/**
 * Combine all CSS utilities for PDF generation
 */
export const PDF_CSS_UTILITIES = `
  ${PAGE_BREAK_CSS.breakAfter}
  ${PAGE_BREAK_CSS.breakBefore}
  ${PAGE_BREAK_CSS.noBreak}
  ${PAGE_BREAK_CSS.forceBreakBefore}
  ${PAGE_BREAK_CSS.forceBreakAfter}
  ${PAGE_BREAK_CSS.tableHeader}
  ${PAGE_BREAK_CSS.orphanWidow}
  ${DARK_MODE_CSS}
`;
