import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { SetupRequired } from '../setup-required';

describe('SetupRequired component', () => {
  it('SetupRequired: displays updated instructions without assuming .env is missing', () => {
    render(<SetupRequired />);

    // key phrases from the new copy
    expect(screen.getByText(/backend isn't reachable or hasn't been configured/i)).toBeInTheDocument();
    expect(screen.getByText(/check that your api\/sharing urls are correct/i)).toBeInTheDocument();
    expect(screen.getByText(/it may already exist/i)).toBeInTheDocument();
  });
});
