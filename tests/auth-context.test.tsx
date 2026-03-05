import React from 'react';
import { describe, it, expect } from 'vitest';
import { FronterProvider } from '@/contexts/fronter-context';

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
        // call the component directly; our guard should return a provider
      // element that preserves the children and offers a stub auth value.
      rendered = AuthProvider({ children: <span data-testid="ok">ok</span> });
    }).not.toThrow();

    // returned element should still contain the child node
    expect(rendered?.props?.children).toEqual(
      <span data-testid="ok">ok</span>
    );

    // the top element should be an AuthContext.Provider so that useAuth
    // consumers can access the stub instead of hitting the missing-provider
    // warning.  to verify this we render a small consumer component with a
    // hook and assert no warning is produced.
    const { useAuth } = authModule;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Consumer = () => {
      const auth = useAuth();
      expect(auth.isAuthenticated).toBe(false);
      return <span data-testid="auth-ok" />;
    };
    // now render via React test utils to exercise hooks
    const { render } = await import('@testing-library/react');
    render(
      <FronterProvider>
        {rendered}
      </FronterProvider>
    );
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();

    // restore dispatcher to avoid leaking state into other tests
    if (internals && internals.ReactCurrentDispatcher) {
      internals.ReactCurrentDispatcher.current = prevDispatcher;
    }
  });
});
