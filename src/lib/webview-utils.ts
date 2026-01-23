/**
 * Safely executes a command on an Electron WebView, ensuring it is ready.
 * @param webview THE webview element
 * @param action A callback that performs the action on the webview
 */
export const safeWebViewAction = (webview: any, action: (wv: any) => void) => {
    if (!webview) return;

    const execute = () => {
        try {
            action(webview);
        } catch (e) {
            console.error('[safeWebViewAction] Execution failed:', e);
        }
    };

    // If attached and ready, run immediately
    let isInitialized = false;
    try {
        isInitialized = !!webview.getWebContentsId(); // Call as function if it's a function, or check property
    } catch (e) {
        isInitialized = false;
    }

    if (isInitialized && !webview.isLoading()) {
        execute();
    } else {
        // Otherwise wait for dom-ready
        const onReady = () => {
            webview.removeEventListener('dom-ready', onReady);
            execute();
        };
        webview.addEventListener('dom-ready', onReady);
    }
};
