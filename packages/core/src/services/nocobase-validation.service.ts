import axios from 'axios';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secure-logger';

export interface NocoBaseValidationResult {
  isValid: boolean;
  url: string;
  apiKey: string;
  connectivity: 'connected' | 'error' | 'timeout';
  authentication: 'valid' | 'invalid' | 'missing';
  collections: {
    available: string[];
    required: string[];
    missing: string[];
  };
  version?: string;
  error?: string;
}

export interface NocoBaseConfig {
  url: string;
  apiKey: string;
  requiredCollections: string[];
}

class NocoBaseValidationService {
  private static instance: NocoBaseValidationService;
  private config: NocoBaseConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): NocoBaseValidationService {
    if (!NocoBaseValidationService.instance) {
      NocoBaseValidationService.instance = new NocoBaseValidationService();
    }
    return NocoBaseValidationService.instance;
  }

  private loadConfig(): NocoBaseConfig {
    return {
      url: import.meta.env.VITE_NOCOBASE_URL || 'https://db.houseofmates.space/api',
      apiKey: import.meta.env.VITE_NOCOBASE_API_TOKEN || '',
      requiredCollections: [
        'notes',
        'tasks',
        'projects',
        'journal_entries',
        'canvas_drawings',
        'front_history'
      ]
    };
  }

  async validateConfig(config?: Partial<NocoBaseConfig>): Promise<NocoBaseValidationResult> {
    const testConfig = { ...this.config, ...config };
    
    const result: NocoBaseValidationResult = {
      isValid: false,
      url: testConfig.url,
      apiKey: testConfig.apiKey ? '***' : '',
      connectivity: 'error',
      authentication: 'missing',
      collections: {
        available: [],
        required: testConfig.requiredCollections,
        missing: testConfig.requiredCollections
      }
    };

    try {
      // Test connectivity
      const response = await axios.get(`${testConfig.url}/app/info`, {
        timeout: 10000,
        validateStatus: (status) => status < 500
      });

      result.connectivity = 'connected';
      
      if (response.data?.version) {
        result.version = response.data.version;
      }

      // Test authentication
      if (!testConfig.apiKey) {
        result.authentication = 'missing';
        result.error = 'API key is required';
        return result;
      }

      try {
        const authResponse = await axios.get(`${testConfig.url}/users/me`, {
          headers: {
            'Authorization': `Bearer ${testConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (authResponse.status === 200) {
          result.authentication = 'valid';
        } else {
          result.authentication = 'invalid';
          result.error = 'Invalid API key';
          return result;
        }
      } catch (authError) {
        result.authentication = 'invalid';
        result.error = 'Authentication failed';
        return result;
      }

      // Test collections
      try {
        const collectionsResponse = await axios.get(`${testConfig.url}/collections:list`, {
          headers: {
            'Authorization': `Bearer ${testConfig.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (collectionsResponse.data?.data) {
          const availableCollections = collectionsResponse.data.data.map((col: any) => col.name);
          result.collections.available = availableCollections;
          result.collections.missing = testConfig.requiredCollections.filter(
            required => !availableCollections.includes(required)
          );
        }
      } catch (collectionsError) {
        secureLogger.warn('Failed to fetch collections:', collectionsError);
        result.error = 'Could not validate collections';
      }

      // Final validation
      result.isValid = (
        result.connectivity === 'connected' &&
        result.authentication === 'valid' &&
        result.collections.missing.length === 0
      );

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          result.connectivity = 'timeout';
          result.error = 'Connection timeout';
        } else if (error.response) {
          result.connectivity = 'connected';
          result.error = `Server error: ${error.response.status}`;
        } else {
          result.error = 'Network error';
        }
      } else {
        result.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return result;
  }

  async setupRequiredCollections(config?: Partial<NocoBaseConfig>): Promise<boolean> {
    const testConfig = { ...this.config, ...config };
    
    try {
      // This would typically call a backend endpoint to create collections
      // For now, we'll just validate they exist
      const validation = await this.validateConfig(testConfig);
      
      if (validation.collections.missing.length > 0) {
        secureLogger.warn('Missing collections:', validation.collections.missing);
        toast.warning('Some collections are missing', {
          description: `${validation.collections.missing.join(', ')}`
        });
        return false;
      }

      toast.success('All required collections are available');
      return true;
    } catch (error) {
      secureLogger.error('Failed to setup collections:', error);
      toast.error('Failed to setup collections');
      return false;
    }
  }

  async testConnection(): Promise<void> {
    const validation = await this.validateConfig();
    
    if (validation.isValid) {
      toast.success('NocoBase connection successful', {
        description: `Connected to ${validation.url} (${validation.version || 'unknown version'})`
      });
    } else {
      let description = validation.error || 'Unknown error';
      
      if (validation.collections.missing.length > 0) {
        description += `\nMissing collections: ${validation.collections.missing.join(', ')}`;
      }
      
      toast.error('NocoBase connection failed', {
        description
      });
    }
  }

  getConfig(): NocoBaseConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<NocoBaseConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

export const nocobaseValidationService = NocoBaseValidationService.getInstance();