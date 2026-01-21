export { };

declare global {
    interface Window {
        electron: {
            store: {
                get: (key: string) => Promise<any>;
                set: (key: string, value: any) => Promise<void>;
            };
            ipcRenderer: {
                send: (channel: string, ...args: any[]) => void;
                on: (channel: string, func: (...args: any[]) => void) => void;
                once: (channel: string, func: (...args: any[]) => void) => void;
                off: (channel: string, func: (...args: any[]) => void) => void;
                invoke: (channel: string, ...args: any[]) => Promise<any>;
            };
        };
    }
}
