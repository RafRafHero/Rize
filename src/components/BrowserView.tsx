import React, { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { NewTab } from './NewTab';
import { ImageViewer } from './ImageViewer';

interface BrowserViewProps {
    tabId: string;
    isActive: boolean;
    onMount: (webview: any) => void;
}

export const BrowserView: React.FC<BrowserViewProps> = ({ tabId, isActive, onMount }) => {
    const webviewRef = useRef<any>(null);
    const { updateTab, tabs, triggerNavFeedback, addTab, recordVisit } = useStore();

    const tab = tabs.find(t => t.id === tabId);
    const currentUrl = tab?.url || '';

    useEffect(() => {
        if (webviewRef.current) {
            onMount(webviewRef.current);

            const wv = webviewRef.current;

            const handleDidStartLoading = () => updateTab(tabId, { isLoading: true });
            const handleDidStopLoading = () => {
                const title = (wv.getTitle() === 'about:blank' || !wv.getTitle()) && (!currentUrl || currentUrl === 'about:blank') ? 'Home' : wv.getTitle();
                updateTab(tabId, {
                    isLoading: false,
                    canGoBack: wv.canGoBack(),
                    canGoForward: wv.canGoForward(),
                    title
                });

                // Record visit
                const url = wv.getURL();
                if (url && url !== 'about:blank' && !url.startsWith('rizo://')) {
                    recordVisit(url, title, tab?.favicon);
                }
            };

            const handlePageFavicon = (e: any) => {
                if (e.favicons && e.favicons.length > 0) {
                    updateTab(tabId, { favicon: e.favicons[0] });
                }
            };

            const handleDidNavigate = (e: any) => {
                if (e.url !== currentUrl && !e.url.startsWith('data:') && e.url !== 'about:blank') {
                    updateTab(tabId, { url: e.url });
                }
            };

            const handleContextMenu = (e: any) => {
                // e.params contains the context menu info
                (window as any).electron?.ipcRenderer.send('show-context-menu', e.params);
            };

            wv.addEventListener('did-start-loading', handleDidStartLoading);
            wv.addEventListener('did-stop-loading', handleDidStopLoading);
            wv.addEventListener('page-favicon-updated', handlePageFavicon);
            wv.addEventListener('did-navigate', handleDidNavigate);

            const handleMouseUp = (e: any) => {
                // Mouse buttons: 0=Left, 1=Middle, 2=Right, 3=Back, 4=Forward
                if (e.button === 3 && wv.canGoBack()) {
                    wv.goBack();
                } else if (e.button === 4 && wv.canGoForward()) {
                    wv.goForward();
                }
            };

            wv.addEventListener('did-start-loading', handleDidStartLoading);
            wv.addEventListener('did-stop-loading', handleDidStopLoading);
            wv.addEventListener('page-favicon-updated', handlePageFavicon);
            wv.addEventListener('did-navigate', handleDidNavigate);
            wv.addEventListener('did-navigate-in-page', handleDidNavigate);
            wv.addEventListener('context-menu', handleContextMenu);
            wv.addEventListener('mouseup', handleMouseUp); // This listens on the webview container element? 
            // Note: webview tag doesn't expose 'mouseup' directly in the same way as standard DOM.
            // We might need to listen on the container div or inject script.
            // BUT: "mousedown" / "mouseup" on <webview> do fire for events that bubble up or specific implementation.
            // Actually, in Electron <webview>, we might need to listen to 'ipc-message' if we inject a preload.
            // But let's try the container div wrapper first?
            // Actually the `BrowserView` wrapper div is where we can catch bubbles?
            // Events inside webview don't bubble out to the embedder DOM usually.
            // We rely on the `app-command` in main.ts generally.
            // But let's keeping this logic here *if* we attach it to the wrapper div:
            // The wrapper div event listener: see below in JSX return.

            return () => {
                wv.removeEventListener('did-start-loading', handleDidStartLoading);
                wv.removeEventListener('did-stop-loading', handleDidStopLoading);
                wv.removeEventListener('page-favicon-updated', handlePageFavicon);
                wv.removeEventListener('did-navigate', handleDidNavigate);
                wv.removeEventListener('did-navigate-in-page', handleDidNavigate);
                wv.removeEventListener('context-menu', handleContextMenu);
                wv.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [onMount, tabId]);

    // Handle IPC Commands (Back/Forward from Mouse/Menu)
    useEffect(() => {
        if (!isActive) return;

        const onGoBack = () => {
            if (webviewRef.current?.canGoBack()) {
                webviewRef.current.goBack();
            }
        };
        const onGoForward = () => {
            if (webviewRef.current?.canGoForward()) {
                webviewRef.current.goForward();
            }
        };
        const onReload = () => {
            webviewRef.current?.reload();
        };

        // Listen for open new tab requests from main process
        const onCreateTab = (_: any, { url }: { url: string }) => {
            addTab(url);
        };

        const ipc = (window as any).electron?.ipcRenderer;
        if (ipc) {
            ipc.on('execute-browser-backward', onGoBack);
            ipc.on('execute-browser-forward', onGoForward);
            ipc.on('reload', onReload);
            // Also listen to old 'go-back' if sent from context menu?
            // Context menu currently sends 'go-back' in main.ts.
            // We should update main.ts context menu to send 'execute-browser-backward' too for consistency?
            // Or just listen to both.
            ipc.on('go-back', onGoBack);
            ipc.on('go-forward', onGoForward);
            ipc.on('go-back', onGoBack);
            ipc.on('go-forward', onGoForward);

            ipc.on('create-tab', onCreateTab);
        }

        return () => {
            if (ipc) {
                ipc.off('execute-browser-backward', onGoBack);
                ipc.off('execute-browser-forward', onGoForward);
                ipc.off('reload', onReload);
                ipc.off('go-back', onGoBack);
                ipc.off('go-forward', onGoForward);
                ipc.off('create-tab', onCreateTab); // Note: onCreateTab needs to be defined outside or refs used if we want to remove strictly
            }
        };
    }, [isActive, addTab]);

    // Sync URL changes from Store -> Webview
    useEffect(() => {
        const wv = webviewRef.current;
        if (wv && currentUrl) {
            const currentWvUrl = wv.getURL();
            if (currentWvUrl !== currentUrl && isActive) {
                wv.loadURL(currentUrl);
            }
        }
        // Focus webview when active
        if (isActive && wv) {
            // Short timeout to ensure it's mounted/visible
            setTimeout(() => {
                try {
                    wv.focus();
                } catch (e) {
                    // ignore
                }
            }, 50);
        }
    }, [currentUrl, isActive]);

    const showNewTab = !currentUrl || currentUrl === '';
    const isImageView = currentUrl.startsWith('rizo://view-image');
    const imageSrc = isImageView ? new URL(currentUrl).searchParams.get('src') || '' : '';

    // Fetch preload path
    const [preloadPath, setPreloadPath] = React.useState<string>('');
    useEffect(() => {
        (window as any).electron?.ipcRenderer.invoke('get-preload-path').then(setPreloadPath);
    }, []);

    // Navigation Feedback State
    const [navFeedback, setNavFeedback] = React.useState<'back' | 'forward' | null>(null);

    // Listen for navigation feedback from Main process
    // Listen for navigation feedback from Main process
    useEffect(() => {
        const onFeedback = (_: any, type: 'back' | 'forward') => {
            // setNavFeedback(type); // Local state removed in favor of global store for Navbar sync
            // setTimeout(() => setNavFeedback(null), 600); 
            triggerNavFeedback(type);
        };
        (window as any).electron?.ipcRenderer.on('navigation-feedback', onFeedback);
        return () => {
            (window as any).electron?.ipcRenderer.off('navigation-feedback', onFeedback);
        };
    }, []);

    const handleContainerMouseUp = (e: React.MouseEvent) => {
        if (!webviewRef.current) return;
        if (e.button === 3 && webviewRef.current.canGoBack()) {
            webviewRef.current.goBack();
            triggerNavFeedback('back');
        } else if (e.button === 4 && webviewRef.current.canGoForward()) {
            webviewRef.current.goForward();
            triggerNavFeedback('forward');
        }
    };

    return (
        <div
            className="flex-1 relative w-full h-full bg-background"
            onMouseUp={handleContainerMouseUp}
        >
            {/* Navigation Feedback Overlay */}
            {/* Navigation Feedback Overlay - OPTIONAL: keep or remove? 
                The user asked for "bouncy" feedback on the buttons, which is now in Navbar. 
                I'll leave this here but it might be redundant. Let's comment it out or leave it as extra feedback.
                Actually, let's remove the visual overlay here to focus on the Navbar buttons as requested.
             */}
            {/* {navFeedback && (...)} */}

            {/* Webview */}
            {/* key={preloadPath} forces remount if path changes, ensures preload is applied */}
            {/* Webview */}
            {/* key={preloadPath} forces remount if path changes, ensures preload is applied */}
            {!isImageView && (
                <webview
                    ref={webviewRef as any}
                    key={preloadPath}
                    className={cn("w-full h-full", showNewTab ? "hidden" : "flex")}
                    src="about:blank"
                    preload={preloadPath ? `file://${preloadPath.replace(/\\/g, '/')}` : undefined}
                    webpreferences="contextIsolation=yes, nodeIntegration=no"
                    partition={useStore.getState().isIncognito ? 'incognito' : (useStore.getState().activeProfileId ? `persist:profile_${useStore.getState().activeProfileId}` : undefined)}
                    {...({ allowpopups: "true" } as any)}
                />
            )}

            {/* Image Viewer Overlay */}
            {isImageView && (
                <div className="absolute inset-0 z-20 overflow-hidden bg-background">
                    <ImageViewer src={imageSrc} />
                </div>
            )}

            {/* New Tab Overlay */}
            {showNewTab && (
                <div className="absolute inset-0 z-20 overflow-auto">
                    <NewTab tabId={tabId} />
                </div>
            )}
        </div>
    );
};
