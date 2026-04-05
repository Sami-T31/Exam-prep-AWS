import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders with children text', () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders as a span element', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label').tagName).toBe('SPAN');
  });

  it('applies default variant styles', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge.className).toContain('bg-[var(--surface-muted)]');
    expect(badge.className).toContain('text-[var(--foreground)]');
  });

  it('applies easy variant with teal/green styles', () => {
    render(<Badge variant="easy">Easy</Badge>);
    const badge = screen.getByText('Easy');
    expect(badge.className).toContain('bg-[color-mix(in_srgb,var(--accent-color)_18%,white)]');
    expect(badge.className).toContain('text-[var(--accent-strong)]');
  });

  it('applies medium variant with amber/yellow styles', () => {
    render(<Badge variant="medium">Medium</Badge>);
    const badge = screen.getByText('Medium');
    expect(badge.className).toContain('bg-[color-mix(in_srgb,var(--accent-color)_24%,white)]');
    expect(badge.className).toContain('text-[var(--accent-strong)]');
  });

  it('applies hard variant with red styles', () => {
    render(<Badge variant="hard">Hard</Badge>);
    const badge = screen.getByText('Hard');
    expect(badge.className).toContain('bg-red-50');
    expect(badge.className).toContain('text-red-600');
  });

  it.each([
    ['success', 'bg-[color-mix(in_srgb,var(--accent-color)_18%,white)]'],
    ['warning', 'bg-[color-mix(in_srgb,var(--accent-color)_24%,white)]'],
    ['danger', 'bg-red-50'],
    ['info', 'bg-[color-mix(in_srgb,var(--surface-muted)_72%,white)]'],
  ] as const)('applies %s variant classes', (variant, expectedClass) => {
    render(<Badge variant={variant}>{variant}</Badge>);
    expect(screen.getByText(variant).className).toContain(expectedClass);
  });

  it('includes base styles (rounded, text-xs, font-medium)', () => {
    render(<Badge>Styled</Badge>);
    const badge = screen.getByText('Styled');
    expect(badge.className).toContain('rounded-lg');
    expect(badge.className).toContain('text-xs');
    expect(badge.className).toContain('font-medium');
  });

  it('merges custom className', () => {
    render(<Badge className="my-custom-class">Custom</Badge>);
    expect(screen.getByText('Custom')).toHaveClass('my-custom-class');
  });
});
