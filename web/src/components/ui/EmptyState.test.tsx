import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No results" />);
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('renders title as an h3 element', () => {
    render(<EmptyState title="Heading" />);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Heading');
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Try adjusting your filters." />);
    expect(screen.getByText('Try adjusting your filters.')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector('p')).not.toBeInTheDocument();
  });

  it('renders action button when provided', () => {
    render(
      <EmptyState
        title="No items"
        action={<button>Add item</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument();
  });

  it('does not render action wrapper when action is not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const divs = container.querySelectorAll('div');
    const hasActionWrapper = Array.from(divs).some(
      (div) => div.className.includes('mt-5'),
    );
    expect(hasActionWrapper).toBe(false);
  });

  it('renders icon when provided', () => {
    render(
      <EmptyState
        title="No data"
        icon={<svg data-testid="empty-icon" />}
      />,
    );
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
  });

  it('does not render icon wrapper when icon is not provided', () => {
    const { container } = render(<EmptyState title="Empty" />);
    const hasIconWrapper = Array.from(container.querySelectorAll('div')).some(
      (div) => div.className.includes('mb-5'),
    );
    expect(hasIconWrapper).toBe(false);
  });

  it('renders all props together', () => {
    render(
      <EmptyState
        title="Nothing here"
        description="Check back later"
        icon={<svg data-testid="icon" />}
        action={<button>Refresh</button>}
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.getByText('Check back later')).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeInTheDocument();
  });
});
