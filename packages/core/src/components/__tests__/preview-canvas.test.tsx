import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PreviewCanvas, { Widget } from '../preview-canvas';

// smoke test to ensure typing works and component renders without crashing
describe('PreviewCanvas', () => {
  it('renders basic layout', () => {
    const columns: Widget[][] = [
      [{ id: '1', title: 'A' }],
      [{ id: '2', title: 'B' }],
    ];

    const { container } = render(
      <PreviewCanvas
        columns={columns}
        renderWidget={(w) => <div>{w.title}</div>}
      />
    );

    expect(container).toBeTruthy();
    // should contain widget titles
    expect(container.textContent).toContain('A');
    expect(container.textContent).toContain('B');
  });
});
