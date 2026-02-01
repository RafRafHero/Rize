import React, { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { NewTab } from './NewTab';
import { ImageViewer } from './ImageViewer';
import { Settings } from './Settings';
import { safeWebViewAction } from '../lib/webview-utils';
import { ErrorBoundary } from './ErrorBoundary';
import { PermissionPopup } from './PermissionPopup';

interface BrowserViewProps {
    tabId: string;
    isActive: boolean;
    isVisible?: boolean;
    onMount: (webview: any) => void;
}

export const BrowserView: React.FC<BrowserViewProps> = ({ tabId, isActive, isVisible = true, onMount }) => {
    const webviewRef = useRef<any>(null);
    const [isReady, setIsReady] = React.useState(false);
    const [permissionReq, setPermissionReq] = React.useState<{
        permission: string;
        request: any;
        origin: string;
    } | null>(null);
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
                    // Clear thumbnail on navigation so we don't show stale data
                    updateTab(tabId, { url: e.url, thumbnailUrl: undefined });
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

            const adHideCSS = `
                .video-ads, .ytp-ad-module, .ytp-ad-image-overlay, 
                .ytp-ad-skip-button-slot, .ytd-promoted-sparkles-web-renderer,
                .ytp-ad-overlay-container, .ytp-ad-message-container, #player-ads, ytd-ad-slot-renderer {
                    display: none !important;
                }
            `;

            const injectAdBlockCSS = () => {
                if (wv.getURL().includes('youtube.com')) {
                    wv.insertCSS(adHideCSS);
                }
            };

            const handleDidStartNavigation = () => injectAdBlockCSS();
            const handleDidFailLoad = (e: any) => {
                if (e.errorCode === -3) return; // Ignore "Aborted" (caused by adblocker)
            };

            wv.addEventListener('did-start-navigation', handleDidStartNavigation);
            wv.addEventListener('did-navigate', injectAdBlockCSS);
            wv.addEventListener('did-fail-load', handleDidFailLoad);

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

            const handlePermissionRequest = (e: any) => {
                const origin = new URL(wv.getURL()).hostname;
                const permissions = useStore.getState().sitePermissions || {};

                // key: origin -> permission -> granted (true/false)
                if (permissions[origin] && permissions[origin][e.permission] === true) {
                    console.log(`Auto-allowing ${e.permission} for ${origin}`);
                    e.request.allow();
                    return;
                }

                // If explicitly denied previously, we might want to auto-deny or still ask?
                // Standard browser behavior is usually to remember Deny too.
                // For now, let's just asking if not explicitly allowed.

                console.log('Permission requested:', e.permission);
                setPermissionReq({
                    permission: e.permission,
                    request: e.request,
                    origin
                });
            };

            wv.addEventListener('permission-request', handlePermissionRequest);

            return () => {
                wv.removeEventListener('did-start-loading', handleDidStartLoading);
                wv.removeEventListener('did-stop-loading', handleDidStopLoading);
                wv.removeEventListener('page-favicon-updated', handlePageFavicon);
                wv.removeEventListener('did-navigate', handleDidNavigate);
                wv.removeEventListener('did-navigate-in-page', handleDidNavigate);
                wv.removeEventListener('context-menu', handleContextMenu);
                wv.removeEventListener('mouseup', handleMouseUp);
                wv.removeEventListener('dom-ready', handleDomReady);
                wv.removeEventListener('did-start-navigation', handleDidStartNavigation);
                wv.removeEventListener('did-navigate', injectAdBlockCSS);
                wv.removeEventListener('did-fail-load', handleDidFailLoad);
                wv.removeEventListener('permission-request', handlePermissionRequest);
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

            // Gemini Context Extraction
            ipc.on('gemini-get-context', () => {
                if (!isActive || !webviewRef.current) return;
                const wv = webviewRef.current;

                try {
                    // Execute script to get clean text
                    wv.executeJavaScript(`
                        (() => {
                            const title = document.title;
                            const url = window.location.href;
                            // Basic content extraction: get text from paragraphs to avoid navigation/ads noise
                            const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.innerText).join('\\n\\n');
                            const selection = window.getSelection().toString();
                            
                            // Fallback if no paragraphs found, just take body text but limit it
                            const rawText = document.body.innerText;
                            const content = selection || (paragraphs.length > 50 ? paragraphs : rawText);
                            
                            return {
                                title,
                                url,
                                content: content.substring(0, 5000) // Limit to 5000 chars
                            };
                        })()
                    `).then((data: any) => {
                        ipc.send('gemini-context-data', data);
                    }).catch((e: any) => console.error('Failed to extract context for Gemini', e));
                } catch (e) {
                    console.error('Gemini extraction failed', e);
                }
            });
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

    // Focus webview when active
    useEffect(() => {
        if (isActive && webviewRef.current) {
            setTimeout(() => {
                try {
                    webviewRef.current.focus();
                } catch (e) { }
            }, 50);
        }
    }, [isActive]);

    // Snapshot Logic: Capture when switching AWAY from this tab
    const prevActiveRef = useRef(isActive);
    useEffect(() => {
        if (prevActiveRef.current && !isActive && webviewRef.current) {
            const wv = webviewRef.current;
            // distinct non-blocking capture
            requestAnimationFrame(() => {
                try {
                    if (wv && wv.capturePage) {
                        wv.capturePage().then((image: any) => {
                            if (image && !image.isEmpty()) {
                                updateTab(tabId, { thumbnailUrl: image.toDataURL() });
                            }
                        }).catch((e: any) => console.error('Snapshot failed', e));
                    }
                } catch (e) { }
            });
        }
        prevActiveRef.current = isActive;
    }, [isActive, tabId, updateTab]);

    const showNewTab = !currentUrl || currentUrl === '';
    const isImageView = currentUrl.startsWith('rizo://view-image');
    const isSettingsPage = currentUrl === 'rizo://settings';
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
                    "flex-1 relative w-full h-full bg-transparent transition-all duration-300",
                    isVisible ? "visible opacity-100" : "invisible opacity-0 pointer-events-none absolute inset-0"
                )}
                onMouseUp={handleContainerMouseUp}
            >
                {/* Webview or Internal Pages */}
                {!isImageView && !isSettingsPage && (
                    <webview
                        ref={webviewRef as any}
                        key={useStore.getState().activeProfileId || 'default'}
                        className={cn(
                            "w-full h-full",
                            showNewTab ? "hidden" : "flex",
                            isGhostSearchOpen && "pointer-events-none"
                        )}
                        src={currentUrl || 'about:blank'}
                        preload={preloadPath ? `file://${preloadPath.replace(/\\/g, '/')}` : undefined}
                        webpreferences="contextIsolation=yes, nodeIntegration=no, allowRunningInsecureContent=yes"
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
                {showNewTab && !isSettingsPage && (
                    <div className="absolute inset-0 z-20 overflow-auto">
                        <NewTab tabId={tabId} />
                    </div>
                )}

                {/* Settings Page */}
                {isSettingsPage && (
                    <div className="absolute inset-0 z-20 overflow-auto bg-background">
                        <Settings />
                    </div>
                )}

                <PermissionPopup
                    request={permissionReq}
                    onAllow={() => {
                        if (permissionReq) {
                            permissionReq.request.allow();
                            setPermissionReq(null);
                        }
                    }}
                    onAllowAlways={() => {
                        if (permissionReq) {
                            permissionReq.request.allow();
                            // Update Store
                            useStore.getState().setSitePermission(
                                permissionReq.origin,
                                permissionReq.permission,
                                true
                            );
                            setPermissionReq(null);
                        }
                    }}
                    onDeny={() => {
                        if (permissionReq) {
                            permissionReq.request.deny();
                            setPermissionReq(null);
                        }
                    }}
                />
            </div>
        </ErrorBoundary>
    );
};
