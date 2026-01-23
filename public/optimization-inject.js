/**
 * Rizo Performance Optimization Inject
 * - Disables telemetry/logs
 * - Click-to-play for non-YouTube videos
 * - Lazy loading for images
 */

(function () {
    // 1. Disable Telemetry & Logs
    if (window.console) {
        const noop = () => { };
        // Keep warn/error for some visibility, but kill heavy noise
        window.console.log = noop;
        window.console.debug = noop;
        window.console.info = noop;
        window.console.trace = noop;
    }

    // Disable common telemetry overrides if sites try to re-enable them
    window.__SENTRY__ = window.__SENTRY__ || { hub: { getCurrentClient: () => null } };

    // 2. Click-to-play for non-YouTube videos
    const setupClickToPlay = () => {
        if (window.location.hostname.includes('youtube.com')) return;

        const videos = document.querySelectorAll('video:not([data-rizo-optimized])');
        videos.forEach(video => {
            video.setAttribute('data-rizo-optimized', 'true');

            // Prevent auto-load
            if (video.autoplay) {
                video.autoplay = false;
                video.preload = 'none';

                // Visual indicator/overlay
                const overlay = document.createElement('div');
                overlay.style.cssText = `
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          z-index: 1000;
          backdrop-filter: blur(4px);
          font-family: sans-serif;
          font-size: 14px;
        `;
                overlay.innerHTML = '<span>▶ Performance Mode: Click to Play</span>';

                const parent = video.parentElement;
                if (parent) {
                    if (getComputedStyle(parent).position === 'static') {
                        parent.style.position = 'relative';
                    }
                    parent.appendChild(overlay);

                    overlay.onclick = (e) => {
                        e.stopPropagation();
                        overlay.remove();
                        video.preload = 'auto';
                        video.play();
                    };
                }
            }
        });
    };

    // 3. Image Lazy Loading
    const setupLazyLoading = () => {
        const images = document.querySelectorAll('img:not([loading])');
        images.forEach(img => {
            img.setAttribute('loading', 'lazy');
        });
    };

    // Run on load and on DOM changes
    const runOptimizations = () => {
        setupClickToPlay();
        setupLazyLoading();
    };

    function initObserver() {
        const targetNode = document.body || document.documentElement;
        if (!targetNode) {
            // If body isn't ready, retry in 50ms
            setTimeout(initObserver, 50);
            return;
        }

        const observer = new MutationObserver((mutations) => {
            runOptimizations();
        });

        observer.observe(targetNode, {
            childList: true,
            subtree: true
        });

        runOptimizations();
        console.log('[Rizo] Performance optimizations active.');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initObserver);
    } else {
        initObserver();
    }
})();
