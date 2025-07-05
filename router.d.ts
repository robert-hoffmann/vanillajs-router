/**
 * VanillaJS Router - TypeScript Definitions
 * Enterprise-grade hash-based routing in pure vanilla JavaScript
 */

/**
 * Raw route parameters where each key maps to an array of string values.
 *
 * **Why arrays?** URL parameters can appear multiple times:
 * `?category=books&category=electronics` becomes `{ category: ["books", "electronics"] }`
 *
 * @example
 * ```typescript
 * // URL: #!/products?category=electronics&sort=price
 * const params: RouteParams = {
 *   category: ["electronics"],
 *   sort: ["price"]
 * };
 * ```
 */
export interface RouteParams {
  [key: string]: string[];
}

/**
 * Type-coerced route parameters with automatic string → primitive type conversion.
 *
 * **Automatic conversions:**
 * - `"123"` → `123` (number)
 * - `"true"/"false"` → `true/false` (boolean)
 * - `"null"` → `null`
 * - `"undefined"` → `undefined`
 * - `"45.67"` → `45.67` (float)
 * - Other strings remain as strings
 *
 * @example
 * ```typescript
 * // URL: #!/analytics?users=1500&active=true&revenue=45000.50
 * const typed: TypedRouteParams = {
 *   users: [1500],           // number
 *   active: [true],          // boolean
 *   revenue: [45000.5]       // float
 * };
 *
 * // Extract first values (common pattern)
 * const [userCount] = typed.users || [0];      // 1500
 * const [isActive] = typed.active || [false];  // true
 * ```
 */
export interface TypedRouteParams {
  [key: string]: (string | number | boolean | null | undefined)[];
}

/**
 * Complete route information object containing path and all parameter variations.
 *
 * This is the main object you'll work with in navigation guards and route handlers.
 *
 * @example
 * ```typescript
 * // URL: #!/user?id=123&tab=profile
 * const route: Route = {
 *   path: "user",
 *   params: { id: ["123"], tab: ["profile"] },
 *   paramsTyped: { id: [123], tab: ["profile"] },
 *   query: {},
 *   queryTyped: {}
 * };
 * ```
 */
export interface Route {
  /**
   * The route path extracted from hash (after #!/).
   *
   * @example "user", "dashboard", "products"
   */
  path: string;

  /**
   * Raw query parameters from URL search string (?key=value).
   * All values are strings in arrays for consistency.
   *
   * @example
   * URL: `https://example.com?filter=active&sort=date`
   * Result: `{ filter: ["active"], sort: ["date"] }`
   */
  query: RouteParams;

  /**
   * Raw parameters from hash fragment (#!/path?key=value).
   * All values are strings in arrays for consistency.
   *
   * @example
   * URL: `#!/products?category=books&category=electronics&sort=price`
   * Result: `{ category: ["books", "electronics"], sort: ["price"] }`
   */
  params: RouteParams;

  /**
   * Type-coerced query parameters with automatic type conversion.
   * Numbers, booleans, null, undefined are converted from strings.
   *
   * @example
   * URL: `?page=2&active=true&limit=10`
   * Result: `{ page: [2], active: [true], limit: [10] }`
   */
  queryTyped: TypedRouteParams;

  /**
   * Type-coerced hash parameters with automatic type conversion.
   * Numbers, booleans, null, undefined are converted from strings.
   *
   * @example
   * URL: `#!/analytics?users=1500&revenue=45000.50&active=true`
   * Result: `{ users: [1500], revenue: [45000.5], active: [true] }`
   */
  paramsTyped: TypedRouteParams;
}

/**
 * Navigation state containing both destination and source routes.
 *
 * Useful for comparing where you're going vs where you came from.
 *
 * @example
 * ```typescript
 * const state: RouteState = {
 *   to: { path: "dashboard", ... },    // Where we're going
 *   from: { path: "home", ... }        // Where we came from
 * };
 * ```
 */
export interface RouteState {
  /** The route being navigated to */
  to: Route;
  /** The route being navigated from */
  from: Route;
}

