import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-[var(--accent-color)]');
    expect(button.className).toContain('text-white');
  });

  it.each([
    ['secondary', 'bg-[var(--foreground)]'],
    ['outline', 'border-[var(--border-color)]'],
    ['ghost', 'text-[var(--foreground)]'],
    ['danger', 'bg-red-600'],
  ] as const)('applies %s variant classes', (variant, expectedClass) => {
    render(<Button variant={variant}>{variant}</Button>);
    expect(screen.getByRole('button').className).toContain(expectedClass);
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    const button = screen.getByRole('button');
    const spinner = button.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('does not show spinner when isLoading is false', () => {
    render(<Button>Not loading</Button>);
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).not.toBeInTheDocument();
  });

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('fires onClick handler when clicked', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(<Button disabled onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button').className).toContain('h-8');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button').className).toContain('h-12');
  });

  it('merges custom className', () => {
    render(<Button className="custom-class">Styled</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('forwards ref to the button element', () => {
    const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
