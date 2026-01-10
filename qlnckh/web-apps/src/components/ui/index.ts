/**
 * UI Components - Design System
 *
 * Consistent, reusable UI components built with:
 * - Tailwind CSS v4 for styling
 * - class-variance-authority for variants
 * - Full TypeScript support
 * - Accessibility-first approach
 */

// Button & Inputs
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';

export { Select } from './Select';
export type { SelectProps, SelectOption } from './Select';

// Layout
export { Card, CardHeader, CardBody, CardFooter } from './Card';
export type { CardProps, CardHeaderProps } from './Card';

export { Dialog, DialogHeader, DialogBody, DialogFooter } from './Dialog';
export type { DialogProps, DialogHeaderProps } from './Dialog';

// Feedback
export { Alert, AlertActions } from './Alert';
export type { AlertProps } from './Alert';

export { Badge, StatusBadge } from './Badge';
export type { BadgeProps, StatusBadgeProps } from './Badge';

// Form Controls
export { Checkbox, IndeterminateIcon } from './Checkbox';
export type { CheckboxProps } from './Checkbox';

export { Label, FormField } from './Label';
export type { LabelProps, FormFieldProps } from './Label';
