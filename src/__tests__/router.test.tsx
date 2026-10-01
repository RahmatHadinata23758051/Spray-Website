import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { App } from '../presentation/App';

function LocationTracker({ onLocation }: { onLocation: (pathname: string) => void }) {
  const location = useLocation();
  onLocation(location.pathname);
  return null;
}

describe('Phase C - React Router Infrastructure & Navigation Bridge', () => {
  it('1. Root route ("/") redirects to /login', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('Sign in to Spraybot')).toBeInTheDocument();
  });

  it('2. /dashboard renders Dashboard page', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('3. /products renders Products page', () => {
    render(
      <MemoryRouter initialEntries={['/products']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument();
    expect(screen.getByText('Product Master Data')).toBeInTheDocument();
  });

  it('4. /reports renders Reports page', () => {
    render(
      <MemoryRouter initialEntries={['/reports']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Reports', level: 1 })).toBeInTheDocument();
  });

  it('5. /calibration renders Calibration page', () => {
    render(
      <MemoryRouter initialEntries={['/calibration']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Calibration', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText('Mock calibration').length).toBeGreaterThan(0);
  });

  it('6. /users renders Users page', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Users', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText('Nadia Putri').length).toBeGreaterThan(0);
  });

  it('7. /settings renders Settings page', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Local Workstation Environment')).toBeInTheDocument();
  });

  it('8. Legacy /new-test route redirects to /batches/new', () => {
    let currentPath = '';
    render(
      <MemoryRouter initialEntries={['/new-test']}>
        <LocationTracker onLocation={(p) => { currentPath = p; }} />
        <App />
      </MemoryRouter>
    );
    expect(currentPath).toBe('/batches/new');
    expect(screen.getByRole('heading', { name: 'New Batch' })).toBeInTheDocument();
  });

  it('9. Legacy /capture route still works', () => {
    render(
      <MemoryRouter initialEntries={['/capture']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Capture' })).toBeInTheDocument();
    expect(screen.getByText('Side Camera')).toBeInTheDocument();
  });

  it('10. Legacy /analysis route works with current in-app context', () => {
    render(
      <MemoryRouter initialEntries={['/analysis']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Analysis' })).toBeInTheDocument();
    expect(screen.getByText('Capture timeline')).toBeInTheDocument();
  });

  it('11. Legacy /result route renders with safe unfinalized state when missing report', () => {
    render(
      <MemoryRouter initialEntries={['/result']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Result' })).toBeInTheDocument();
    expect(screen.getByText('Final analysis required')).toBeInTheDocument();
  });

  it('12. Unknown route renders 404 Not Found Page deterministically', () => {
    render(
      <MemoryRouter initialEntries={['/nonexistent-route']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
    expect(screen.getByText('The requested URL route does not exist.')).toBeInTheDocument();
  });

  it('13. Sidebar navigation triggers route update via setPage legacy bridge', async () => {
    let currentPath = '';
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <LocationTracker onLocation={(p) => { currentPath = p; }} />
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(currentPath).toBe('/dashboard');

    const productsBtn = screen.getByRole('button', { name: 'Products' });
    await user.click(productsBtn);

    expect(currentPath).toBe('/products');
    expect(screen.getByRole('heading', { name: 'Products' })).toBeInTheDocument();
  });

  it('14. Legacy /history route redirects to /batches', () => {
    let currentPath = '';
    render(
      <MemoryRouter initialEntries={['/history']}>
        <LocationTracker onLocation={(p) => { currentPath = p; }} />
        <App />
      </MemoryRouter>
    );
    expect(currentPath).toBe('/batches');
    expect(screen.getAllByRole('heading', { name: 'Batches' }).length).toBeGreaterThan(0);
  });
});
