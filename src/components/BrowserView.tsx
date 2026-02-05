import React, { useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { NewTab } from './NewTab';
import { ImageViewer } from './ImageViewer';
import { Settings } from './Settings';
import { safeWebViewAction } from '../lib/webview-utils';
import { ErrorBoundary } from './ErrorBoundary';
import { PermissionPopup } from './PermissionPopup';
import { FindBar } from './FindBar';
import { PasswordsPage } from './PasswordsPage';
import { ZoomBar } from './ZoomBar';
import { WhisperBar } from './WhisperBar';

interface BrowserViewProps {
    tabId: string;
    isActive: boolean;
    isVisible?: boolean;
    onMount: (webview: any) => void;
}

export const BrowserView: React.FC<BrowserViewProps> = ({ tabId, isActive, isVisible = true, onMount }) => {
    const webviewRef = useRef<any>(null);
    const zoomTimerRef = useRef<any>(null);
    const [isReady, setIsReady] = React.useState(false);
    const [isFindBarOpen, setIsFindBarOpen] = React.useState(false);
    const [findMatches, setFindMatches] = React.useState({ active: 0, total: 0 });
    const [zoomLevel, setZoomLevel] = React.useState(1);
    const [isZoomBarOpen, setIsZoomBarOpen] = React.useState(false);
    const [permissionReq, setPermissionReq] = React.useState<{
        permission: string;
        request: any;
        origin: string;
    } | null>(null);
    const [whisperSelection, setWhisperSelection] = React.useState<{
        text: string;
        x: number;
        y: number;
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
                (window as any).rizoAPI?.ipcRenderer.send('show-context-menu', e.params);
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

            const handleFoundInPage = (e: any) => {
                if (e.result) {
                    setFindMatches({
                        active: e.result.activeMatchOrdinal,
                        total: e.result.matches
                    });
                }
            };
            wv.addEventListener('found-in-page', handleFoundInPage);

            const handlePermissionRequest = (e: any) => {
                const origin = new URL(wv.getURL()).hostname;
                const permissions = useStore.getState().sitePermissions || {};

                // key: origin -> permission -> granted (true/false)
                if (permissions[origin] && permissions[origin][e.permission] === true) {
                    console.log(`Auto-allowing ${e.permission} for ${origin}`);
                    e.request.allow();
                    return;
                }

                console.log('Permission requested:', e.permission);
                setPermissionReq({
                    permission: e.permission,
                    request: e.request,
                    origin
                });
            };

            const handleIpcMessage = (e: any) => {
                console.log("[FRONTEND] Received IPC message:", e.channel, e.args);
                if (e.channel === 'selection-data') {
                    const { text, rect } = e.args[0];
                    if (!text || !rect) return;

                    const x = rect.left ?? rect.x ?? 0;
                    const y = rect.top ?? rect.y ?? 0;

                    const finalX = x;
                    const finalY = Math.max(10, y - 60);

                    console.log("[FRONTEND] Setting Whisper Selection:", { text, x: finalX, y: finalY });
                    setWhisperSelection({
                        text,
                        x: finalX,
                        y: finalY,
                        width: rect.width || 0,
                        height: rect.height || 0
                    } as any);
                } else if (e.channel === 'text-selection-cleared') {
                    console.log("[FRONTEND] Clearing selection");
                    setWhisperSelection(null);
                }
            };

            wv.addEventListener('permission-request', handlePermissionRequest);
            wv.addEventListener('ipc-message', handleIpcMessage);

            const handleBeforeInput = (e: any) => {
                const isControl = e.control || e.meta;
                const key = e.key.toLowerCase();

                // Get current shortcuts from store
                const settings = useStore.getState().settings;
                const paletteKey = settings.keybinds?.commandPalette || 'CommandOrControl+K';
                const ghostSearchKey = settings.keybinds?.ghostSearch || 'CommandOrControl+Space';

                // Helper to check match (simplified for renderer bridge)
                const isMatch = (shortcut: string, event: any) => {
                    const parts = shortcut.toLowerCase().split('+');
                    const needsCtrl = parts.includes('control') || parts.includes('ctrl') || parts.includes('commandorcontrol');
                    const needsShift = parts.includes('shift');
                    const needsAlt = parts.includes('alt');
                    const target = parts.find(p => !['control', 'ctrl', 'commandorcontrol', 'command', 'cmd', 'shift', 'alt', 'meta'].includes(p));

                    if (needsCtrl && !isControl) return false;
                    if (needsShift && !event.shift) return false;
                    if (needsAlt && !event.alt) return false;

                    if (target === 'space') return key === ' ' || key === 'space';
                    return key === target;
                };

                if (isMatch(paletteKey, e)) {
                    (window as any).rizoAPI?.triggerCommandPalette();
                } else if (isMatch(ghostSearchKey, e)) {
                    (window as any).rizoAPI?.triggerGhostSearch();
                }
            };

            wv.addEventListener('before-input-event', handleBeforeInput);

            return () => {
                wv.removeEventListener('did-start-loading', handleDidStartLoading);
                wv.removeEventListener('did-stop-loading', handleDidStopLoading);
                wv.removeEventListener('page-favicon-updated', handlePageFavicon);
                wv.removeEventListener('did-navigate', handleDidNavigate);
                wv.removeEventListener('did-navigate-in-page', handleDidNavigate);
                wv.removeEventListener('context-menu', handleContextMenu);
                wv.removeEventListener('mouseup', handleMouseUp);
                wv.removeEventListener('dom-ready', handleDomReady);
                wv.removeEventListener('found-in-page', handleFoundInPage);
                wv.removeEventListener('did-start-navigation', handleDidStartNavigation);
                wv.removeEventListener('did-navigate', injectAdBlockCSS);
                wv.removeEventListener('did-fail-load', handleDidFailLoad);
                wv.removeEventListener('permission-request', handlePermissionRequest);
                wv.removeEventListener('ipc-message', handleIpcMessage);
                wv.removeEventListener('before-input-event', handleBeforeInput);
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


        const ipc = (window as any).rizoAPI?.ipcRenderer;
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



            ipc.on('gemini-get-context', () => {
                if (!isActive || !webviewRef.current) return;
                const wv = webviewRef.current;
                try {
                    wv.executeJavaScript(`
                        (() => {
                            const title = document.title;
                            const url = window.location.href;
                            const paragraphs = Array.from(document.querySelectorAll('p')).map(p => p.innerText).join('\\n\\n');
                            const selection = window.getSelection().toString();
                            const content = selection || (paragraphs.length > 50 ? paragraphs : document.body.innerText);
                            return { title, url, content: content.substring(0, 5000) };
                        })()
                    `).then((data: any) => {
                        ipc.send('gemini-context-data', data);
                    }).catch((e: any) => console.error('Gemini extraction failed', e));
                } catch (e) { console.error('Gemini extraction failed', e); }
            });

            ipc.on('toggle-find-bar', () => {
                if (!isActive) return;
                setIsFindBarOpen(prev => !prev);
            });

            ipc.on('zoom-in', () => {
                if (!isActive) return;
                setIsZoomBarOpen(true);
                setZoomLevel(prev => {
                    const newLevel = Math.min(prev + 0.1, 3);
                    safeWebViewAction(webviewRef.current, (wv) => wv.setZoomFactor(newLevel));
                    return newLevel;
                });
                if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
                zoomTimerRef.current = setTimeout(() => setIsZoomBarOpen(false), 5000);
            });

            ipc.on('zoom-out', () => {
                if (!isActive) return;
                setIsZoomBarOpen(true);
                setZoomLevel(prev => {
                    const newLevel = Math.max(prev - 0.1, 0.3);
                    safeWebViewAction(webviewRef.current, (wv) => wv.setZoomFactor(newLevel));
                    return newLevel;
                });
                if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
                zoomTimerRef.current = setTimeout(() => setIsZoomBarOpen(false), 5000);
            });

            ipc.on('zoom-reset', () => {
                if (!isActive) return;
                setIsZoomBarOpen(true);
                setZoomLevel(1);
                safeWebViewAction(webviewRef.current, (wv) => wv.setZoomFactor(1));
                if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
                zoomTimerRef.current = setTimeout(() => setIsZoomBarOpen(false), 5000);
            });
        }

        return () => {
            if (ipc) {
                ipc.off('execute-browser-backward', onGoBack);
                ipc.off('execute-browser-forward', onGoForward);
                ipc.off('reload', onReload);
                ipc.off('go-back', onGoBack);
                ipc.off('go-forward', onGoForward);

                ipc.off('gemini-get-context');
                ipc.off('toggle-find-bar');
                ipc.off('zoom-in');
                ipc.off('zoom-out');
                ipc.off('zoom-reset');
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
    const isPasswordsPage = currentUrl === 'rizo://passwords';
    const imageSrc = isImageView ? new URL(currentUrl).searchParams.get('src') || '' : '';

    // Fetch preload path
    const [preloadPath, setPreloadPath] = React.useState<string>('');
    useEffect(() => {
        (window as any).rizoAPI?.ipcRenderer.invoke('get-preload-path').then(setPreloadPath);
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
        (window as any).rizoAPI?.ipcRenderer.on('navigation-feedback', onFeedback);
        return () => {
            (window as any).rizoAPI?.ipcRenderer.off('navigation-feedback', onFeedback);
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

    const partition = useStore.getState().isIncognito ? 'incognito' : (useStore.getState().activeProfileId ? `persist:profile_${useStore.getState().activeProfileId}` : 'persist:rizo');
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
                {!isImageView && !isSettingsPage && !isPasswordsPage && (
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
                        webpreferences="contextIsolation=yes, nodeIntegration=no, allowRunningInsecureContent=yes, sandbox=no, nativeWindowOpen=yes"
                        partition={partition}

                        allowpopups={"true" as any}
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

                {/* Passwords Page */}
                {isPasswordsPage && (
                    <div className="absolute inset-0 z-20 overflow-auto">
                        <PasswordsPage />
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

                {/* Find Bar */}
                <FindBar
                    isOpen={isFindBarOpen}
                    matches={findMatches}
                    onClose={() => {
                        setIsFindBarOpen(false);
                        safeWebViewAction(webviewRef.current, (wv) => {
                            wv.stopFindInPage('clearSelection');
                        });
                    }}
                    onFind={(text, forward) => {
                        safeWebViewAction(webviewRef.current, (wv) => {
                            wv.findInPage(text, { forward, findNext: true });
                        });
                    }}
                    onStopFind={() => {
                        // Keep highlights, just clear bar focus? Or clear all? 
                        // User usually expects highlights to clear on close.
                    }}
                />

                {/* Zoom Bar */}
                <ZoomBar
                    isOpen={isZoomBarOpen}
                    zoomLevel={zoomLevel}
                    onZoomIn={() => {
                        setZoomLevel(prev => {
                            const newLevel = Math.min(prev + 0.1, 3);
                            safeWebViewAction(webviewRef.current, (wv) => wv.setZoomFactor(newLevel));
                            return newLevel;
                        });
                    }}
                    onZoomOut={() => {
                        setZoomLevel(prev => {
                            const newLevel = Math.max(prev - 0.1, 0.3);
                            safeWebViewAction(webviewRef.current, (wv) => wv.setZoomFactor(newLevel));
                            return newLevel;
                        });
                    }}
                    onReset={() => {
                        setZoomLevel(1);
                        safeWebViewAction(webviewRef.current, (wv) => wv.setZoomFactor(1));
                    }}
                />

                {/* The Whisper Bar */}
                {whisperSelection && (
                    <WhisperBar
                        x={whisperSelection.x}
                        y={whisperSelection.y}
                        selectedText={whisperSelection.text}
                        onClose={() => {
                            setWhisperSelection(null);
                            // Optional: clear selection in webview?
                            safeWebViewAction(webviewRef.current, (wv) => {
                                wv.executeJavaScript(`window.getSelection().removeAllRanges()`);
                            });
                        }}
                    />
                )}
            </div>
        </ErrorBoundary>
    );
};
