import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App.jsx';


// Mock AuthContext for Vitest
import { vi } from 'vitest';
vi.mock('./auth/AuthContext.jsx', async () => {
  const actual = await vi.importActual('./auth/AuthContext.jsx');
  return {
    ...actual,
    useAuth: () => ({ user: null, loading: false, login: vi.fn(), logout: vi.fn() })
  };
});

import { AuthProvider } from './auth/AuthContext.jsx';
import { MemoryRouter } from 'react-router-dom';

describe('App', () => {
  it('renders without crashing', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </AuthProvider>
    );
    // Očekujemo da postoji LoadingSkeleton po testid-u
    const skeleton = screen.getByTestId('loading-skeleton');
    expect(skeleton).toBeDefined();
  });
});
