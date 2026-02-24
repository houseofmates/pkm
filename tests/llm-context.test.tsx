import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// we only need the provider itself for this test

describe('LLMContextProvider', () => {
  it('renders children even when AuthProvider is missing', () => {
    // dynamically import to ensure we get the latest code after module reloads
    // use dynamic import just like root-layout tests so the path alias works
    const llmModule = await import('@/contexts/llm-context');
    const { LLMContextProvider } = llmModule;

    // spy on console.warn so we can assert the guard path executed
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <LLMContextProvider>
        <div data-testid="child">ok</div>
      </LLMContextProvider>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('ok');
    expect(warnSpy).toHaveBeenCalledWith(
      'LLMContextProvider rendered without surrounding AuthProvider'
    );

    warnSpy.mockRestore();
  });
});
