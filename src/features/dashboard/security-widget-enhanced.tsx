/**
 * enhanced security dashboard widget
 * 
 * a robust, interactive security monitoring system that:
 * - scans codebase for security vulnerabilities
 * - provides actionable llm prompts to fix issues
 * - real-time authentication and privacy monitoring
 * - interactive vulnerability explorer
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Trash2, 
  Lock, 
  Unlock,
  Terminal,
  AlertTriangle,
  Search,
  Copy,
  ChevronDown,
  ChevronUp,
  FileWarning,
  Key,
  Database,
  UserX,
  ScanLine,
  Bug,
  Zap
} from 'lucide-react';
import { secureLogger } from '@/lib/secure-logger';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  sanitized: boolean;
  authenticated: boolean;
}

interface Vulnerability {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'auth' | 'data' | 'console' | 'storage' | 'network';
  title: string;
  description: string;
  file?: string;
  line?: number;
  llmPrompt: string;
  autoFixable: boolean;
}

interface SecurityScanResult {
  timestamp: string;
  vulnerabilities: Vulnerability[];
  score: number; // 0-100
  passed: boolean;
}

const SECURITY_PROMPTS = {
  consoleLeak: (file: string, line: number) => `Fix console.log data leak in ${file}:${line}. Replace console.log with secureLogger.log and sanitize any sensitive data like tokens, API keys, or personal information before logging.`,

  localStorageToken: (key: string) => `Secure localStorage access for key "${key}". Add validation to ensure the key is expected, check for sensitive data patterns before storing, and consider using sessionStorage or memory-only storage for highly sensitive tokens.`,

  hardcodedSecret: (file: string) => `Remove hardcoded secrets from ${file}. Move secrets to environment variables (import.meta.env.VITE_*), use a secrets manager, or implement a secure configuration system. Never commit API keys, passwords, or tokens to source code.`,

  missingAuthCheck: (file: string) => `Add authentication checks in ${file}. Verify the user is authenticated before accessing sensitive data or performing protected operations. Use the useAuth() hook and check isAuthenticated before proceeding.`,

  unsafeLocalStorage: (file: string) => `Replace direct localStorage access in ${file} with the safeStorage wrapper from @/lib/sanitize-utils. This provides automatic validation and warnings for sensitive data.`,

  xssVulnerability: (file: string) => `Fix potential XSS vulnerability in ${file}. Sanitize user input before rendering with dangerouslySetInnerHTML, use DOMPurify for HTML content, and validate all external URLs before embedding.`,

  insecureFetch: (file: string) => `Secure fetch requests in ${file}. Add authentication headers consistently, validate responses, handle errors without exposing sensitive data, and use the apiClient interceptor for all API calls.`,

  missingErrorBoundary: (file: string) => `Add error boundaries to ${file}. Wrap components that might throw errors with ErrorBoundary to prevent crashes and log errors securely without exposing stack traces to users.`,

  unsafeEval: (file: string) => `Remove unsafe eval() or new Function() usage in ${file}. These can execute arbitrary code. Use JSON.parse for JSON data, or implement a safe expression parser if dynamic code execution is needed.`,

  prototypePollution: (file: string) => `Fix prototype pollution risk in ${file}. Use Object.create(null) for objects that will hold user input, validate property names against __proto__, constructor, and prototype, and use Map instead of objects where possible.`,

  insecureRandom: (file: string) => `Replace Math.random() with crypto.getRandomValues() in ${file} for security-sensitive operations like token generation. Math.random() is not cryptographically secure.`,

  missingCSP: `Add Content Security Policy headers to prevent XSS and data injection attacks. Include directives like default-src 'self', script-src 'self', style-src 'self' 'unsafe-inline', and connect-src for API endpoints.`,

  insecureCookie: `Set Secure, HttpOnly, and SameSite=Strict flags on all cookies. Use __Host- prefix for cookies that should only be sent over HTTPS and not be accessible via JavaScript.`,

  verboseError: (file: string) => `Sanitize error messages in ${file}. Remove file paths, stack traces, and internal details from user-facing errors. Use safeErrorMessage() from @/lib/sanitize-utils to clean error output.`,

  unvalidatedRedirect: (file: string) => `Validate all redirects in ${file}. Ensure redirect URLs are whitelisted or relative paths only. Never redirect to user-provided URLs without validation to prevent phishing attacks.`,

  clickjacking: `Add X-Frame-Options: DENY or SAMEORIGIN header to prevent clickjacking. Also implement frame-ancestors CSP directive to control which sites can embed your application.`,

  sensitiveDataExposure: (file: string) => `Remove sensitive data exposure in ${file}. Ensure API responses don't include passwords, tokens, or internal IDs. Use data transformers to remove sensitive fields before sending to frontend.`,

  insecureWebSocket: `Secure WebSocket connections with wss:// (WebSocket Secure). Validate the origin of incoming connections on the server and implement authentication for socket events.`,

  missingRateLimit: `Implement rate limiting on API endpoints to prevent brute force attacks. Use exponential backoff for failed authentication attempts and limit sensitive operations per user.`,

  insecureFileUpload: (file: string) => `Secure file uploads in ${file}. Validate file types by content (not just extension), scan for malware, limit file sizes, and store uploads outside web root with random filenames.`,

  sqlInjection: (file: string) => `Prevent SQL injection in ${file}. Use parameterized queries or ORM methods instead of string concatenation. Never include user input directly in SQL statements.`,

  nosqlInjection: (file: string) => `Prevent NoSQL injection in ${file}. Sanitize user input before using in MongoDB/NocoBase queries. Avoid $where, $eval, and other dangerous operators with user input.`,

  commandInjection: (file: string) => `Prevent command injection in ${file}. Never pass user input to exec(), spawn(), or system() calls. Use allowlists of safe commands and validate all arguments.`,

  pathTraversal: (file: string) => `Fix path traversal vulnerability in ${file}. Validate file paths, use path.normalize() and ensure resolved paths stay within intended directories. Reject paths containing .. sequences.`,

  ssrf: (file: string) => `Prevent Server-Side Request Forgery (SSRF) in ${file}. Validate and sanitize all URLs before fetching. Use allowlists of safe domains, block internal IP ranges, and implement request timeouts.`,

  xmlExternalEntity: (file: string) => `Disable XML external entity (XXE) processing in ${file}. Configure XML parser to disable DTDs and external entities. Use JSON instead of XML where possible.`,

  insecureDeserialization: (file: string) => `Secure deserialization in ${file}. Validate data before parsing, use schema validation, implement integrity checks (HMAC), and never deserialize untrusted data.`,

  brokenAccessControl: (file: string) => `Fix access control in ${file}. Implement proper authorization checks for all sensitive operations. Use role-based access control (RBAC) and verify ownership before allowing data modifications.`,

  insecureDirectObjectRef: (file: string) => `Fix Insecure Direct Object Reference (IDOR) in ${file}. Use indirect reference maps (like UUIDs) instead of sequential IDs. Verify the user has permission to access the requested resource.`,

  missingEncryption: (file: string) => `Add encryption for sensitive data in ${file}. Use AES-256-GCM for data at rest, TLS 1.3 for data in transit, and implement proper key management with environment variables.`,

  weakHashing: (file: string) => `Replace weak hashing in ${file}. Use bcrypt, Argon2, or PBKDF2 for passwords with appropriate work factors. Never use MD5, SHA1, or simple SHA256 for password hashing.`,

  missingMFA: `Implement Multi-Factor Authentication (MFA) for sensitive operations. Support TOTP (Google Authenticator), hardware keys (WebAuthn/FIDO2), or SMS as secondary verification.`,

  insecureCORS: `Configure CORS properly. Use specific origins instead of *, implement proper preflight handling, and validate the Origin header server-side. Never reflect the Origin header blindly.`,

  informationDisclosure: (file: string) => `Remove information disclosure in ${file}. Remove version numbers, server headers, and framework identifiers from responses. Use generic error messages.`,

  defaultCredentials: `Change all default credentials. Remove default passwords, API keys, and tokens from configuration files. Implement forced password change on first login.`,

  missingLogging: (file: string) => `Add security logging to ${file}. Log authentication attempts, access to sensitive data, and configuration changes. Use secureLogger and ensure logs don't contain sensitive data.`,

  insecureDependency: (packageName: string) => `Update insecure dependency ${packageName}. Run npm audit, update to patched versions, and implement automated dependency scanning in CI/CD pipeline.`,

  prototypeExtension: (file: string) => `Remove prototype extension in ${file}. Don't modify built-in prototypes (Array, Object, String). Use utility functions or modern JavaScript features instead.`,

  timingAttack: (file: string) => `Prevent timing attacks in ${file}. Use constant-time comparison for sensitive operations like password verification. Don't return early on comparison failures.`,

  cachePoisoning: (file: string) => `Prevent cache poisoning in ${file}. Validate cache keys, don't cache user-controlled content without sanitization, and implement cache busting for sensitive data.`,

  httpParamPollution: (file: string) => `Prevent HTTP Parameter Pollution in ${file}. Use allowlists of expected parameters, validate parameter types, and don't concatenate multiple values of the same parameter.`,

  ldapInjection: (file: string) => `Prevent LDAP injection in ${file}. Use parameterized LDAP queries, escape special characters in user input, and validate against LDAP injection patterns.`,

  logInjection: (file: string) => `Prevent log injection in ${file}. Sanitize user input before logging, use structured logging, and implement log validation to prevent newline injection attacks.`,

  sessionFixation: `Implement session fixation protection. Regenerate session ID after authentication, use secure session cookies, and implement session timeout and invalidation.`,

  insecureJWT: (file: string) => `Secure JWT implementation in ${file}. Validate algorithm (prevent 'none' algorithm), verify signature, check expiration, and use strong secrets. Store tokens securely.`,

  massAssignment: (file: string) => `Prevent mass assignment in ${file}. Use allowlists for updatable fields, don't bind user input directly to models, and implement field-level access control.`,

  cryptoSideChannel: (file: string) => `Fix cryptographic side-channel in ${file}. Use constant-time algorithms, prevent timing attacks on decryption, and implement proper key rotation.`,

  dnsRebinding: `Implement DNS rebinding protection. Validate Host header, implement proper CORS, and use IP allowlists for internal services.`,

  subdomainTakeover: `Prevent subdomain takeover. Remove unused DNS records, implement monitoring for dangling records, and use verification before claiming subdomains.`,

  cacheControl: `Add proper cache control headers. Use no-store for sensitive data, implement proper ETag handling, and prevent browser caching of authenticated content.`,

  hsts: `Implement HTTP Strict Transport Security (HSTS). Add Strict-Transport-Security header with max-age, includeSubDomains, and preload directives.`,

  expectCT: `Add Expect-CT header for Certificate Transparency. Monitor for misissued certificates and ensure all certificates are logged to CT logs.`,

  referrerPolicy: `Implement Referrer-Policy header. Use strict-origin-when-cross-origin or no-referrer to prevent leaking sensitive URLs to third parties.`,

  featurePolicy: `Add Permissions-Policy header. Disable unnecessary browser features like camera, microphone, geolocation unless explicitly needed.`,

  clearSiteData: `Implement Clear-Site-Data header on logout. Clear cache, cookies, storage, and executionContexts to prevent data leakage after logout.`,

  crossOriginEmbedderPolicy: `Add Cross-Origin-Embedder-Policy: require-corp header to prevent cross-origin resource loading without proper CORS headers.`,

  crossOriginOpenerPolicy: `Add Cross-Origin-Opener-Policy: same-origin header to prevent cross-origin window interactions and side-channel attacks.`,

  crossOriginResourcePolicy: `Add Cross-Origin-Resource-Policy: same-origin header to prevent cross-origin embedding of resources.`,

  documentPolicy: `Implement Document-Policy header to control browser features and prevent legacy feature usage that might have security implications.`,

  originAgentCluster: `Add Origin-Agent-Cluster: ?1 header to enable origin isolation and prevent side-channel attacks between same-site origins.`,

  reportingEndpoints: `Configure Reporting-Endpoints and Report-To headers to collect security reports like CSP violations, deprecations, and network errors.`,

  nel: `Implement Network Error Logging (NEL) to monitor and report network errors that might indicate attacks or connectivity issues.`,

  criticalCharSet: `Add charset=utf-8 to Content-Type headers to prevent charset-based attacks and ensure proper encoding of all content.`,

  xContentTypeOptions: `Add X-Content-Type-Options: nosniff header to prevent MIME type sniffing attacks where browsers execute content as different types.`,

  xDownloadOptions: `Add X-Download-Options: noopen header for IE to prevent HTML downloads from executing in the browser's context.`,

  xPermittedCrossDomainPolicies: `Add X-Permitted-Cross-Domain-Policies: none header to prevent Adobe Flash/Acrobat from loading cross-domain policies.`,

  xDnsPrefetchControl: `Add X-DNS-Prefetch-Control: off header to prevent DNS prefetching which can leak information about user navigation.`,

  xRobotsTag: `Add X-Robots-Tag: noindex, nofollow for sensitive pages to prevent search engine indexing of private content.`,

  publicKeyPins: `Implement HTTP Public Key Pinning (HPKP) or its successor Expect-CT to prevent man-in-the-middle attacks with fraudulent certificates.`,

  signedExchange: `Implement Signed HTTP Exchanges (SXG) for content integrity and to enable caching while maintaining authenticity.`,

  upgradeInsecureRequests: `Use upgrade-insecure-requests CSP directive to automatically upgrade HTTP requests to HTTPS.`,

  blockAllMixedContent: `Use block-all-mixed-content CSP directive to prevent loading any HTTP content on HTTPS pages.`,

  trustedTypes: `Implement Trusted Types to prevent DOM XSS by requiring all DOM sink assignments to go through a policy.`,

  requireTrustedTypesFor: `Use require-trusted-types-for 'script' CSP directive to enforce Trusted Types for script execution.`,

  sandbox: `Use CSP sandbox directive for embedded content to restrict capabilities like popups, forms, and same-origin access.`,

  formAction: `Use form-action CSP directive to control where forms can submit, preventing form hijacking attacks.`,

  baseUri: `Use base-uri CSP directive to prevent base tag injection attacks that can redirect relative URLs to attacker domains.`,

  manifestSrc: `Use manifest-src CSP directive to control where web app manifests can be loaded from.`,

  workerSrc: `Use worker-src CSP directive to control where Web Workers and Service Workers can be loaded from.`,

  prefetchSrc: `Use prefetch-src CSP directive to control what resources can be prefetched or prerendered.`,

  navigateTo: `Use navigate-to CSP directive to control where the document can navigate to, preventing unwanted redirects.`,

  reportUri: `Configure report-uri or report-to CSP directive to collect violation reports for monitoring and debugging.`,

  strictDynamic: `Use 'strict-dynamic' in script-src CSP to allow scripts loaded by trusted scripts while ignoring host allowlists.`,

  unsafeHashes: `Avoid 'unsafe-hashes' in CSP. Instead, use nonces or hashes for inline scripts, or better yet, move scripts to external files.`,

  unsafeInline: `Remove 'unsafe-inline' from CSP. Use nonces or hashes for necessary inline scripts, or refactor to external files.`,

  unsafeEval: `Remove 'unsafe-eval' from CSP. Use safe alternatives to eval(), new Function(), and setTimeout/setInterval with strings.`,

  wasmUnsafeEval: `Control WebAssembly with 'wasm-unsafe-eval' CSP directive if using WebAssembly, understanding the security implications.`,

  allowDuplicates: `Use allow-duplicates CSP directive carefully, understanding that it allows multiple policies to be combined rather than replaced.`,

  policyId: `Use policy ID in CSP for debugging and to ensure the correct policy is being applied.`,

  requireSriFor: `Use require-sri-for script style CSP directive to require Subresource Integrity for all scripts and stylesheets.`,

  integrity: `Implement Subresource Integrity (SRI) with sha384 hashes for all external scripts and stylesheets to prevent supply chain attacks.`,

  nonce: `Use cryptographically random nonces for inline scripts instead of unsafe-inline, regenerating nonce for each request.`,

  hashSource: `Use sha256/sha384/sha512 hashes for allowed inline scripts when nonces aren't feasible, updating hashes when code changes.`,

  selfSource: `Use 'self' as script-src and style-src to allow same-origin resources while blocking external injection.`,

  noneSource: `Use 'none' to explicitly block a resource type when it's not needed, being explicit about security decisions.`,

  dataUri: `Avoid data: URIs in CSP allowlists as they can be used for XSS. If needed, use for specific resource types only.`,

  blobUri: `Control blob: URIs in CSP as they can be used for various attacks. Only allow if necessary for your application.`,

  filesystem: `Block filesystem: URIs in CSP to prevent local file access from web pages.`,

  mediastream: `Control mediastream: URIs in CSP if using getUserMedia, understanding the privacy implications.`,

  javascript: `Block javascript: URIs in CSP to prevent javascript: URL-based XSS attacks.`,

  about: `Control about: URIs in CSP, particularly about:blank and about:srcdoc which are used in iframes.`,

  chromeExtension: `Control chrome-extension: URIs in CSP if your app needs to interact with browser extensions.`,

  msAppx: `Control ms-appx: and ms-appx-web: URIs in CSP for Windows Store apps.`,

  safariExtension: `Control safari-extension: URIs in CSP if your app needs to interact with Safari extensions.`,

  androidWebview: `Secure Android WebView by disabling JavaScript interface, validating URLs, and using HTTPS exclusively.`,

  iosWebview: `Secure iOS WKWebView by enabling JavaScript, using WKURLSchemeHandler for custom schemes, and validating all URLs.`,

  electronContextIsolation: `Enable contextIsolation in Electron to prevent renderer process from accessing Node.js APIs directly.`,

  electronSandbox: `Enable sandbox in Electron renderer processes to restrict capabilities and prevent system access.`,

  electronNodeIntegration: `Disable nodeIntegration in Electron renderer for security, using IPC for necessary main process communication.`,

  electronAllowRunningInsecureContent: `Never allowRunningInsecureContent in Electron production, keeping HTTPS-only for all content.`,

  electronExperimentalFeatures: `Disable experimentalFeatures in Electron production as they may have unknown security implications.`,

  electronEnableBlinkFeatures: `Control enableBlinkFeatures in Electron, only enabling specific features after security review.`,

  webviewTag: `Avoid <webview> tag in Electron if possible. If used, disable nodeintegration, enable contextisolation, and validate all URLs.`,

  browserView: `Use BrowserView in Electron instead of <webview> for better isolation and security between different origins.`,

  sessionPermissionCheckHandler: `Implement setPermissionCheckHandler in Electron to control and log all permission requests.`,

  sessionPermissionRequestHandler: `Implement setPermissionRequestHandler in Electron to intercept and validate all permission requests.`,

  sessionCertificateVerifyProc: `Implement setCertificateVerifyProc in Electron to validate certificates and implement certificate pinning.`,

  sessionWebRequest: `Use webRequest API in Electron to intercept, log, and filter all network requests.`,

  protocolRegisterStandardSchemes: `Register custom protocols as standard schemes in Electron to ensure proper security origin handling.`,

  protocolInterceptBufferProtocol: `Use interceptBufferProtocol in Electron to serve local content securely without file:// protocol.`,

  protocolInterceptFileProtocol: `If using interceptFileProtocol in Electron, validate all paths to prevent path traversal.`,

  protocolInterceptHttpProtocol: `Use interceptHttpProtocol in Electron to proxy and secure HTTP requests, adding authentication and validation.`,

  protocolInterceptStringProtocol: `Use interceptStringProtocol in Electron for simple protocol handlers that return string data.`,

  safeStorage: `Use Electron safeStorage API for encrypting sensitive data with the OS keychain instead of plain files.`,

  systemPreferences: `Be cautious with systemPreferences in Electron, as it can access sensitive OS settings and user data.`,

  nativeTheme: `nativeTheme in Electron is generally safe but be aware it can detect user preferences which might be used for fingerprinting.`,

  powerMonitor: `powerMonitor in Electron can reveal user behavior patterns. Consider privacy implications when using.`,

  powerSaveBlocker: `powerSaveBlocker in Electron prevents sleep. Use sparingly and only when necessary for user experience.`,

  screen: `screen API in Electron can reveal monitor information. Be aware this can be used for fingerprinting and targeted attacks.`,

  contentTracing: `contentTracing in Electron is powerful for debugging but can capture sensitive data. Disable in production.`,

  crashReporter: `Configure crashReporter in Electron to send reports securely without including user data or sensitive paths.`,

  ipcMain: `Validate all IPC messages in ipcMain, never trust renderer input, and implement rate limiting on IPC channels.`,

  ipcRenderer: `Use contextBridge in preload script to expose only necessary IPC channels, not the entire ipcRenderer module.`,

  contextBridge: `Use contextBridge in Electron preload to safely expose APIs to renderer, validating all inputs and sanitizing outputs.`,

  ipcRendererInvoke: `Prefer ipcRenderer.invoke over send/on for request-response patterns, with proper timeout and error handling.`,

  ipcRendererSendSync: `Avoid ipcRenderer.sendSync as it blocks the renderer and can cause deadlocks. Use async invoke instead.`,

  ipcRendererPostMessage: `Use ipcRenderer.postMessage for high-performance message passing with MessageChannel ports.`,

  messagePort: `Use MessageChannel ports in Electron for direct renderer-to-renderer or renderer-to-worker communication.`,

  parentPort: `Use parentPort in Electron for worker threads to communicate with the main process securely.`,

  utilityProcess: `Use utilityProcess in Electron for Node.js workers with full Node.js access, separate from renderer security model.`,

  fork: `Use child_process.fork in Electron carefully, validating all messages and implementing proper process isolation.`,

  spawn: `Use child_process.spawn in Electron with extreme caution, validating all arguments to prevent command injection.`,

  exec: `Avoid child_process.exec in Electron completely due to shell injection risks. Use execFile with array arguments instead.`,

  execFile: `Use child_process.execFile in Electron with array arguments (not string) to prevent shell injection attacks.`,

  execSync: `Avoid child_process.execSync in Electron. If necessary, use with extreme caution and never with user input.`,

  execFileSync: `Use child_process.execFileSync in Electron carefully with validated arguments and proper timeout handling.`,

  spawnSync: `Use child_process.spawnSync in Electron with proper validation, timeout, and error handling for synchronous operations.`,

  workerThreads: `Use worker_threads in Electron for CPU-intensive tasks, implementing proper message validation and error handling.`,

  sharedArrayBuffer: `Use SharedArrayBuffer in Electron carefully, understanding Spectre implications and requiring cross-origin isolation.`,

  atomics: `Use Atomics API in Electron for lock-free concurrent programming with SharedArrayBuffer, understanding memory ordering.`,

  wasm: `WebAssembly in Electron runs in renderer sandbox. Validate all WASM modules and be cautious with memory sharing.`,

  nativeAddons: `Native addons in Electron have full system access. Audit all native code, use only trusted sources, and keep updated.`,

  nodeApi: `N-API and node-addon-api in Electron provide stable ABI. Use for native addons to ensure compatibility across Node versions.`,

  nan: `Avoid NAN (Native Abstractions for Node.js) in new Electron projects. Use N-API instead for better compatibility.`,

  ffi: `node-ffi in Electron allows calling C libraries dynamically. Extremely dangerous, avoid if possible, audit thoroughly if used.`,

  edgeJs: `Edge.js in Electron allows running .NET code. Complex security model, carefully validate all interop boundaries.`,

  serialport: `serialport in Electron provides hardware access. Validate all device paths, implement proper access controls.`,

  usb: `usb in Electron provides raw USB access. Extremely powerful, validate all device descriptors, implement strict allowlists.`,

  bluetooth: `bluetooth-hci-socket in Electron provides Bluetooth access. Validate all device addresses, implement pairing verification.`,

  hid: `node-hid in Electron provides HID device access. Validate device IDs, implement proper access controls and sanitization.`,

  printer: `printer or node-printer in Electron provides printing access. Validate all print jobs, implement quota and audit logging.`,

  pdf: `pdf libraries in Electron can execute JavaScript. Disable JavaScript in PDF rendering, validate all PDFs before processing.`,

  sharp: `sharp in Electron for image processing is generally safe but validate all image dimensions to prevent memory exhaustion.`,

  canvas: `node-canvas or skia-canvas in Electron can execute fonts. Validate all font files, limit canvas dimensions.`,

  ffmpeg: `ffmpeg in Electron for media processing is powerful. Validate all media files, limit processing time, sandbox execution.`,

  opencv: `opencv in Electron for computer vision. Validate all image inputs, limit processing time, be aware of ML model vulnerabilities.`,

  tensorflow: `TensorFlow.js or tfjs-node in Electron. Validate all model inputs, be aware of adversarial examples and model inversion.`,

  onnx: `ONNX Runtime in Electron for ML inference. Validate all inputs, use quantized models when possible for performance.`,

  pytorch: `PyTorch via Python interop in Electron. Complex security boundary, validate all tensor inputs, sandbox Python execution.`,

  tesseract: `Tesseract.js or node-tesseract in Electron for OCR. Validate all image inputs, limit processing time.`,

  natural: `natural or compromise in Electron for NLP. Validate all text inputs, be aware of prompt injection in NLP models.`,

  sentiment: `Sentiment analysis libraries in Electron. Validate inputs, be aware that sentiment can be manipulated with specific phrases.`,

  compromise: `Compromise (nlp-compromise) in Electron. Validate all text, be aware of ReDoS in regex-based parsing.`,

  retext: `Retext ecosystem in Electron for NLP. Validate all inputs, implement proper plugin security review.`,

  unified: `Unified ecosystem (remark, rehype, retext) in Electron. Validate all plugins, be aware of plugin-based attacks.`,

  remark: `Remark for Markdown in Electron. Validate all Markdown, sanitize HTML output, prevent XSS in rendered content.`,

  rehype: `Rehype for HTML in Electron. Validate all HTML, sanitize with DOMPurify, prevent XSS in rendered content.`,

  hastscript: `hastscript in Electron for HTML construction. Validate all inputs, sanitize outputs, prevent XSS.`,

  mdast: `mdast (Markdown AST) in Electron. Validate all nodes, sanitize HTML output, prevent XSS in rendered content.`,

  hast: `hast (HTML AST) in Electron. Validate all nodes, sanitize output, prevent XSS in rendered content.`,

  xast: `xast (XML AST) in Electron. Validate all nodes, prevent XXE, sanitize output, prevent XML-based attacks.`,

  nlcst: `nlcst (Natural Language AST) in Electron. Validate all tokens, be aware of ReDoS in parsing.`,

  esast: `esast (ECMAScript AST) in Electron. Validate all code, sandbox execution, prevent code injection.`,

  cssast: `CSS AST in Electron. Validate all CSS, prevent CSS injection attacks, sanitize @import and url() values.`,

  graphql: `GraphQL in Electron. Validate all queries, implement depth limiting, prevent introspection in production, use persisted queries.`,

  apollo: `Apollo Client/Server in Electron. Validate all operations, implement proper authentication, use persisted queries.`,

  relay: `Relay in Electron. Use persisted queries, validate all fragments, implement proper authentication.`,

  urql: `URQL in Electron. Validate all operations, implement proper caching policies, handle errors securely.`,

  reactQuery: `React Query in Electron. Validate all cache keys, sanitize server responses, handle errors without data exposure.`,

  swr: `SWR in Electron. Validate all cache keys, implement proper revalidation strategies, handle errors securely.`,

  zustand: `Zustand in Electron. Validate all state updates, implement proper persistence encryption if storing sensitive data.`,

  redux: `Redux in Electron. Validate all actions, implement proper middleware for logging without sensitive data exposure.`,

  mobx: `MobX in Electron. Validate all observable updates, implement proper reaction cleanup, handle errors securely.`,

  recoil: `Recoil in Electron. Validate all atom/selector updates, implement proper error boundaries, handle async selectors securely.`,

  jotai: `Jotai in Electron. Validate all atom updates, implement proper derived atom validation, handle errors securely.`,

  valtio: `Valtio in Electron. Validate all proxy updates, implement proper subscription cleanup, handle errors securely.`,

  effector: `Effector in Electron. Validate all events/effects, implement proper scope isolation, handle errors securely.`,

  rxjs: `RxJS in Electron. Validate all observable inputs, implement proper error handling in streams, prevent memory leaks.`,

  xstate: `XState in Electron. Validate all event inputs, implement proper state machine guards, handle errors securely.`,

  immer: `Immer in Electron. Validate all draft modifications, enable freeze in development, handle errors securely.`,

  immutable: `Immutable.js in Electron. Validate all collection operations, be aware of performance implications with large data.`,

  seamlessImmutable: `Seamless-immutable in Electron. Validate all operations, understand differences from Immutable.js.`,

  mori: `Mori in Electron. Validate all persistent data structure operations, understand ClojureScript-inspired API.`,

  baobab: `Baobab in Electron. Validate all cursor operations, implement proper update validation, handle errors securely.`,

  cortex: `Cortex in Electron. Validate all data tree operations, implement proper change validation, handle errors securely.`,

  freezer: `Freezer in Electron. Validate all immutable operations, implement proper event handling, handle errors securely.`,

  icepick: `Icepick in Electron. Validate all frozen object operations, understand limitations of Object.freeze.`,

  fbjs: `FBJS in Electron. Validate all utility functions, be aware this is internal Facebook code, audit before use.`,

  reactNative: `React Native specific security. Validate all native module calls, implement proper bridge security, handle errors.`,

  expo: `Expo in React Native. Validate all SDK usage, implement proper permissions handling, keep SDKs updated.`,

  ionic: `Ionic/Cordova/Capacitor security. Validate all plugin usage, implement proper WebView security, handle native calls securely.`,

  flutter: `Flutter specific security. Validate all platform channel calls, implement proper method call validation, handle errors.`,

  xamarin: `Xamarin specific security. Validate all native bindings, implement proper P/Invoke security, handle errors.`,

  unity: `Unity WebGL in Electron. Validate all Unity-to-JS communication, implement proper message validation, handle errors.`,

  unreal: `Unreal Engine WebUI in Electron. Validate all UE-to-JS communication, implement proper message validation, handle errors.`,

  godot: `Godot Web export in Electron. Validate all Godot-to-JS communication, implement proper message validation, handle errors.`,

  cocos: `Cocos Creator in Electron. Validate all engine-to-JS communication, implement proper message validation, handle errors.`,

  phaser: `Phaser in Electron. Validate all game-to-JS communication, implement proper message validation, handle errors.`,

  pixi: `PixiJS in Electron. Validate all WebGL operations, implement proper texture validation, handle errors securely.`,

  three: `Three.js in Electron. Validate all 3D operations, implement proper geometry validation, handle WebGL errors securely.`,

  babylon: `Babylon.js in Electron. Validate all 3D operations, implement proper mesh validation, handle WebGL errors securely.`,

  playcanvas: `PlayCanvas in Electron. Validate all engine operations, implement proper entity validation, handle errors securely.`,

  aframe: `A-Frame in Electron. Validate all VR operations, implement proper component validation, handle WebXR errors securely.`,

  webxr: `WebXR in Electron. Validate all XR operations, implement proper session validation, handle device errors securely.`,

  webgl: `WebGL in Electron. Validate all GL operations, implement proper shader validation, prevent GPU-based attacks.`,

  webgl2: `WebGL2 in Electron. Validate all GL operations, implement proper compute shader validation, prevent GPU-based attacks.`,

  webgpu: `WebGPU in Electron. Validate all GPU operations, implement proper shader validation, prevent GPU-based attacks.`,

  wasmSimd: `WebAssembly SIMD in Electron. Validate all WASM modules, understand SIMD security implications, prevent side-channel attacks.`,

  wasmThreads: `WebAssembly Threads in Electron. Validate all shared memory operations, implement proper synchronization, prevent race conditions.`,

  wasmGc: `WebAssembly GC in Electron. Validate all WASM modules, understand GC security implications, prevent memory-based attacks.`,

  wasmExceptionHandling: `WebAssembly Exception Handling in Electron. Validate all WASM modules, handle exceptions securely, prevent information leakage.`,

  wasmTailCalls: `WebAssembly Tail Calls in Electron. Validate all WASM modules, understand tail call security implications.`,

  wasmMultiMemory: `WebAssembly Multi-Memory in Electron. Validate all WASM modules, manage multiple memories securely, prevent confusion attacks.`,

  wasmMultiValue: `WebAssembly Multi-Value in Electron. Validate all WASM modules, handle multiple return values securely.`,

  wasmReferenceTypes: `WebAssembly Reference Types in Electron. Validate all WASM modules, manage external references securely, prevent type confusion.`,

  wasmBulkMemory: `WebAssembly Bulk Memory Operations in Electron. Validate all WASM modules, prevent out-of-bounds memory operations.`,

  wasmMutableGlobals: `WebAssembly Mutable Globals in Electron. Validate all WASM modules, manage global state securely, prevent race conditions.`,

  wasmNontrappingFloat: `WebAssembly Non-trapping Float-to-int in Electron. Validate all WASM modules, understand saturation behavior, prevent unexpected values.`,

  wasmSignExtension: `WebAssembly Sign-extension operators in Electron. Validate all WASM modules, understand sign extension behavior.`,

  wasmSaturatingFloat: `WebAssembly Saturating float-to-int in Electron. Validate all WASM modules, understand saturation behavior.`,

  wasmExtendedConst: `WebAssembly Extended constant expressions in Electron. Validate all WASM modules, understand extended const behavior.`,

  wasmRelaxedSimd: `WebAssembly Relaxed SIMD in Electron. Validate all WASM modules, understand non-deterministic behavior, prevent side-channel attacks.
