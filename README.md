# 🚀 VanillaJS Router

> Enterprise-grade hash-based routing in pure vanilla JavaScript. Zero dependencies, UI-agnostic design, production-ready.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Size](https://img.shields.io/badge/Size-~4KB-green.svg)](https://github.com/robert-hoffmann/vanillajs-router)
[![Demo](https://img.shields.io/badge/Demo-Live-blue.svg)](https://robert-hoffmann.github.io/vanillajs-router)

A lightweight, bulletproof hash-based router built for modern web applications. Completely UI-agnostic with event-driven architecture, works with any framework or vanilla JavaScript. Inspired by Vue Router's elegant API, with enterprise-grade features and comprehensive error handling.

## ✨ Features

- **🎯 UI-agnostic design** - Zero DOM dependencies, works with any framework
- **📡 Event-driven architecture** - Clean pub/sub system for UI updates
- **🔧 Hash-bang routing** - URLs use `#!/` prefix for GitHub Pages compatibility
- **📦 Zero dependencies** - Pure vanilla JavaScript, no external libraries
- **🔢 Parameter arrays** - All params are consistently arrays for predictable handling
- **🔄 Automatic type coercion** - Strings → numbers/booleans conversion
- **🛡️ Async navigation guards** - beforeEach/afterEach hooks with cancellation support
- **📜 Scroll restoration** - Remembers scroll positions with extensible event system
- **⚓ Anchor coexistence** - Native `#section` links work alongside routing
- **🧠 Memory safe** - Proper cleanup prevents memory leaks
- **🧪 Testing friendly** - Easy to unit test without DOM manipulation
- **🎨 Vue Router API** - Familiar interface for Vue developers

## 📦 Installation

### Direct Download
```bash
# Download the router file
curl -O https://raw.githubusercontent.com/robert-hoffmann/vanillajs-router/master/router.min.js
```

### CDN
```html
<script src="https://cdn.jsdelivr.net/gh/robert-hoffmann/vanillajs-router@master/router.min.js"></script>
```

### npm (if published)
```bash
npm install vanillajs-router
```

## 🚀 Quick Start

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <nav>
        <a href="#!/home">Home</a>
        <a href="#!/about">About</a>
        <a href="#!/user?id=123&name=John">User</a>
    </nav>

    <div id="content">Loading...</div>
    <div id="status"></div>

    <script src="router.js"></script>
    <script>
        // Subscribe to router events for UI updates
        MyRouter.onStatus((status, type, context) => {
            document.getElementById('status').textContent = status;
            document.getElementById('status').className   = `status ${type}`;
        });

        // Set up route handling
        MyRouter.beforeEach((to, from) => {
            console.log('Navigating to:', to.path);
            updateContent(to);
        });

        function updateContent(route) {
            const content = document.getElementById('content');

            switch(route.path) {
                case 'home':
                    content.innerHTML = '<h1>Welcome Home!</h1>';
                    break;
                case 'about':
                    content.innerHTML = '<h1>About Us</h1>';
                    break;
                case 'user':
                    const [userId]    = route.params.id || ['unknown'];
                    const [userName]  = route.params.name || ['Guest'];
                    content.innerHTML = `<h1>User: ${userName} (ID: ${userId})</h1>`;
                    break;
                default:
                    content.innerHTML = '<h1>Page Not Found</h1>';
            }
        }
    </script>
</body>
</html>
```

## 📚 API Reference

### Core Methods

#### `MyRouter.beforeEach(callback)`
Register a navigation guard that runs before each route change.
```javascript
MyRouter.beforeEach(async (to, from) => {
    // Check authentication
    if (to.path === 'admin' && !isAuthenticated()) {
        throw new Error('Authentication required');
    }

    // Update page content
    updatePageContent(to);
});
```

#### `MyRouter.afterEach(callback)`
Register a hook that runs after each successful navigation.
```javascript
MyRouter.afterEach((to, from) => {
    // Analytics tracking
    analytics.track('page_view', { path: to.path });

    // Update page title
    document.title = `My App - ${to.path}`;
});
```

### Event System (NEW!)

#### `MyRouter.onStatus(callback)`
Subscribe to navigation status updates for UI feedback.
```javascript
MyRouter.onStatus((status, type, context) => {
    // status: "🔄 Navigating...", "✅ Navigation complete", etc.
    // type: 'info', 'loading', 'success', 'error'
    // context: { route, prevRoute }

    updateStatusDisplay(status, type);
});
```

#### `MyRouter.onScroll(callback)`
Subscribe to scroll events for custom scroll handling.
```javascript
MyRouter.onScroll((scrollData) => {
    if (scrollData.type === 'capture') {
        // Add custom scroll positions
        scrollData.customContainerY = myContainer.scrollTop;
    }

    if (scrollData.type === 'restore') {
        // Restore custom scroll positions
        if (scrollData.customContainerY !== undefined) {
            myContainer.scrollTop = scrollData.customContainerY;
        }
    }

    if (scrollData.type === 'update') {
        // Real-time scroll position updates
        updateScrollIndicator(scrollData.winX, scrollData.winY);
    }
});
```

### Navigation

#### `MyRouter.push(path)`
Navigate to a new route programmatically.
```javascript
// Simple navigation
await MyRouter.push('/dashboard');

// With parameters
await MyRouter.push('/user?id=456&tab=settings');

// Returns true if navigation succeeded, false if cancelled
```

#### `MyRouter.replace(path)`
Replace the current route without adding to history.
```javascript
await MyRouter.replace('/login');
```

### Route Information

#### `MyRouter.currentRoute()`
Get the current route object.
```javascript
const route = MyRouter.currentRoute();
console.log(route);
// {
//   path: "user",
//   params: { id: ["123"], name: ["John"] },
//   paramsTyped: { id: [123], name: ["John"] },
//   query: {},
//   queryTyped: {}
// }
```

#### `MyRouter.getTypedParams()` & `MyRouter.getTypedQuery()`
Get type-coerced parameters as convenient getters.
```javascript
const params    = MyRouter.getTypedParams();
const [userId]  = params.id || [0];        // 123 (number)
const [isAdmin] = params.admin || [false]; // true (boolean)
```

### History Control
```javascript
MyRouter.back();     // Go back one page
MyRouter.forward();  // Go forward one page
MyRouter.go(-2);     // Go back 2 pages
```

### Scroll Management
```javascript
// Manual scroll position management
MyRouter.saveScrollPosition();
MyRouter.restoreScrollPosition();
MyRouter.clearScrollHistory();
```

### Cleanup
```javascript
// Important: Call when destroying your app
MyRouter.destroy();
```

## 🔧 Advanced Usage

### Framework Integration

#### React Integration
```javascript
import { useEffect, useState } from 'react';

function useRouter() {
    const [route, setRoute]   = useState(MyRouter.currentRoute());
    const [status, setStatus] = useState('Ready');

    useEffect(() => {
        const unsubscribeRoute = MyRouter.beforeEach((to, from) => {
            setRoute(to);
        });

        const unsubscribeStatus = MyRouter.onStatus((status, type) => {
            setStatus(status);
        });

        return () => {
            unsubscribeRoute();
            unsubscribeStatus();
        };
    }, []);

    return { route, status, push: MyRouter.push };
}
```

#### Vue Integration
```javascript
// Vue 3 Composition API
import { ref, onMounted, onUnmounted } from 'vue';

export function useRouter() {
    const route = ref(MyRouter.currentRoute());
    const status = ref('Ready');

    let unsubscribeRoute, unsubscribeStatus;

    onMounted(() => {
        unsubscribeRoute = MyRouter.beforeEach((to, from) => {
            route.value  = to;
        });

        unsubscribeStatus = MyRouter.onStatus((statusText, type) => {
            status.value  = statusText;
        });
    });

    onUnmounted(() => {
        unsubscribeRoute?.();
        unsubscribeStatus?.();
    });

    return { route, status, push: MyRouter.push };
}
```

### Authentication Guards
```javascript
let user = null;

MyRouter.beforeEach(async (to, from) => {
    const protectedRoutes = ['dashboard', 'profile', 'admin'];

    if (protectedRoutes.includes(to.path)) {
        if (!user) {
            // Router emits: "❌ Authentication required"
            throw new Error('Authentication required');
        }
    }
});

// Handle auth failures in UI
MyRouter.onStatus((status, type) => {
    if (type === 'error' && status.includes('Authentication')) {
        showLoginModal();
    }
});
```

### Loading States with Events
```javascript
MyRouter.onStatus((status, type) => {
    const loader = document.getElementById('loader');

    if (type === 'loading') {
        loader.style.display = 'block';
    } else {
        loader.style.display = 'none';
    }
});

MyRouter.beforeEach(async (to, from) => {
    // Router automatically emits "🔄 Navigating..." status

    try {
        await loadPageData(to.path);
        updateContent(to);
        // Router automatically emits "✅ Navigation complete" status
    } catch (error) {
        // Router automatically emits error status
        throw error;
    }
});
```

### Custom Scroll Containers
```javascript
MyRouter.onScroll((scrollData) => {
    const containers = [
        { id: 'sidebar'     , key: 'sidebarY' },
        { id: 'main-content', key: 'mainY' },
        { id: 'chat-area'   , key: 'chatY' }
    ];

    containers.forEach(({ id, key }) => {
        const element = document.getElementById(id);
        if (!element) return;

        if (scrollData.type === 'capture') {
            // Save custom container scroll positions
            scrollData[key] = element.scrollTop;
        } else if (scrollData.type === 'restore' && scrollData[key] !== undefined) {
            // Restore custom container scroll positions
            element.scrollTop = scrollData[key];
        }
    });
});
```

### Parameter Handling
```javascript
// URL: #!/products?category=electronics&category=books&sort=price&featured=true

MyRouter.beforeEach((to, from) => {
    const { category, sort, featured } = to.paramsTyped;

    console.log(category);  // ["electronics", "books"] (array)
    console.log(sort);      // ["price"] (array)
    console.log(featured);  // [true] (boolean in array)

    // Extract first values
    const [sortBy]     = sort || ['name'];
    const [isFeatured] = featured || [false];
});
```

### Dynamic Route Building
```javascript
function navigateToUser(userId, tab = 'profile') {
    const params = new URLSearchParams();
    params.set('id' , userId);
    params.set('tab', tab);

    MyRouter.push(`/user?${params.toString()}`);
}

navigateToUser(123, 'settings');
// Navigates to: #!/user?id=123&tab=settings
```

## 🎯 Type Coercion Examples

The router automatically converts string parameters to appropriate JavaScript types:

| URL Parameter | Raw Value | Coerced Value | Type |
|---------------|-----------|---------------|------|
| `?count=42` | `"42"` | `42` | `number` |
| `?price=19.99` | `"19.99"` | `19.99` | `number` |
| `?active=true` | `"true"` | `true` | `boolean` |
| `?enabled=false` | `"false"` | `false` | `boolean` |
| `?data=null` | `"null"` | `null` | `null` |
| `?name=John` | `"John"` | `"John"` | `string` |

## 🛠️ Browser Support

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## 📱 GitHub Pages & Static Hosting

Perfect for static sites and GitHub Pages! Hash-based routing works without server configuration:

```javascript
// Works on GitHub Pages out of the box
// No .htaccess or server config needed
https://yourusername.github.io/myapp#!/dashboard?tab=analytics
```

## 🧪 Testing

The UI-agnostic design makes testing much easier:

```javascript
// Example unit test structure
describe('VanillaJS Router', () => {
    let statusEvents = [];
    let scrollEvents = [];

    beforeEach(() => {
        // Reset router state
        MyRouter.destroy();
        window.location.hash = '';
        statusEvents         = [];
        scrollEvents         = [];

        // Set up event monitoring
        MyRouter.onStatus((status, type) => {
            statusEvents.push({ status, type });
        });

        MyRouter.onScroll((scrollData) => {
            scrollEvents.push(scrollData);
        });
    });

    it('should navigate to route', async () => {
        await MyRouter.push('/test');
        expect(MyRouter.currentRoute().path).toBe('test');
        expect(statusEvents).toContainEqual({
            status: '✅ Navigation complete',
            type  : 'success'
        });
    });

    it('should coerce parameters', () => {
        window.location.hash = '#!/test?count=42&active=true';
        const params = MyRouter.getTypedParams();
        expect(params.count[0]).toBe(42);
        expect(params.active[0]).toBe(true);
    });

    it('should emit scroll events', () => {
        MyRouter.saveScrollPosition('test');
        expect(scrollEvents.some(e => e.type === 'capture')).toBe(true);
    });

    it('should handle navigation cancellation', async () => {
        MyRouter.beforeEach((to, from) => {
            if (to.path === 'forbidden') {
                throw new Error('Access denied');
            }
        });

        const success = await MyRouter.push('/forbidden');
        expect(success).toBe(false);
        expect(statusEvents).toContainEqual({
            status: '❌ Access denied',
            type  : 'error'
        });
    });
});
```

## 🎨 Live Demo

Check out the [interactive demo](https://robert-hoffmann.github.io/vanillajs-router) to see all features in action:

- 🏠 Multiple route examples with event-driven UI
- 📊 Parameter handling demonstrations
- 🔒 Authentication guard simulation with status events
- 📜 Scroll restoration testing with custom containers
- ⚓ Anchor link coexistence
- 🎯 Type coercion examples
- 📡 Real-time event monitoring

## 📖 Why This Router?

### Compared to other solutions:

| Feature | VanillaJS Router | Vue Router | React Router | Page.js |
|---------|------------------|------------|--------------|---------|
| Bundle Size | ~4KB | ~34KB | ~45KB | ~6KB |
| Dependencies | 0 | Vue required | React required | 0 |
| UI Framework | ✅ Agnostic | ❌ Vue only | ❌ React only | ✅ Agnostic |
| Event System | ✅ Built-in | ❌ Manual | ❌ Manual | ❌ Manual |
| Type Coercion | ✅ Built-in | ❌ Manual | ❌ Manual | ❌ Manual |
| Parameter Arrays | ✅ Consistent | ❌ Manual | ❌ Manual | ❌ Manual |
| Async Guards | ✅ Built-in | ✅ Built-in | ❌ Manual | ❌ Manual |
| Scroll Restoration | ✅ Built-in + Extensible | ✅ Built-in | ❌ Manual | ❌ Manual |
| Memory Management | ✅ Built-in | ✅ Built-in | ✅ Built-in | ⚠️ Manual |
| Testing | ✅ Easy (no DOM) | ⚠️ Requires Vue | ⚠️ Requires React | ✅ Easy |

### Key Advantages:

- **🎯 Framework Freedom**: Use with React, Vue, Angular, Svelte, or vanilla JS
- **🧪 Testing Friendly**: No DOM dependencies make unit testing straightforward
- **📡 Event-Driven**: Clean separation between routing logic and UI updates
- **🔄 SSR Compatible**: Can run in Node.js environments
- **🎨 Flexible**: Extend scroll handling, status displays, and navigation behavior

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by [Vue Router](https://router.vuejs.org/) for the elegant API design
- Hash-bang routing pattern from Google's AJAX crawling specification
- Community feedback and contributions
- Built with the help of AI collaborators:
  - Claude Sonnet 4 handled the coding implementation
  - OpenAI o3 provided critical thinking and architecture review
  - ~30 iterations of back-and-forth discussion to perfect the design

## 🔗 Related Projects

- [Vue Router](https://router.vuejs.org/) - Router for Vue.js applications
- [React Router](https://reactrouter.com/) - Router for React applications
- [Page.js](https://github.com/visionmedia/page.js/) - Lightweight router
- [Director](https://github.com/flatiron/director) - Another JavaScript router

---

**Made with ❤️ for the JavaScript community**

🆕 **v2.0**: Now completely UI-agnostic with event-driven architecture!

If this router helped you build something awesome, consider giving it a ⭐ star!