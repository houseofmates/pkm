// This file exists solely for backwards compatibility with tests that
// import from `src/schema/field-types`. It delegates to the real
// registry in services/field-types.ts so we don't duplicate definitions.

import '../services/field-types';

// nothing else to export; side effect of the above import is sufficient
console.log('schema/field-types loaded (delegated to services/field-types)');