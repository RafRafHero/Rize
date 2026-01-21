// Rizo Guard - Background Engine
const YOUTUBE_AD_PATTERNS = [
    "*://*.youtube.com/ptracking*",
    "*://*.youtube.com/pagead*",
    "*://*.youtube.com/api/stats/ads*",
    "*://*.doubleclick.net/pagead/*",
    "*://*.google.com/pagead/*"
];

let whitelist = [];

// Load whitelist from storage
chrome.storage.local.get(['whitelist'], (result) => {
    if (result.whitelist) {
        whitelist = result.whitelist;
        updateDynamicRules();
    }
});

async function updateDynamicRules() {
    // 1. Clear existing dynamic rules
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(rule => rule.id);

    // 2. Generate new rules
    const newRules = [];
    let ruleId = 1000; // Dynamic rules start at 1000

    // Add YouTube Ad Blocking Rules
    YOUTUBE_AD_PATTERNS.forEach(pattern => {
        newRules.push({
            id: ruleId++,
            priority: 2,
            action: { type: 'block' },
            condition: {
                urlFilter: pattern,
                resourceTypes: ['xmlhttprequest', 'script', 'sub_frame']
            }
        });
    });

    // Add Whitelist Bypassing Rules (Allow everything for whitelisted domains)
    whitelist.forEach(domain => {
        newRules.push({
            id: ruleId++,
            priority: 10, // Higher priority to bypass blocking
            action: { type: 'allow' },
            condition: {
                urlFilter: `*://${domain}/*`,
                resourceTypes: ['main_frame', 'sub_frame', 'script', 'image', 'xmlhttprequest', 'stylesheet', 'font', 'media', 'other']
            }
        });
    });

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: newRules
    });
}

// Listen for storage changes to update rules
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.whitelist) {
        whitelist = changes.whitelist.newValue || [];
        updateDynamicRules();
    }
});

// Initialize rules on install/startup
chrome.runtime.onInstalled.addListener(() => {
    updateDynamicRules();
    chrome.storage.local.set({ blockedCount: 0 });
});

// Listen for blocked requests to update counter (Optional: purely for UI feedback if DNR allows)
// Note: DNR doesn't directly notify of blocks for privacy, but we can estimate or use onRuleMatchedDebug in dev
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener((info) => {
    chrome.storage.local.get(['blockedCount'], (result) => {
        const newCount = (result.blockedCount || 0) + 1;
        chrome.storage.local.set({ blockedCount: newCount });
    });
});
