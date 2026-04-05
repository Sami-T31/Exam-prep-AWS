import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct width percentage', () => {
    const { container } = render(<ProgressBar value={75} />);
    const bar = container.querySelector('[style]') as HTMLElement;
    expect(bar.style.width).toBe('75%');
  });

  it('handles 0% value', () => {
    const { container } = render(<ProgressBar value={0} />);
    const bar = container.querySelector('[style]') as HTMLElement;
    expect(bar.style.width).toBe('0%');
  });

  it('handles 100% value', () => {
    const { container } = render(<ProgressBar value={100} />);
    const bar = container.querySelector('[style]') as HTMLElement;
    expect(bar.style.width).toBe('100%');
  });

  it('clamps values above 100 to 100%', () => {
    const { container } = render(<ProgressBar value={150} />);
    const bar = container.querySelector('[style]') as HTMLElement;
    expect(bar.style.width).toBe('100%');
  });

  it('clamps negative values to 0%', () => {
    const { container } = render(<ProgressBar value={-10} />);
    const bar = container.querySelector('[style]') as HTMLElement;
    expect(bar.style.width).toBe('0%');
  });

  it('calculates percentage relative to custom max', () => {
    const { container } = render(<ProgressBar value={25} max={50} />);
    const bar = container.querySelector('[style]') as HTMLElement;
    expect(bar.style.width).toBe('50%');
  });

  it('applies default accent color', () => {
    const { container } = render(<ProgressBar value={50} />);
    const bar = container.querySelector('[style]') as HTMLElement;
    expect(bar.className).toContain('bg-[var(--accent-color)]');
  });

  it.each([
    ['teal', 'bg-[var(--accent-color)]'],
    ['rose', 'bg-[var(--accent-color)]'],
    ['amber', 'bg-[var(--accent-color)]'],
  ] as const)('applies %s color variant', (color, expectedClass) => {
    const { container } = render(<ProgressBar value={50} color={color} />);
    const bar = container.querySelector('[style]') as HTMLElement;
    expect(bar.className).toContain(expectedClass);
  });

  it('applies size variants', () => {
    const { container, rerender } = render(<ProgressBar value={50} size="sm" />);
    const getTrack = () => container.querySelector('.overflow-hidden') as HTMLElement;

    expect(getTrack().className).toContain('h-1');

    rerender(<ProgressBar value={50} size="lg" />);
    expect(getTrack().className).toContain('h-2.5');
  });

  it('shows label when showLabel is true', () => {
    render(<ProgressBar value={75} showLabel />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('does not show label by default', () => {
    const { container } = render(<ProgressBar value={75} />);
    expect(container.textContent).toBe('');
  });

  it('rounds percentage in label display', () => {
    render(<ProgressBar value={33} max={100} showLabel />);
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('merges custom className on wrapper', () => {
    const { container } = render(<ProgressBar value={50} className="mt-4" />);
    expect(container.firstChild).toHaveClass('mt-4');
  });
});
