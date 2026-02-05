import React, { useRef, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { BrowserView } from './components/BrowserView';
import { Settings } from './components/Settings';
import { Sidebar } from './components/Sidebar';
import { MouseEffects } from './components/MouseEffects';
import { BookmarksBar } from './components/BookmarksBar';
import { DownloadsPage } from './components/DownloadsPage';
import { useStore, initStore } from './store/useStore';
import { cn } from './lib/utils';
import { AnimatedBackground } from './components/AnimatedBackground';
import { ProfileSelector } from './components/ProfileSelector';
import { GeminiPanel } from './components/GeminiPanel';
import { HistoryPage } from './components/HistoryPage';
import { PasswordPrompt } from './components/PasswordPrompt';
import { GeminiIcon } from './components/GeminiIcon';
import { GhostSearch } from './components/GhostSearch';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlassCardsOverlay } from './components/GlassCardsOverlay';
import { OnboardingOverlay } from './components/OnboardingOverlay';
import { CommandPalette } from './components/CommandPalette';
import { Sparkles } from 'lucide-react';

function App() {
  const { tabs, activeTabId, setActiveTab, updateTab, addTab, settings, addDownload, updateDownload, completeDownload, selectionMode, activeInternalPage, setInternalPage, clearCapturedPassword, toggleGlassCards, isGlassCardsOverviewOpen, setUpdateReady, sleepTab, wakeTab, toast } = useStore();

  const [showDefaultBanner, setShowDefaultBanner] = useState(false);

  useEffect(() => {
    const ipc = (window as any).rizoAPI?.ipcRenderer;
    if (ipc) {
      ipc.on('update-ready', () => {
        setUpdateReady(true);
      });

      ipc.on('prompt-save-password', (_event: any, data: any) => {
        try {
          const domain = new URL(data.url).hostname;
          const never = useStore.getState().settings.neverSavePasswords || [];
          if (!never.includes(domain)) {
            useStore.setState({ capturedPassword: data });
          }
        } catch (e) {
          useStore.setState({ capturedPassword: data });
        }
      });

      // Tab Sleep IPC listener
      ipc.on('sleep-tab', (_event: any, tabId: string) => {
        sleepTab(tabId);
      });

      // Ghost Search IPC listener
      ipc.on('trigger-ghost-search', (_event: any, open?: boolean) => {
        useStore.getState().toggleGhostSearch(open);
      });

      // Command Palette IPC listener
      ipc.on('trigger-command-palette', (_event: any, open?: boolean) => {
        console.log("Shortcut Received: Opening Palette", open);
        useStore.getState().showToast("Shortcut: Opening Palette", "info");
        useStore.getState().toggleCommandPalette(open);
      });

      // Tabs Showcase IPC listener
      ipc.on('toggle-tabs-showcase', (_event: any, open?: boolean) => {
        useStore.getState().toggleGlassCards(open);
      });


      // Deep link: open URL in new tab
      ipc.on('open-url', (_event: any, url: string) => {
        addTab(url);
      });

      ipc.on('create-tab', (_event: any, { url }: { url: string }) => {
        addTab(url);
      });
    }

    // Check if Rizo is the default browser
    (window as any).rizoAPI?.isDefaultBrowser?.().then((isDefault: boolean) => {
      if (!isDefault) {
        setShowDefaultBanner(true);
      }
    });
  }, []);

  // Notify main process when active tab changes (for Tab Sleep tracking)
  useEffect(() => {
    const ipc = (window as any).rizoAPI?.ipcRenderer;
    if (ipc && activeTabId) {
      // Wake the tab if it was sleeping
      const activeTab = tabs.find(t => t.id === activeTabId);
      if (activeTab?.isSleeping) {
        wakeTab(activeTabId);
        ipc.send('wake-tab', activeTabId);
      }
      // Notify main process of tab access
      ipc.send('tab-accessed', activeTabId);
    }
  }, [activeTabId, tabs, wakeTab]);

  const webviewRefs = useRef<{ [key: string]: any }>({});

  // Glass Cards Hotkey (Ctrl+Shift+T)
  useEffect(() => {
    const matchShortcut = (e: KeyboardEvent, shortcut: string) => {
      const parts = shortcut.toLowerCase().split('+');
      const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;

      const hasCmdOrCtrl = parts.includes('commandorcontrol');
      const needsCtrl = parts.includes('control') || parts.includes('ctrl') || (hasCmdOrCtrl && !isMac);
      const needsMeta = parts.includes('command') || parts.includes('cmd') || parts.includes('meta') || (hasCmdOrCtrl && isMac);
      const needsShift = parts.includes('shift');
      const needsAlt = parts.includes('alt');
      const targetKey = parts.find(p => !['control', 'ctrl', 'commandorcontrol', 'command', 'cmd', 'shift', 'alt', 'meta'].includes(p));

      const ctrlActive = e.ctrlKey;
      const metaActive = e.metaKey;
      const shiftActive = e.shiftKey;
      const altActive = e.altKey;

      if (needsCtrl && !ctrlActive) return false;
      if (needsMeta && !metaActive) return false;
      if (needsShift && !shiftActive) return false;
      if (needsAlt && !altActive) return false;

      if (targetKey) {
        const tk = targetKey.toLowerCase();
        const currentKey = e.key.toLowerCase();
        const currentCode = e.code.toLowerCase();

        // Special case: Space
        if ((tk === 'space' || tk === ' ') && e.key === ' ') {
          // match
        } else {
          // Match by key (e.g., "k") or by physical code (e.g., "keyk")
          const keyMatch = currentKey === tk;
          const codeMatch = currentCode === tk || currentCode === `key${tk} ` || currentCode === `digit${tk} `;

          if (!keyMatch && !codeMatch) return false;
        }
      }

      return true;
    };

    // Keydown listener in App.tsx is now mostly redundant for primary shortcuts
    // as it is handled by the main process and webview focus bridge.

  }, [toggleGlassCards, updateTab, settings]);

  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    initStore().then(() => {
      const isIncognito = window.location.search.includes('incognito=true');
      if (isIncognito) {
        useStore.setState({ isIncognito: true });
        document.documentElement.classList.add('mode-midnight');
      } else {
        // Apply Global Mode Classes based on settings after initStore
        const currentSettings = useStore.getState().settings;
        const mode = currentSettings.homePageConfig?.mode;
        document.documentElement.classList.remove('mode-day', 'mode-night', 'mode-sunset', 'mode-midnight'); // Remove all possible modes first
        if (mode) {
          document.documentElement.classList.add(`mode-${mode}`);
        } else if (currentSettings.theme === 'dark') {
          document.documentElement.classList.add('mode-night');
        } else {
          // Default to day mode if no specific mode and not dark
          document.documentElement.classList.add('mode-day');
        }
      }
    });
  }, []);

  // Listen for Download IPC
  useEffect(() => {
    const onDownloadStarted = (_: any, item: any) => {
      if (item && item.id) addDownload(item);
    };

    const onDownloadProgress = (_: any, item: any) => {
      if (item && item.id) updateDownload(item.id, item);
    };

    const onDownloadComplete = (_: any, item: any) => {
      if (item && item.id) completeDownload(item);
    };

    (window as any).rizoAPI?.ipcRenderer.on('download-started', onDownloadStarted);
    (window as any).rizoAPI?.ipcRenderer.on('download-progress', onDownloadProgress);
    (window as any).rizoAPI?.ipcRenderer.on('download-complete', onDownloadComplete);

    return () => {
      (window as any).rizoAPI?.ipcRenderer.off('download-started', onDownloadStarted);
      (window as any).rizoAPI?.ipcRenderer.off('download-progress', onDownloadProgress);
      (window as any).rizoAPI?.ipcRenderer.off('download-complete', onDownloadComplete);
    };
  }, [addDownload, updateDownload, completeDownload]);

  const handleReload = () => {
    const wv = webviewRefs.current[activeTabId];
    if (wv) wv.reload();
  };

  const handleBack = () => {
    const wv = webviewRefs.current[activeTabId];
    if (wv && wv.canGoBack()) wv.goBack();
  };

  const handleForward = () => {
    const wv = webviewRefs.current[activeTabId];
    if (wv && wv.canGoForward()) wv.goForward();
  };

  const handleStop = () => {
    const wv = webviewRefs.current[activeTabId];
    if (wv) wv.stop();
  }

  return (
    <div className={cn(
      "relative h-screen w-screen overflow-hidden text-foreground bg-black transition-colors duration-500",
      useStore.getState().isIncognito ? "mode-midnight" : settings.homePageConfig.mode ? `mode - ${settings.homePageConfig.mode} ` : (settings.theme === 'dark' ? "mode-night" : "mode-none")
    )}>
      {/* Background Layer */}
      {useStore.getState().isIncognito ? (
        <AnimatedBackground mode="midnight" />
      ) : settings.homePageConfig.mode ? (
        <AnimatedBackground mode={settings.homePageConfig.mode} />
      ) : (
        <div
          className="absolute inset-0 transition-all duration-700 bg-cover bg-center"
          style={{
            background: settings.homePageConfig.background?.type === 'solid'
              ? settings.homePageConfig.background.value
              : settings.homePageConfig.background?.type === 'image'
                ? `url(${settings.homePageConfig.background.value})`
                : undefined,
            '--gradient-c1': settings.homePageConfig.gradientState?.color1 || '#a1c4fd',
            '--gradient-c2': settings.homePageConfig.gradientState?.color2 || '#c2e9fb',
          } as React.CSSProperties}
        >
          {settings.homePageConfig.background?.type === 'gradient' && (
            <div className="absolute inset-0 animated-gradient-bg opacity-100" />
          )}
        </div>
      )}

      {/* Global SVG Filter for Liquid Refraction */}
      <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
        <defs>
          <filter id="liquid-glass-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.001" numOctaves="1" stitchTiles="stitch" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      <MouseEffects />

      {selectionMode ? (
        <ProfileSelector />
      ) : (
        <>
          {/* Foreground Content (Seamless Layout) */}
          <div className={cn(
            "relative z-10 flex h-full w-full overflow-hidden transition-all duration-300",
            useStore.getState().isIncognito ? "liquid-glass bg-black/40" : settings.homePageConfig.mode ? "liquid-glass" : "solid-ui bg-transparent"
          )} style={useStore.getState().isIncognito ? { background: 'rgba(10, 10, 15, 0.85)' } : (settings.homePageConfig.mode ? undefined : { background: 'rgba(255, 255, 255, 0.1)' })}>
            {/* Sidebar (Mac-style / Vertical Tabs) */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Default Browser Suggestion Banner */}
              <AnimatePresence>
                {showDefaultBanner && (
                  <motion.div
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -60, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 bg-blue-500/10 border-b border-blue-500/20 backdrop-blur-md"
                  >
                    <div className="flex items-center gap-3">
                      <img src="/Rizo logo.png" alt="Rizo" className="w-5 h-5" />
                      <span className="text-sm text-foreground">Rizo isn't your default browser.</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          await (window as any).rizoAPI?.setAsDefault();
                          setShowDefaultBanner(false);
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg shadow-md"
                      >
                        Set as Default
                      </motion.button>
                      <button
                        onClick={() => setShowDefaultBanner(false)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <Navbar
                onReload={handleReload}
                onBack={handleBack}
                onForward={handleForward}
                onStop={handleStop}
              />

              {settings.showBookmarksBar && !useStore.getState().isIncognito && <BookmarksBar />}

              <div className={cn(
                "flex-1 relative overflow-hidden bg-background/30 backdrop-blur-sm border-t border-white/5",
                settings.isSplitScreen && "flex flex-row"
              )}>
                {tabs.map((tab) => {
                  const isPrimary = settings.isSplitScreen && tab.id === settings.primaryTabId;
                  const isSecondary = settings.isSplitScreen && tab.id === settings.secondaryTabId;
                  const isVisible = settings.isSplitScreen ? (isPrimary || isSecondary) : (tab.id === activeTabId);

                  return (
                    <ErrorBoundary key={tab.id} name={`Tab: ${tab.title || tab.id} `}>
                      <div
                        className={cn(
                          "h-full relative transition-all duration-300",
                          isVisible ? "flex" : "hidden",
                          settings.isSplitScreen ? (isVisible ? "flex-1" : "") : "flex-1 w-full",
                          settings.isSplitScreen && isVisible && tab.id !== activeTabId ? "opacity-70 scale-[0.99] grayscale-[0.2]" : "opacity-100 z-10",
                          isSecondary && "border-l border-white/10"
                        )}
                        onMouseDown={() => {
                          if (settings.isSplitScreen && isVisible && tab.id !== activeTabId) {
                            setActiveTab(tab.id);
                          }
                        }}
                      >
                        <BrowserView
                          tabId={tab.id}
                          isActive={tab.id === activeTabId}
                          isVisible={isVisible}
                          onMount={(wv) => {
                            if (wv) webviewRefs.current[tab.id] = wv;
                            else delete webviewRefs.current[tab.id];
                          }}
                        />
                      </div>
                    </ErrorBoundary>
                  );
                })}
              </div>
            </div>

            {/* Gemini Side Panel */}
            <GeminiPanel />

            {/* Internal Pages Overlays */}
            <AnimatePresence>
              {activeInternalPage === 'history' && <HistoryPage />}
              {/* <PasswordsPage /> would go here if implemented */}
            </AnimatePresence>

            {/* UI Toasts/Prompts */}
            <PasswordPrompt />
          </div>
        </>
      )}
      <DownloadsPage />
      <GhostSearch />
      <CommandPalette />
      <GlassCardsOverlay />
      <OnboardingOverlay />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary text-primary-foreground rounded-full shadow-lg z-[10000] text-sm font-medium flex items-center gap-2"
          >
            <Sparkles size={14} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
