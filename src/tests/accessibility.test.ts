import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Dashboard from '../visualization/Dashboard';

// Basic SSR render presence check (dynamic client-only analytics excluded)

describe('Accessibility (static SSR snapshot)', () => {
  it('renders dashboard with main landmark', () => {
    const html = renderToString(React.createElement(Dashboard));
    expect(html).toContain('role="main"');
  });
});
