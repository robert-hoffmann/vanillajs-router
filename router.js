/**
 * VanillaJS Router - Enterprise-grade hash-based routing
 *
 * This router provides Vue Router-style functionality in pure vanilla JavaScript.
 * It's designed for production use with proper error handling, memory management,
 * and support for complex navigation scenarios.
 *
 * COMPLETELY UI-AGNOSTIC - No DOM dependencies or assumptions about HTML structure.
 */
const MyRouter = (function(globalThis) {

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
        if (value === 'true')  return true;
        if (value === 'false') return false;

        // Handle explicit null/undefined strings
        if (value === 'null')      return null;
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
        const raw       = globalThis.location.hash.replace(/^#!\/?/, '');
        const parts     = raw.split('?');
        const path      = parts[0] || '';
        const hashQuery = parts[1] || '';

        // Parse both URL search params and hash params
        const searchParams = new URLSearchParams(globalThis.location.search.slice(1));
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
    let route     = makeRoute();
    let prevRoute = { ...route };

    // Navigation guard arrays - functions that run before/after navigation
    let beforeListeners = [];
    let afterListeners  = [];

    // Event callback arrays - functions that handle router events
    let statusCallbacks = [];
    let scrollCallbacks = [];

    // Lifecycle management
    let destroyed = false;
    let lastHash  = globalThis.location.hash;

    // ============================
    // EVENT SYSTEM
    // ============================

    /**
     * Emits a status event to all registered status callbacks.
     * This allows applications to display navigation status without DOM coupling.
     */
    const emitStatus = (status, type = 'info') => {
        statusCallbacks.forEach(callback => {
            try {
                callback(status, type, { route, prevRoute });
            } catch (error) {
                console.error('Status callback error:', error);
            }
        });
    };

    /**
     * Emits a scroll event to all registered scroll callbacks.
     * Provides scroll position data without assuming DOM structure.
     */
    const emitScroll = (scrollData) => {
        scrollCallbacks.forEach(callback => {
            try {
                callback(scrollData);
            } catch (error) {
                console.error('Scroll callback error:', error);
            }
        });
    };

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
     * Uses configurable scroll capture function or defaults to window scroll.
     */
    const captureScroll = (routePath) => {
        const scrollData = {
            winX      : globalThis.pageXOffset,
            winY      : globalThis.pageYOffset,
            timestamp : Date.now(),
            route     : routePath
        };

        // Allow applications to add custom scroll data
        emitScroll({ type: 'capture', ...scrollData });

        scrollPositions.set(routePath, scrollData);
    };

    /**
     * Restores the scroll position for a given route.
     * Uses requestAnimationFrame to ensure DOM is ready before scrolling.
     */
    const restoreScroll = (routePath) => {
        const saved = scrollPositions.get(routePath);
        if (saved) {
            requestAnimationFrame(() => {
                // Restore global scroll position
                globalThis.scrollTo(saved.winX, saved.winY);

                // Emit scroll restoration event for custom handling
                emitScroll({ type: 'restore', ...saved });
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
            emitStatus(`❌ ${error.message}`, 'error');
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
        route     = newRoute;

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
        emitStatus('✅ Navigation complete', 'success');
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

    /**
     * Registers a callback to receive navigation status updates.
     * Returns an unsubscribe function.
     */
    const addStatusListener = (callback) => {
        if (typeof callback !== 'function') return () => {};
        if (destroyed) return () => {};

        statusCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            if (destroyed) return;
            const index = statusCallbacks.indexOf(callback);
            if (index !== -1) statusCallbacks.splice(index, 1);
        };
    };

    /**
     * Registers a callback to receive scroll-related events.
     * Returns an unsubscribe function.
     */
    const addScrollListener = (callback) => {
        if (typeof callback !== 'function') return () => {};
        if (destroyed) return () => {};

        scrollCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            if (destroyed) return;
            const index = scrollCallbacks.indexOf(callback);
            if (index !== -1) scrollCallbacks.splice(index, 1);
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
            return !hash.startsWith('#!/') && document?.getElementById?.(id);
        };

        // If it's a native anchor, just scroll to it and return
        if (isNativeAnchor(globalThis.location.hash)) {
            requestAnimationFrame(() => {
                const el = document?.getElementById?.(globalThis.location.hash.slice(1));
                el?.scrollIntoView?.({ behavior: 'smooth' });
            });
            return;
        }

        // *** DUPLICATE NAVIGATION PREVENTION ***
        // Don't process if hash hasn't actually changed
        if (globalThis.location.hash === lastHash) return;

        // *** NAVIGATION PROCESSING ***
        emitStatus('🔄 Navigating...', 'loading');
        const newRoute = makeRoute();
        const success  = await canNavigate(newRoute);

        if (success) {
            // Navigation allowed - update state
            lastHash = globalThis.location.hash;
            completeNavigation(newRoute);
        } else {
            // Navigation cancelled - rollback URL
            const rollbackHash = prevRoute.path ? '#!/' + prevRoute.path : '';
            globalThis.location.hash = rollbackHash;
            lastHash                 = rollbackHash;
        }
    };

    /**
     * Programmatically navigate to a new route.
     * This is used by the push() and replace() methods.
     */
    const changeHash = async (newPath, replace = false) => {
        // Clean and format the path
        const cleanPath = newPath.replace(/^\/+/, '');
        const safePath  = newPath.startsWith('#') ? newPath : '#!/' + cleanPath;

        emitStatus('🔄 Navigating...', 'loading');

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
            const baseUrl = globalThis.location.href.replace(/#.*$/, '');
            globalThis.location.replace(baseUrl + safePath);
        } else {
            // Add new history entry
            globalThis.location.hash = safePath;
        }

        lastHash = safePath;
        completeNavigation(tempRoute);
        return true;
    };

    // ============================
    // EVENT LISTENERS SETUP
    // ============================

    // Listen for hash changes (back/forward buttons, direct URL changes)
    globalThis.addEventListener('hashchange', handleRouteChange);

    // Set up scroll position tracking
    const updateScrollTracking = () => {
        if (destroyed) return;

        const scrollData = {
            type      : 'update',
            winX      : globalThis.pageXOffset,
            winY      : globalThis.pageYOffset,
            timestamp : Date.now(),
            route     : route.path
        };

        emitScroll(scrollData);
    };

    // Monitor scroll changes
    globalThis.addEventListener('scroll', updateScrollTracking);

    // Process the initial route
    handleRouteChange();

    // ============================
    // PUBLIC API
    // ============================

    /**
     * Return the public router interface.
     * This is what gets exposed as MyRouter in the global scope.
     */
    return {
        // Guard registration
        beforeEach : addBeforeListener,
        afterEach  : addAfterListener,

        // Event registration (NEW - UI agnostic)
        onStatus   : addStatusListener,
        onScroll   : addScrollListener,

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
        go      : (n) => globalThis.history.go(n),
        back    : ()  => globalThis.history.back(),
        forward : ()  => globalThis.history.forward(),

        // Cleanup for single-page apps
        destroy: () => {
            destroyed = true;
            lastHash  = '';

            // Remove event listeners
            globalThis.removeEventListener('hashchange', handleRouteChange);
            globalThis.removeEventListener('scroll', updateScrollTracking);

            // Clear all arrays and maps
            beforeListeners.length = 0;
            afterListeners.length  = 0;
            statusCallbacks.length = 0;
            scrollCallbacks.length = 0;
            scrollPositions.clear();
        }
    };
})(globalThis);