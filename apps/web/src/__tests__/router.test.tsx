import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { App } from '../App';

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
    expect(screen.getByText('Masuk ke Spraybot')).toBeInTheDocument();
  });

  it('2. /camera-test renders the isolated dual-camera PoC without the application shell', () => {
    render(
      <MemoryRouter initialEntries={['/camera-test']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Uji Dual Kamera' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Aktifkan Kamera/ })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Navigasi Utama' })).not.toBeInTheDocument();
  });

  it('3. /dashboard renders Dashboard page', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );
    expect(await screen.findByRole('heading', { name: 'Dasbor' })).toBeInTheDocument();
  });

  it('4. /products renders Products page', () => {
    render(
      <MemoryRouter initialEntries={['/products']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Produk' })).toBeInTheDocument();
    expect(screen.getByText('Product Master Data')).toBeInTheDocument();
  });

  it('5. /reports renders Reports page', () => {
    render(
      <MemoryRouter initialEntries={['/reports']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Laporan', level: 1 })).toBeInTheDocument();
  });

  it('6. /calibration renders Calibration page', () => {
    render(
      <MemoryRouter initialEntries={['/calibration']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Kalibrasi', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText('Terkalibrasi').length).toBeGreaterThan(0);
  });

  it('7. /users renders Users page', () => {
    render(
      <MemoryRouter initialEntries={['/users']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Pengguna', level: 1 })).toBeInTheDocument();
    expect(screen.getAllByText('Nadia Putri').length).toBeGreaterThan(0);
  });

  it('8. /settings renders Settings page', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: 'Pengaturan', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Lingkungan Workstation Lokal')).toBeInTheDocument();
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
    expect(screen.getAllByRole('heading', { name: 'Batch Baru' }).length).toBeGreaterThan(0);
  });

  it('9. Legacy /capture route redirects to /batches', () => {
    let currentPath = '';
    render(
      <MemoryRouter initialEntries={['/capture']}>
        <LocationTracker onLocation={(p) => { currentPath = p; }} />
        <App />
      </MemoryRouter>
    );
    expect(currentPath).toBe('/batches');
  });

  it('10. Legacy /analysis route redirects to /batches', () => {
    let currentPath = '';
    render(
      <MemoryRouter initialEntries={['/analysis']}>
        <LocationTracker onLocation={(p) => { currentPath = p; }} />
        <App />
      </MemoryRouter>
    );
    expect(currentPath).toBe('/batches');
  });

  it('11. Legacy /result route redirects to /batches', () => {
    let currentPath = '';
    render(
      <MemoryRouter initialEntries={['/result']}>
        <LocationTracker onLocation={(p) => { currentPath = p; }} />
        <App />
      </MemoryRouter>
    );
    expect(currentPath).toBe('/batches');
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

  it('13. Sidebar navigation triggers route update via native routing', async () => {
    let currentPath = '';
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <LocationTracker onLocation={(p) => { currentPath = p; }} />
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Dasbor' })).toBeInTheDocument();
    expect(currentPath).toBe('/dashboard');

    const productsBtn = screen.getByRole('button', { name: 'Produk' });
    await user.click(productsBtn);

    expect(currentPath).toBe('/products');
    expect(screen.getByRole('heading', { name: 'Produk' })).toBeInTheDocument();
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
    expect(screen.getAllByRole('heading', { name: 'Batch' }).length).toBeGreaterThan(0);
  });
});
