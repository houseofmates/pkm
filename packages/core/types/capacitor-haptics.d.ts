// optional native dependency; stub types so web builds typecheck without the package

declare module '@capacitor/haptics' {
  export type ImpactOptions = { style: string; intensity?: number };
  export const Haptics: {
    impact: (opts: ImpactOptions) => Promise<void>;
  };
}
