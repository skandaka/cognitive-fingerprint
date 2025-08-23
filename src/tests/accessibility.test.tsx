import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import Dashboard from '../visualization/Dashboard';

describe('Accessibility (static SSR snapshot)', () => {
  it('renders dashboard with main landmark', () => {
    const html = renderToString(React.createElement(Dashboard as any));
    expect(html).toContain('role="main"');
  });
});
