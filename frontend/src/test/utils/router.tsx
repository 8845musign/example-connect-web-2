import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { RouteObject } from 'react-router';
import type { ReactElement } from 'react';

export interface RenderWithRouterOptions {
  route?: string;
  routes?: RouteObject[];
}

export const renderWithRouter = (
  ui: ReactElement,
  { route = '/', routes = [] }: RenderWithRouterOptions = {}
) => {
  const router = createMemoryRouter(routes, {
    initialEntries: [route],
  });
  
  return {
    ...render(<RouterProvider router={router} />),
    router,
  };
};

// Helper to create a simple route for testing
export const createTestRoute = (path: string, element: ReactElement): RouteObject => ({
  path,
  element,
});

// Mock navigation functions for testing
export const mockNavigate = vi.fn();
export const mockUseNavigate = () => mockNavigate;

// Mock for session storage
export class MockSessionStorage implements Storage {
  private store: Map<string, string> = new Map();
  
  get length() {
    return this.store.size;
  }
  
  clear(): void {
    this.store.clear();
  }
  
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  
  removeItem(key: string): void {
    this.store.delete(key);
  }
  
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}