/**
 * Navigation guard function that can prevent or modify navigation.
 *
 * **Guards can:**
 * - Inspect the destination route before navigation
 * - Throw errors to cancel navigation
 * - Perform async operations (API calls, auth checks)
 * - Update page content based on the new route
 *
 * **To cancel navigation:** Throw an error or reject a promise
 *
 * @param to - The route being navigated to
 * @param from - The route being navigated from
 *
 * @example
 * ```typescript
 * const authGuard: NavigationGuard = async (to, from) => {
 *   // Check authentication before accessing protected routes
 *   if (to.path === 'admin' && !user.isAuthenticated) {
 *     throw new Error('Authentication required');
 *   }
 *
 *   // Load data for the new route
 *   await loadUserData(to.params.id);
 * };
 *
 * router.beforeEach(authGuard);
 * ```
 */
export type NavigationGuard = (to: Route, from: Route) => void | Promise<void>;

/**
 * Navigation hook that runs after successful navigation.
 *
 * **Hooks are useful for:**
 * - Analytics tracking
 * - Updating page titles
 * - Cleaning up resources
 * - Logging navigation events
 *
 * **Note:** Hooks cannot cancel navigation (it's already complete)
 *
 * @param to - The route that was navigated to
 * @param from - The route that was navigated from
 *
 * @example
 * ```typescript
 * const analyticsHook: NavigationHook = (to, from) => {
 *   // Track page views
 *   analytics.track('page_view', {
 *     page: to.path,
 *     referrer: from.path
 *   });
 *
 *   // Update page title
 *   document.title = `My App - ${to.path}`;
 * };
 *
 * router.afterEach(analyticsHook);
 * ```
 */
export type NavigationHook = (to: Route, from: Route) => void;

/**
 * Function to unsubscribe from navigation guards or hooks.
 *
 * Call this function to remove a previously registered guard/hook.
 *
 * @example
 * ```typescript
 * // Register a guard and get unsubscribe function
 * const unsubscribe = router.beforeEach((to, from) => {
 *   console.log('Navigating to:', to.path);
 * });
 *
 * // Later, remove the guard
 * unsubscribe();
 * ```
 */
export type UnsubscribeFunction = () => void;

/**
 * Scroll position data stored for each route.
 *
 * The router automatically captures and restores scroll positions
 * when navigating between routes.
 *
 * @internal This is primarily used internally by the router
 */
export interface ScrollPosition {
  /** Window horizontal scroll position in pixels */
  winX: number;
  /** Window vertical scroll position in pixels */
  winY: number;
  /** Container element scroll position in pixels (if applicable) */
  containerY: number;
  /** Timestamp when this position was captured */
  timestamp: number;
}

/**
 * Main router interface providing all navigation and route management functionality.
 *
 * This is the primary interface you'll interact with for all routing operations.
 *
 * @example
 * ```typescript
 * // Create router instance
 * const router: Router = createRouter();
 *
 * // Set up navigation guard
 * router.beforeEach((to, from) => {
 *   console.log(`Navigating from ${from.path} to ${to.path}`);
 * });
 *
 * // Navigate programmatically
 * await router.push('/dashboard?tab=analytics');
 *
 * // Get current route info
 * const current = router.currentRoute();
 * console.log(current.path); // "dashboard"
 * ```
 */
export interface Router {
  /**
   * Register a function to run before each navigation.
   *
   * **Use cases:**
   * - Authentication checks
   * - Data loading
   * - Route validation
   * - Loading states
   *
   * **To cancel navigation:** Throw an error or reject a promise
   *
   * @param guard - Function that receives (to, from) route objects
   * @returns Unsubscribe function to remove this guard
   *
   * @example
   * ```typescript
   * // Authentication guard
   * const unsubscribe = router.beforeEach(async (to, from) => {
   *   if (to.path === 'admin' && !await checkAuth()) {
   *     throw new Error('Access denied');
   *   }
   * });
   *
   * // Remove guard when no longer needed
   * unsubscribe();
   * ```
   */
  beforeEach(guard: NavigationGuard): UnsubscribeFunction;

