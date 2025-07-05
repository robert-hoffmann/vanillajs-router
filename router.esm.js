/**
 * VanillaJS Router - Enterprise-grade hash-based routing
 *
 * This router provides Vue Router-style functionality in pure vanilla JavaScript.
 * It's designed for production use with proper error handling, memory management,
 * and support for complex navigation scenarios.
 */

// ============================
// PARAMETER PROCESSING UTILITIES
// ============================

/**
 * Converts URLSearchParams to an object where each key maps to an array of values.
 * This ensures consistent handling of parameters, whether they appear once or multiple times.
 *
 * Example: "category=books&category=electronics&sort=price"
 * Returns: { category: ["books", "electronics"], sort: ["price"] }
 */
const paramsToObj = (params) => {
    const out = {};
    for (const [k, v] of params) {
        // Use nullish coalescing to create array if key doesn't exist
        (out[k] ??= []).push(v);
    }
    return out;
};

/**
 * Converts string values to their appropriate JavaScript types.
 * This makes working with URL parameters much more intuitive.
 */
const coerceValue = (value) => {
    // Handle explicit boolean strings
    if (value === 'true') return true;
    if (value === 'false') return false;

    // Handle explicit null/undefined strings
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    // Try to convert to number (handles both integers and floats)
    const num = Number(value);
    if (!Number.isNaN(num) && value.trim() !== '') return num;

    // Return as string if no other type matches
    return value;
};

/**
 * Applies type coercion to all parameter arrays.
 * Each value in each array gets converted to its appropriate type.
 */
const coerceParams = (params) => {
    const coerced = {};
    for (const [key, values] of Object.entries(params)) {
        coerced[key] = values.map(coerceValue);
    }
    return coerced;
};

/**
 * Creates a router instance for the given global object.
 * This function is the core factory that creates the router.
 */
