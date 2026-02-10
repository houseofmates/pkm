export { };

declare global {
    interface Window {
        electron?: {
            isElectron: boolean;
            syncState: (data: any) => void;
            updateContext: (data: any) => void;
        };
    }
}
