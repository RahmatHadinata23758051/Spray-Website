import { afterEach } from 'vitest';

// Global cleanup to prevent test pollution from navigation interceptors
afterEach(() => {
  if (typeof window !== 'undefined') {
    delete window.__spraybot_on_nav_attempt;
    delete window.__spraybot_navigation_blocker;
  }
});