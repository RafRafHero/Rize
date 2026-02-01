import React, { useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
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
import { UpdateBanner } from './components/UpdateBanner';

function App() {
  const { tabs, activeTabId, setActiveTab, updateTab, settings, addDownload, updateDownload, completeDownload, selectionMode, activeInternalPage, setInternalPage, clearCapturedPassword, toggleGlassCards, isGlassCardsOverviewOpen } = useStore();

  useEffect(() => {
    const ipc = (window as any).electron?.ipcRenderer;
    if (ipc) {
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
    }
  }, []);

  const webviewRefs = useRef<{ [key: string]: any }>({});

  // Glass Cards Hotkey (Ctrl+Shift+T)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+Shift+T (Windows/Linux) or Cmd+Shift+T (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        e.preventDefault();

        const isOpen = useStore.getState().isGlassCardsOverviewOpen;

        // If opening, capture current tab first for fresh snapshot
        if (!isOpen) {
          const currentActiveId = useStore.getState().activeTabId;
          const wv = webviewRefs.current[currentActiveId];
          if (wv && wv.capturePage) {
            wv.capturePage().then((image: any) => {
              if (image && !image.isEmpty()) {
                updateTab(currentActiveId, { thumbnailUrl: image.toDataURL() });
              }
              // Open after capture (or attempt)
              toggleGlassCards(true);
            }).catch((err: any) => {
              console.error("Snapshot error:", err);
              toggleGlassCards(true);
            });
          } else {
            toggleGlassCards(true);
          }
        } else {
          toggleGlassCards(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleGlassCards, updateTab]);

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
        } else if (currentSettings.theme === 'dark' || (currentSettings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
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

    (window as any).electron?.ipcRenderer.on('download-started', onDownloadStarted);
    (window as any).electron?.ipcRenderer.on('download-progress', onDownloadProgress);
    (window as any).electron?.ipcRenderer.on('download-complete', onDownloadComplete);

    return () => {
      (window as any).electron?.ipcRenderer.off('download-started', onDownloadStarted);
      (window as any).electron?.ipcRenderer.off('download-progress', onDownloadProgress);
      (window as any).electron?.ipcRenderer.off('download-complete', onDownloadComplete);
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
      useStore.getState().isIncognito ? "mode-midnight" : settings.homePageConfig.mode ? `mode-${settings.homePageConfig.mode}` : (settings.theme === 'dark' ? "mode-night" : "mode-none")
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
                    <ErrorBoundary key={tab.id} name={`Tab: ${tab.title || tab.id}`}>
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
      <GlassCardsOverlay />
      <OnboardingOverlay />
      <UpdateBanner />
    </div>
  );
}

export default App;