  /**
   * Register a function to run after each successful navigation.
   *
   * **Use cases:**
   * - Analytics tracking
   * - Page title updates
   * - Cleanup tasks
   * - Success notifications
   *
   * @param hook - Function that receives (to, from) route objects
   * @returns Unsubscribe function to remove this hook
   *
   * @example
   * ```typescript
   * // Analytics tracking
   * router.afterEach((to, from) => {
   *   gtag('config', 'GA_MEASUREMENT_ID', {
   *     page_path: to.path
   *   });
   * });
   * ```
   */
  afterEach(hook: NavigationHook): UnsubscribeFunction;

  /**
   * Navigate to a new route programmatically (adds to browser history).
   *
   * **Path formats supported:**
   * - Simple: `"dashboard"`
   * - With params: `"user?id=123&tab=profile"`
   * - With leading slash: `"/products?category=books"`
   *
   * @param path - Route path with optional parameters
   * @returns Promise that resolves to true if navigation succeeded, false if cancelled
   *
   * @example
   * ```typescript
   * // Simple navigation
   * await router.push('/dashboard');
   *
   * // With parameters
   * await router.push('/user?id=123&name=John&admin=true');
   *
   * // Check if navigation succeeded
   * const success = await router.push('/protected-area');
   * if (!success) {
   *   console.log('Navigation was cancelled by a guard');
   * }
   * ```
   */
  push(path: string): Promise<boolean>;

  /**
   * Navigate to a new route, replacing current history entry.
   *
   * Unlike `push()`, this doesn't add a new entry to browser history.
   * Useful for redirects or replacing invalid routes.
   *
   * @param path - Route path with optional parameters
   * @returns Promise that resolves to true if navigation succeeded, false if cancelled
   *
   * @example
   * ```typescript
   * // Redirect without adding to history
   * await router.replace('/login');
   *
   * // Replace invalid route
   * if (isInvalidRoute(currentPath)) {
   *   await router.replace('/404');
   * }
   * ```
   */
  replace(path: string): Promise<boolean>;

  /**
   * Get the current route information.
   *
   * Returns a copy of the current route object with all parameter variations.
   *
   * @returns Current route object with path and parameters
   *
   * @example
   * ```typescript
   * const route = router.currentRoute();
   * console.log(route.path);                    // "user"
   * console.log(route.params.id);               // ["123"] (raw string)
   * console.log(route.paramsTyped.id);          // [123] (converted number)
   *
   * // Common pattern: extract first parameter value
   * const [userId] = route.paramsTyped.id || [0];
   * ```
   */
  currentRoute(): Route;

  /**
   * Get the previous route information.
   *
   * Useful for implementing "back" functionality or breadcrumbs.
   *
   * @returns Previous route object, or empty route if none
   *
   * @example
   * ```typescript
   * const previous = router.previousRoute();
   * if (previous.path) {
   *   console.log(`Came from: ${previous.path}`);
   * }
   * ```
   */
  previousRoute(): Route;

  /**
   * Get both current and previous route information.
   *
   * Convenient method that returns both routes in a single object.
   *
   * @returns Object with 'to' (current) and 'from' (previous) routes
   *
   * @example
   * ```typescript
   * const { to, from } = router.getRouteState();
   * console.log(`Navigation: ${from.path} → ${to.path}`);
   * ```
   */
  getRouteState(): RouteState;

  /**
   * Get current route's hash parameters with type coercion applied.
   *
   * Convenience method equivalent to `currentRoute().paramsTyped`.
   *
   * @returns Type-coerced hash parameters
   *
   * @example
   * ```typescript
   * // URL: #!/user?id=123&admin=true&score=98.5
   * const params = router.getTypedParams();
   * const [id] = params.id || [0];           // 123 (number)
   * const [isAdmin] = params.admin || [false]; // true (boolean)
   * const [score] = params.score || [0];     // 98.5 (number)
   * ```
   */
  getTypedParams(): TypedRouteParams;

