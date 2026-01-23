import React, { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { NewTab } from './NewTab';
import { ImageViewer } from './ImageViewer';
import { safeWebViewAction } from '../lib/webview-utils';
import { ErrorBoundary } from './ErrorBoundary';

interface BrowserViewProps {
    tabId: string;
    isActive: boolean;
    onMount: (webview: any) => void;
}

export const BrowserView: React.FC<BrowserViewProps> = ({ tabId, isActive, onMount }) => {
    const webviewRef = useRef<any>(null);
    const [isReady, setIsReady] = React.useState(false);
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

            const handleDomReady = () => setIsReady(true);

            wv.addEventListener('did-start-loading', handleDidStartLoading);
            wv.addEventListener('did-stop-loading', handleDidStopLoading);
            wv.addEventListener('page-favicon-updated', handlePageFavicon);
            wv.addEventListener('did-navigate', handleDidNavigate);
            wv.addEventListener('dom-ready', handleDomReady);

            const handleMouseUp = (e: any) => {
                if (e.button === 3 && wv.canGoBack()) {
                    safeWebViewAction(wv, (w) => w.goBack());
                } else if (e.button === 4 && wv.canGoForward()) {
                    safeWebViewAction(wv, (w) => w.goForward());
                }
            };

            wv.addEventListener('did-navigate-in-page', handleDidNavigate);
            wv.addEventListener('context-menu', handleContextMenu);
            wv.addEventListener('mouseup', handleMouseUp);

            return () => {
                wv.removeEventListener('did-start-loading', handleDidStartLoading);
                wv.removeEventListener('did-stop-loading', handleDidStopLoading);
                wv.removeEventListener('page-favicon-updated', handlePageFavicon);
                wv.removeEventListener('did-navigate', handleDidNavigate);
                wv.removeEventListener('did-navigate-in-page', handleDidNavigate);
                wv.removeEventListener('context-menu', handleContextMenu);
                wv.removeEventListener('mouseup', handleMouseUp);
                wv.removeEventListener('dom-ready', handleDomReady);
            };
        }
    }, [onMount, tabId]);

    // Handle IPC Commands (Back/Forward from Mouse/Menu)
    useEffect(() => {
        if (!isActive) return;

        const onGoBack = () => {
            safeWebViewAction(webviewRef.current, (wv) => {
                if (wv.canGoBack()) wv.goBack();
            });
        };
        const onGoForward = () => {
            safeWebViewAction(webviewRef.current, (wv) => {
                if (wv.canGoForward()) wv.goForward();
            });
        };
        const onReload = () => {
            safeWebViewAction(webviewRef.current, (wv) => wv.reload());
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
            safeWebViewAction(wv, (w) => {
                const currentWvUrl = w.getURL();
                if (currentWvUrl !== currentUrl && isActive) {
                    w.loadURL(currentUrl);
                }
            });
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
        if (e.button === 3) {
            safeWebViewAction(webviewRef.current, (wv) => {
                if (wv.canGoBack()) {
                    wv.goBack();
                    triggerNavFeedback('back');
                }
            });
        } else if (e.button === 4) {
            safeWebViewAction(webviewRef.current, (wv) => {
                if (wv.canGoForward()) {
                    wv.goForward();
                    triggerNavFeedback('forward');
                }
            });
        }
    };

    const partition = useStore.getState().isIncognito ? 'incognito' : (useStore.getState().activeProfileId ? `persist:profile_${useStore.getState().activeProfileId}` : 'persist:default');
    const isGhostSearchOpen = useStore.getState().isGhostSearchOpen;

    return (
        <ErrorBoundary name={`Tab ${tabId}`}>
            <div
                className={cn(
                    "flex-1 relative w-full h-full bg-background transition-all duration-300",
                    isActive ? "visible opacity-100" : "invisible opacity-0 pointer-events-none absolute inset-0"
                )}
                onMouseUp={handleContainerMouseUp}
            >
                {/* Webview */}
                {!isImageView && (
                    <webview
                        ref={webviewRef as any}
                        key={useStore.getState().activeProfileId || 'default'}
                        className={cn(
                            "w-full h-full",
                            showNewTab ? "hidden" : "flex",
                            isGhostSearchOpen && "pointer-events-none"
                        )}
                        src="about:blank"
                        preload={preloadPath ? `file://${preloadPath.replace(/\\/g, '/')}` : undefined}
                        webpreferences="contextIsolation=yes, nodeIntegration=no"
                        partition={partition}
                        {...({
                            allowpopups: "true"
                        } as any)}
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
        </ErrorBoundary>
    );
};
