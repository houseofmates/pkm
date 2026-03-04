import React from 'react';
import { describe, it, expect } from 'vitest';

// verify guard logic in auth-context so that the component never throws
// when the React dispatcher is missing (e.g. during hot-refresh invocations).

describe('AuthProvider', () => {
  it('does not crash when invoked without a dispatcher', async () => {
    const authModule = await import('@/contexts/auth-context');
    const { AuthProvider } = authModule;

    // temporarily clear the current dispatcher to simulate the "null"
    // condition that leads to the original error message.
    const internals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    const prevDispatcher = internals?.ReactCurrentDispatcher?.current;
    if (internals && internals.ReactCurrentDispatcher) {
      internals.ReactCurrentDispatcher.current = null;
    }

    let rendered: any;
    expect(() => {
      // call the component directly; our guard should return the children
      rendered = AuthProvider({ children: <span data-testid="ok">ok</span> });
    }).not.toThrow();

    // ensure that the returned element still contains the provided children
    expect(rendered?.props?.children).toEqual(
      <span data-testid="ok">ok</span>
    );

    // restore dispatcher to avoid leaking state into other tests
    if (internals && internals.ReactCurrentDispatcher) {
      internals.ReactCurrentDispatcher.current = prevDispatcher;
    }
  });
});
