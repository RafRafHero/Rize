/*
**Task: Fix "Duplicate Handler" Crash and White Screen**

The app is crashing with `Attempted to register a second handler for 'get-store-value'` and showing a white screen because subsequent handlers (`get-profiles-list`, `get-passwords`) are never registered.

**Please Apply These 3 Critical Fixes to `electron/main.ts`:**

1. **Fix Duplicate 'get-store-value':**
   - Scan the file for `ipcMain.handle('get-store-value', ...)` and `ipcMain.handle('set-store-value', ...)`.
   - **Delete the duplicates.** They should appear ONLY ONCE.
   - **Safety Pattern:** Wrap them like this to prevent future crashes:
     ```typescript
     ipcMain.removeHandler('get-store-value'); // Clear old one first
     ipcMain.handle('get-store-value', (event, key) => store.get(key));
     ```

2. **Restore Missing Handlers:**
   - The logs say `No handler registered for 'get-passwords'` and `'get-profiles-list'`.
   - Ensure these handlers are explicitly defined **before** the app tries to load the window.
   - **Add them if missing:**
     ```typescript
     ipcMain.removeHandler('get-profiles-list');
     ipcMain.handle('get-profiles-list', () => {
       // Return list of profiles from store or fs
       return store.get('profiles') || [];
     });

     ipcMain.removeHandler('get-passwords');
     ipcMain.handle('get-passwords', () => {
       // Return passwords for current profile
       return []; // Placeholder to stop the crash
     });
     ```

3. **Verify Execution Order:**
   - Ensure all `ipcMain.handle` calls are placed **outside** of specific event listeners (like `did-finish-load`) or ensure they run immediately on app start.
*/3