  /**
   * Get current route's query parameters with type coercion applied.
   *
   * Convenience method equivalent to `currentRoute().queryTyped`.
   *
   * @returns Type-coerced query parameters
   *
   * @example
   * ```typescript
   * // URL: https://example.com?page=2&limit=50&active=true#!/dashboard
   * const query = router.getTypedQuery();
   * const [page] = query.page || [1];        // 2 (number)
   * const [limit] = query.limit || [10];     // 50 (number)
   * const [active] = query.active || [false]; // true (boolean)
   * ```
   */
  getTypedQuery(): TypedRouteParams;

  /**
   * Manually save the current scroll position for a route.
   *
   * The router normally does this automatically, but you can call this
   * method to capture scroll positions at specific moments.
   *
   * @param path - Route path to save position for (defaults to current route)
   *
   * @example
   * ```typescript
   * // Save scroll position before showing a modal
   * router.saveScrollPosition();
   * showModal();
   * ```
   */
  saveScrollPosition(path?: string): void;

  /**
   * Manually restore the scroll position for a route.
   *
   * The router normally does this automatically during navigation,
   * but you can call this method to restore positions manually.
   *
   * @param path - Route path to restore position for (defaults to current route)
   *
   * @example
   * ```typescript
   * // Restore scroll position after closing a modal
   * closeModal();
   * router.restoreScrollPosition();
   * ```
   */
  restoreScrollPosition(path?: string): void;

  /**
   * Clear all saved scroll positions from memory.
   *
   * Useful for memory cleanup in long-running applications.
   *
   * @example
   * ```typescript
   * // Clear scroll history when user logs out
   * router.clearScrollHistory();
   * ```
   */
  clearScrollHistory(): void;

  /**
   * Navigate through browser history by a specific number of steps.
   *
   * Positive numbers go forward, negative numbers go backward.
   *
   * @param delta - Number of steps to move in history (+/-)
   *
   * @example
   * ```typescript
   * router.go(-1);  // Go back one page
   * router.go(-2);  // Go back two pages
   * router.go(1);   // Go forward one page
   * ```
   */
  go(delta: number): void;

  /**
   * Navigate back one step in browser history.
   *
   * Equivalent to clicking the browser's back button or calling `go(-1)`.
   *
   * @example
   * ```typescript
   * // Add a back button to your UI
   * backButton.onclick = () => router.back();
   * ```
   */
  back(): void;

  /**
   * Navigate forward one step in browser history.
   *
   * Equivalent to clicking the browser's forward button or calling `go(1)`.
   *
   * @example
   * ```typescript
   * // Add a forward button to your UI
   * forwardButton.onclick = () => router.forward();
   * ```
   */
  forward(): void;

  /**
   * Clean up the router and remove all event listeners.
   *
   * **Important:** Call this when destroying your application to prevent memory leaks.
   * After calling destroy(), the router instance should not be used.
   *
   * **What gets cleaned up:**
   * - Event listeners (hashchange, scroll)
   * - Navigation guards and hooks
   * - Scroll position history
   * - Internal state
   *
   * @example
   * ```typescript
   * // Clean up when app is destroyed
   * window.addEventListener('beforeunload', () => {
   *   router.destroy();
   * });
   *
   * // Or in a SPA framework lifecycle
   * onBeforeUnmount(() => {
   *   router.destroy();
   * });
   * ```
   */
  destroy(): void;
}

// Utility functions
export function paramsToObj(params: URLSearchParams): RouteParams;
export function coerceValue(value: string): string | number | boolean | null | undefined;
export function coerceParams(params: RouteParams): TypedRouteParams;

// Router factory function
export function createRouter(win?: Window): Router;

// Default export
declare const createRouter: (win?: Window) => Router;
export default createRouter;

// Pre-configured router instance
export declare const router: Router;

// Global declaration for UMD build
declare global {
  interface Window {
    MyRouter: Router;
  }

  // For environments where MyRouter might be global
  const MyRouter: Router;
}

// Module augmentation for environments that might extend the router
declare module 'vanillajs-router' {
  interface Route {
    // Allow users to extend Route interface
  }

  interface Router {
    // Allow users to extend Router interface
  }
}