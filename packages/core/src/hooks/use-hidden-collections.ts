import { useAppSetting } from './use-app-setting';
import { secureLogger } from '@/lib/secure-logger';

export function useHiddenCollections() {
  const [hiddenCollections, setHiddenCollections] = useAppSetting<string[]>('hidden_collections', []);

  const hideCollection = (collectionName: string) => {
    const normalized = collectionName.toLowerCase().trim();
    if (!hiddenCollections.includes(normalized)) {
      const updated = [...hiddenCollections, normalized];
      setHiddenCollections(updated);
      secureLogger.info(`[hidden-collections] hid collection: ${normalized}`);
    }
  };

  const unhideCollection = (collectionName: string) => {
    const normalized = collectionName.toLowerCase().trim();
    const updated = hiddenCollections.filter(name => name !== normalized);
    setHiddenCollections(updated);
    secureLogger.info(`[hidden-collections] unhid collection: ${normalized}`);
  };

  const isHidden = (collectionName: string): boolean => {
    const normalized = collectionName.toLowerCase().trim();
    return hiddenCollections.includes(normalized);
  };

  const getHiddenCollections = (): string[] => {
    return hiddenCollections;
  };

  return {
    hiddenCollections,
    hideCollection,
    unhideCollection,
    isHidden,
    getHiddenCollections
  };
}
