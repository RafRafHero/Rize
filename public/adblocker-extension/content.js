// Rizo Guard - Content Script
const AD_SELECTORS = [
    // Standard web ad containers
    '.ad-container', '.ad-slot', '.ad-wrapper', '[id^="google_ads_"]', '[class*="AdSlot"]',
    '.adsbygoogle', '#ad-unit', '.sponsored-post', '.promoted-content',
    // YouTube Specifics
    '.video-ads', '.ytp-ad-module', '.ytp-ad-player-overlay',
    'ytd-ad-slot-renderer', 'ytd-promoted-sparkles-web-renderer'
];

function hideGhostElements() {
    AD_SELECTORS.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            if (el.style.display !== 'none') {
                el.style.setProperty('display', 'none', 'important');
            }
        });
    });
}

// YouTube Auto-Skipper
function handleYouTubeAds() {
    if (!window.location.hostname.includes('youtube.com')) return;

    const skipButton = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
    if (skipButton) {
        skipButton.click();
        console.log('Rizo Guard: Skipped YouTube Ad');
    }

    // Fast-forward through non-skippable ads if they still appear
    const video = document.querySelector('video');
    const adBeingShown = document.querySelector('.ad-showing');
    if (video && adBeingShown) {
        video.playbackRate = 16.0; // Fast forward
        video.muted = true;
    }
}

// Run periodically and on DOM changes
hideGhostElements();
setInterval(hideGhostElements, 2000);
setInterval(handleYouTubeAds, 500);

// Use MutationObserver for higher performance
const observer = new MutationObserver((mutations) => {
    hideGhostElements();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

console.log('Rizo Guard Content Script Active');