function createRouter(globalObj = globalThis) {
    // ============================
    // ROUTE OBJECT CREATION
    // ============================

    /**
     * Creates a route object from the current URL state.
     * Parses both search params (?key=value) and hash params (#!/path?key=value).
     *
     * Returns an object with:
     * - path: The route path (after #!/)
     * - query: Raw query parameters from URL search (?key=value)
     * - params: Raw parameters from hash fragment (#!/path?key=value)
     * - queryTyped: Type-coerced query parameters
     * - paramsTyped: Type-coerced hash parameters
     */
    const makeRoute = () => {
        // Extract the hash fragment, removing the #!/ prefix
        const raw       = globalObj.location.hash.replace(/^#!\/?/, '');
        const parts     = raw.split('?');
        const path      = parts[0] || '';
        const hashQuery = parts[1] || '';

        // Parse both URL search params and hash params
        const searchParams = new URLSearchParams(globalObj.location.search.slice(1));
        const hashParams   = new URLSearchParams(hashQuery);

        return {
            path        : path,
            query       : paramsToObj(searchParams),
            params      : paramsToObj(hashParams),
            queryTyped  : coerceParams(paramsToObj(searchParams)),
            paramsTyped : coerceParams(paramsToObj(hashParams))
        };
    };

    // ============================
    // STATE MANAGEMENT
    // ============================

    // Current and previous route objects
    let route           = makeRoute();
    let prevRoute       = { ...route };

    // Navigation guard arrays - functions that run before/after navigation
    let beforeListeners = [];
    let afterListeners  = [];

    // Lifecycle management
    let destroyed       = false;
    let lastHash        = globalObj.location.hash;

    // ============================
    // SCROLL RESTORATION SYSTEM
    // ============================

    /**
     * Map to store scroll positions for each route.
     * Keys are route paths, values are objects containing scroll coordinates.
     */
    let scrollPositions = new Map();

    /**
     * Captures the current scroll position for a given route.
     * Stores both window scroll and container scroll positions.
     */
    const captureScroll = (routePath) => {
        const container = globalObj.document?.getElementById('scroll-container');
        scrollPositions.set(routePath, {
            winX       : globalObj.pageXOffset,        // Window horizontal scroll
            winY       : globalObj.pageYOffset,        // Window vertical scroll
            containerY : container?.scrollTop ?? 0,  // Container scroll position
            timestamp  : Date.now()              // When this was captured
        });
    };

    /**
     * Restores the scroll position for a given route.
     * Uses requestAnimationFrame to ensure DOM is ready before scrolling.
     */
    const restoreScroll = (routePath) => {
        const saved = scrollPositions.get(routePath);
        if (saved) {
            globalObj.requestAnimationFrame(() => {
                // Restore window scroll position
                globalObj.scrollTo(saved.winX, saved.winY);

                // Restore container scroll position
                const container = globalObj.document?.getElementById('scroll-container');
                if (container) container.scrollTop = saved.containerY;

                // Update the display
                updateScrollDisplay();
            });
        }
    };

    // ============================
    // NAVIGATION GUARD SYSTEM
    // ============================

    /**
     * Checks if navigation to a new route is allowed.
     * Runs all "beforeEach" guards and waits for them to complete.
     * Guards can throw errors to cancel navigation.
     */
    const canNavigate = async (newRoute) => {
        // Don't navigate if router is destroyed
        if (destroyed) return false;

        // Capture scroll position before potentially leaving current route
        if (route.path) {
            captureScroll(route.path);
        }

        // Run all beforeEach guards in parallel
        const beforePromises = beforeListeners.map(async (callback) => {
            if (typeof callback === 'function') {
                return await callback(newRoute, route);
            }
        });

        try {
            // Wait for all guards to complete
            await Promise.all(beforePromises);
            return true;
        } catch (error) {
            // If any guard throws an error, cancel navigation
            console.error('Navigation cancelled by guard:', error);
            updateNavStatus('❌ ' + error.message);
            return false;
        }
    };

    /**
     * Completes the navigation process after guards have passed.
     * Updates route state and runs afterEach hooks.
     */
    const completeNavigation = (newRoute) => {
        if (destroyed) return;

        // Update route state
        prevRoute = { ...route };
        route = newRoute;

        // Run all afterEach hooks
        afterListeners.forEach(callback => {
            if (typeof callback === 'function') {
                try {
                    callback(newRoute, prevRoute);
                } catch (error) {
                    console.error('After hook error:', error);
                }
            }
        });

        // Restore scroll position for the new route
        restoreScroll(newRoute.path);
        updateNavStatus('✅ Navigation complete');
    };

    // ============================
    // GUARD REGISTRATION FUNCTIONS
    // ============================

    /**
     * Registers a function to run before each navigation.
     * Returns an unsubscribe function.
     */
    const addBeforeListener = (callback) => {
        if (typeof callback !== 'function') return () => {};
        if (destroyed) return () => {};

        beforeListeners.push(callback);
        // Call immediately with current route
        callback(route, prevRoute);

        // Return unsubscribe function
        return () => {
            if (destroyed) return;
            const index = beforeListeners.indexOf(callback);
            if (index !== -1) beforeListeners.splice(index, 1);
        };
    };

    /**
     * Registers a function to run after each navigation.
     * Returns an unsubscribe function.
     */
    const addAfterListener = (callback) => {
        if (typeof callback !== 'function') return () => {};
        if (destroyed) return () => {};

        afterListeners.push(callback);

        // Return unsubscribe function
        return () => {
            if (destroyed) return;
            const index = afterListeners.indexOf(callback);
            if (index !== -1) afterListeners.splice(index, 1);
        };
    };

    // ============================
    // CORE NAVIGATION LOGIC
    // ============================

    /**
     * Handles route changes, whether from user navigation or programmatic changes.
     * This is the heart of the router - it processes hash changes and decides what to do.
     */
    const handleRouteChange = async () => {
        if (destroyed) return;

        // *** ANCHOR LINK HANDLING ***
        // Check if this is a native anchor link (not a router route)
        const isNativeAnchor = (hash) => {
            const id = hash.slice(1);
            return !hash.startsWith('#!/') && globalObj.document?.getElementById(id);
        };

        // If it's a native anchor, just scroll to it and return
        if (isNativeAnchor(globalObj.location.hash)) {
            globalObj.requestAnimationFrame(() => {
                const el = globalObj.document?.getElementById(globalObj.location.hash.slice(1));
                el?.scrollIntoView({ behavior: 'smooth' });
            });
            return;
        }

        // *** DUPLICATE NAVIGATION PREVENTION ***
        // Don't process if hash hasn't actually changed
        if (globalObj.location.hash === lastHash) return;

        // *** NAVIGATION PROCESSING ***
        updateNavStatus('🔄 Navigating...');
        const newRoute = makeRoute();
        const success  = await canNavigate(newRoute);

        if (success) {
            // Navigation allowed - update state
            lastHash = globalObj.location.hash;
            completeNavigation(newRoute);
        } else {
            // Navigation cancelled - rollback URL
            const rollbackHash = prevRoute.path ? '#!/' + prevRoute.path : '';
            globalObj.location.hash = rollbackHash;
            lastHash          = rollbackHash;
        }
    };

    /**
     * Programmatically navigate to a new route.
     * This is used by the push() and replace() methods.
     */
    const changeHash = async (newPath, replace = false) => {
        // Clean and format the path
        const cleanPath = newPath.replace(/^\/+/, '');
        const safePath = newPath.startsWith('#') ? newPath : '#!/' + cleanPath;

        updateNavStatus('🔄 Navigating...');

        // Create a temporary route object to test against guards
        const tempRoute = {
            ...makeRoute(),
            path: cleanPath
        };

        // Check if navigation is allowed
        const success = await canNavigate(tempRoute);
        if (!success) return false;

        // Update the URL
        if (replace) {
            // Replace current history entry
            const baseUrl = globalObj.location.href.replace(/#.*$/, '');
            globalObj.location.replace(baseUrl + safePath);
        } else {
            // Add new history entry
            globalObj.location.hash = safePath;
        }

        lastHash = safePath;
        completeNavigation(tempRoute);
        return true;
    };

    // ============================
    // UI UPDATE FUNCTIONS
    // ============================

    /**
     * Updates the navigation status display in the UI.
     */
    const updateNavStatus = (status) => {
        const el = globalObj.document?.getElementById('nav-status');
        if (el) el.textContent = status;
    };

    /**
     * Updates the scroll position display in the UI.
     */
    const updateScrollDisplay = () => {
        const el        = globalObj.document?.getElementById('scroll-pos');
        const container = globalObj.document?.getElementById('scroll-container');
        if (el) {
            el.textContent = `Win: ${globalObj.pageXOffset}, ${globalObj.pageYOffset} | Container: ${container?.scrollTop ?? 0}`;
        }
    };

    // ============================
    // EVENT LISTENERS SETUP
    // ============================

    // Monitor scroll changes for the display
    globalObj.addEventListener('scroll', updateScrollDisplay);
    const container = globalObj.document?.getElementById('scroll-container');
    if (container) {
        container.addEventListener('scroll', updateScrollDisplay);
    }

    // Listen for hash changes (back/forward buttons, direct URL changes)
    globalObj.addEventListener('hashchange', handleRouteChange);

    // Process the initial route
    handleRouteChange();

    // ============================
    // PUBLIC API
    // ============================

    /**
     * Return the public router interface.
     */
    return {
        // Guard registration
        beforeEach : addBeforeListener,
        afterEach  : addAfterListener,

        // Programmatic navigation
        push    : (path) => changeHash(path, false),
        replace : (path) => changeHash(path, true),

        // Route information getters
        currentRoute  : () => ({ ...route }),
        previousRoute : () => ({ ...prevRoute }),
        getRouteState : () => ({ to: { ...route }, from: { ...prevRoute } }),

        // Convenience getters for typed parameters
        getTypedParams : () => route.paramsTyped,
        getTypedQuery  : () => route.queryTyped,

        // Scroll management
        saveScrollPosition    : (path = route.path) => captureScroll(path),
        restoreScrollPosition : (path = route.path) => restoreScroll(path),
        clearScrollHistory    : () => scrollPositions.clear(),

        // Browser history control
        go      : (n) => globalObj.history.go(n),
        back    : ()  => globalObj.history.back(),
        forward : ()  => globalObj.history.forward(),

        // Cleanup for single-page apps
        destroy: () => {
            destroyed = true;
            lastHash  = '';

            // Remove event listeners
            globalObj.removeEventListener('hashchange', handleRouteChange);
            globalObj.removeEventListener('scroll', updateScrollDisplay);

            // Clear all arrays and maps
            beforeListeners.length = 0;
            afterListeners.length  = 0;
            scrollPositions.clear();
        }
    };
}

// Default export for ES modules
export default createRouter;

// Named exports for flexibility
export { createRouter, paramsToObj, coerceValue, coerceParams };

// Create a default instance for compatibility
export const router = createRouter();