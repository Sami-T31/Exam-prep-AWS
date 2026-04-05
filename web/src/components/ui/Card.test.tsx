import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>Card content</p></Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="my-card">Content</Card>);
    expect(screen.getByText('Content').closest('[data-ui-card="true"]')).toHaveClass('my-card');
  });

  it('applies default medium padding', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.firstChild).toHaveClass('p-5');
  });

  it.each([
    ['none', ''],
    ['sm', 'p-4'],
    ['md', 'p-5'],
    ['lg', 'p-6'],
  ] as const)('applies %s padding', (padding, expectedClass) => {
    const { container } = render(<Card padding={padding}>Content</Card>);
    if (expectedClass) {
      expect(container.firstChild).toHaveClass(expectedClass);
    } else {
      expect((container.firstChild as HTMLElement).className).not.toMatch(/\bp-\d/);
    }
  });

  it('applies hover styles when hoverable is true', () => {
    const { container } = render(<Card hoverable>Content</Card>);
    expect((container.firstChild as HTMLElement).className).toContain('hover:shadow-[');
  });

  it('does not apply hover styles by default', () => {
    const { container } = render(<Card>Content</Card>);
    expect((container.firstChild as HTMLElement).className).not.toContain('hover:shadow-[');
  });

  it('includes base styles and card data attribute', () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('rounded-3xl');
    expect(card.className).toContain('overflow-hidden');
    expect(card).toHaveAttribute('data-ui-card', 'true');
  });

  it('passes through HTML attributes', () => {
    const { container } = render(<Card data-testid="my-card" id="card-1">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveAttribute('id', 'card-1');
    expect(card).toHaveAttribute('data-testid', 'my-card');
  });
});
