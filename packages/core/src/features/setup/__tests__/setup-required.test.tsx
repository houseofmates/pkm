import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { SetupRequired } from '../../../components/setup-required';

describe('SetupRequired component', () => {
  it('SetupRequired: displays updated instructions without assuming .env is missing', () => {
    // render to HTML string so we can simple substring search without DOM
    const html = renderToStaticMarkup(<SetupRequired />);

    // text will be HTML-escaped, so just look for the prefix
    expect(html).toMatch(/backend isn/i);
    expect(html).toMatch(/check that your api\/sharing urls are correct/i);
    expect(html).toMatch(/it may already exist/i);
  });
});
