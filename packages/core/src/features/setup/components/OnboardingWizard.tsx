import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  CheckCircle,
  Circle,
  ArrowRight,
  ArrowLeft,
  Settings,
  GitBranch,
  Database,
  Wifi,
  Sparkles
} from 'lucide-react';
import { gitSyncService } from '@/services/git-sync.service';
import { nocobaseValidationService } from '@/services/nocobase-validation.service';
import { autoSaveService } from '@/services/auto-save.service';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  isComplete: boolean;
  isOptional?: boolean;
}

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: 'welcome',
      title: 'Welcome to PKM',
      description: 'Your personal knowledge management workspace',
      icon: <Sparkles className="w-5 h-5" />,
      component: <WelcomeStep />,
      isComplete: false
    },
    {
      id: 'git-setup',
      title: 'Git Repository Setup',
      description: 'Set up automatic version control and backup',
      icon: <GitBranch className="w-5 h-5" />,
      component: <GitSetupStep />,
      isComplete: false
    },
    {
      id: 'nocoBase-setup',
      title: 'NocoBase Connection',
      description: 'Connect to your external database',
      icon: <Database className="w-5 h-5" />,
      component: <NocoBaseSetupStep />,
      isComplete: false,
      isOptional: true
    },
    {
      id: 'sync-settings',
      title: 'Sync Settings',
      description: 'Configure automatic save and sync',
      icon: <Settings className="w-5 h-5" />,
      component: <SyncSettingsStep />,
      isComplete: false
    },
    {
      id: 'connection-test',
      title: 'Connection Test',
      description: 'Verify everything is working',
      icon: <Wifi className="w-5 h-5" />,
      component: <ConnectionTestStep />,
      isComplete: false
    }
  ]);

  const progress = ((currentStep + 1) / steps.length) * 100;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      // Save completion state
      localStorage.setItem('pkm-onboarding-completed', 'true');

      // Start auto-save if configured
      await autoSaveService.startAutoSave();

      // Start git sync if configured
      const gitConfig = gitSyncService.getConfig();
      if (gitConfig.enabled) {
        gitSyncService.startAutoSync();
      }

      setIsCompleted(true);
      toast.success('Setup completed successfully!', {
        description: 'Your PKM workspace is ready to use'
      });

      // Redirect to main app after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);

    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Setup completion failed', {
        description: 'Please try again or contact support'
      });
    }
  };

  const skipOnboarding = () => {
    localStorage.setItem('pkm-onboarding-completed', 'true');
    window.location.href = '/';
  };

  useEffect(() => {
    // Check if onboarding is already completed
    if (localStorage.getItem('pkm-onboarding-completed') === 'true') {
      window.location.href = '/';
    }
  }, []);

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Setup Complete!</h2>
            <p className="text-gray-400 mb-4">Your PKM workspace is ready. Redirecting...</p>
            <Progress value={100} className="mb-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              {currentStepData.icon}
              <CardTitle className="text-xl text-white">{currentStepData.title}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={skipOnboarding}>
              Skip
            </Button>
          </div>
          <p className="text-gray-400 text-sm">{currentStepData.description}</p>
          <Progress value={progress} className="mt-4" />

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center space-x-1 ${index <= currentStep ? 'text-white' : 'text-gray-600'
                  }`}
              >
                {index <= currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
                <span className="text-xs hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="pb-6">
          <div className="min-h-[300px]">
            {React.cloneElement(currentStepData.component as React.ReactElement, {
              onComplete: () => {
                const updatedSteps = [...steps];
                updatedSteps[currentStep].isComplete = true;
                setSteps(updatedSteps);
              }
            })}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <Button onClick={nextStep}>
              {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Step components
function WelcomeStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="space-y-4">
      <div className="text-center py-8">
        <h3 className="text-2xl font-bold text-white mb-4">Welcome to PKM</h3>
        <p className="text-gray-400 mb-6">
          Your personal knowledge management workspace with infinite canvas,
          automatic sync, and intelligent organization.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="bg-gray-900 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Infinite Canvas</h4>
            <p className="text-sm text-gray-400">Draw, write, and organize without limits</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Auto Sync</h4>
            <p className="text-sm text-gray-400">Never lose your work with automatic backups</p>
          </div>
          <div className="bg-gray-900 p-4 rounded-lg">
            <h4 className="font-semibold text-white mb-2">Smart Search</h4>
            <p className="text-sm text-gray-400">Find anything instantly with AI-powered search</p>
          </div>
        </div>
      </div>

      <Button onClick={onComplete} className="w-full">
        Get Started
      </Button>
    </div>
  );
}

function GitSetupStep({ onComplete }: { onComplete: () => void }) {
  const [gitUrl, setGitUrl] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  const handleGitSetup = async () => {
    if (!gitUrl) {
      toast.error('Please enter a Git repository URL');
      return;
    }

    setIsInitializing(true);
    try {
      const success = await gitSyncService.initializeGitRepo();
      if (success) {
        await gitSyncService.setRemote(gitUrl);
        await gitSyncService.saveConfig({ enabled: true, autoSync: true });
        onComplete();
        toast.success('Git repository configured successfully');
      }
    } catch (error) {
      toast.error('Failed to configure Git repository');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 p-4 rounded-lg">
        <h4 className="font-semibold text-white mb-2">Git Repository Setup</h4>
        <p className="text-sm text-gray-400 mb-4">
          Enter your Git repository URL to enable automatic version control and backup.
          You can use GitHub, GitLab, or any other Git hosting service.
        </p>

        <input
          type="url"
          placeholder="https://github.com/username/repository.git"
          value={gitUrl}
          onChange={(e) => setGitUrl(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500"
        />
      </div>

      <Button onClick={handleGitSetup} disabled={isInitializing} className="w-full">
        {isInitializing ? 'Setting up...' : 'Configure Git'}
      </Button>

      <Button variant="outline" onClick={onComplete} className="w-full">
        Skip for now
      </Button>
    </div>
  );
}

function NocoBaseSetupStep({ onComplete }: { onComplete: () => void }) {
  const [nocobaseUrl, setNocobaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const handleTestConnection = async () => {
    if (!nocobaseUrl || !apiKey) {
      toast.error('Please enter both URL and API key');
      return;
    }

    setIsTesting(true);
    try {
      const result = await nocobaseValidationService.validateConfig({
        url: nocobaseUrl,
        apiKey: apiKey
      });

      if (result.isValid) {
        onComplete();
        toast.success('NocoBase connection successful');
      } else {
        toast.error('Connection failed', {
          description: result.error || 'Please check your credentials'
        });
      }
    } catch (error) {
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 p-4 rounded-lg">
        <h4 className="font-semibold text-white mb-2">NocoBase Connection</h4>
        <p className="text-sm text-gray-400 mb-4">
          Connect to your NocoBase instance for external data storage and API access.
          This step is optional - PKM works perfectly without it.
        </p>

        <input
          type="url"
          placeholder="https://your-nocobase.com/api"
          value={nocobaseUrl}
          onChange={(e) => setNocobaseUrl(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 mb-3"
        />

        <input
          type="password"
          placeholder="API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500"
        />
      </div>

      <Button onClick={handleTestConnection} disabled={isTesting} className="w-full">
        {isTesting ? 'Testing...' : 'Test Connection'}
      </Button>

      <Button variant="outline" onClick={onComplete} className="w-full">
        Skip for now
      </Button>
    </div>
  );
}

function SyncSettingsStep({ onComplete }: { onComplete: () => void }) {
  const [autoSave, setAutoSave] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [saveInterval, setSaveInterval] = useState(30);

  const handleSaveSettings = async () => {
    await autoSaveService.saveConfig({
      enabled: autoSave,
      interval: saveInterval,
      autoSync: autoSync
    });

    await gitSyncService.saveConfig({
      enabled: autoSync,
      autoSync: autoSync,
      syncInterval: 5
    });

    onComplete();
    toast.success('Sync settings saved');
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 p-4 rounded-lg">
        <h4 className="font-semibold text-white mb-4">Sync Settings</h4>

        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-white">Auto-save</span>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="rounded"
            />
          </label>

          {autoSave && (
            <div>
              <label className="text-white text-sm">Save interval (seconds)</label>
              <input
                type="number"
                min="10"
                max="300"
                value={saveInterval}
                onChange={(e) => setSaveInterval(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white mt-1"
              />
            </div>
          )}

          <label className="flex items-center justify-between">
            <span className="text-white">Auto-sync to Git</span>
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => setAutoSync(e.target.checked)}
              className="rounded"
            />
          </label>
        </div>
      </div>

      <Button onClick={handleSaveSettings} className="w-full">
        Save Settings
      </Button>
    </div>
  );
}

function ConnectionTestStep({ onComplete }: { onComplete: () => void }) {
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  const runTests = async () => {
    setIsTesting(true);
    const results: Record<string, boolean> = {};

    try {
      // Test local storage
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      results['Local Storage'] = true;
    } catch {
      results['Local Storage'] = false;
    }

    try {
      // Test IndexedDB
      const test = await import('idb').then(idb =>
        idb.openDB('test', 1).then(db => { db.close(); return true; })
      );
      results['IndexedDB'] = test;
    } catch {
      results['IndexedDB'] = false;
    }

    try {
      // Test backend connection
      const response = await fetch('/api/health');
      results['Backend'] = response.ok;
    } catch {
      results['Backend'] = false;
    }

    setTestResults(results);

    const allPassed = Object.values(results).every(Boolean);
    if (allPassed) {
      onComplete();
      toast.success('All tests passed!');
    } else {
      toast.warning('Some tests failed', {
        description: 'You may experience limited functionality'
      });
    }

    setIsTesting(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-gray-900 p-4 rounded-lg">
        <h4 className="font-semibold text-white mb-4">Connection Test</h4>
        <p className="text-sm text-gray-400 mb-4">
          Testing your system compatibility and connectivity...
        </p>

        <div className="space-y-2">
          {Object.entries(testResults).map(([test, passed]) => (
            <div key={test} className="flex items-center justify-between">
              <span className="text-white">{test}</span>
              {passed ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Circle className="w-4 h-4 text-red-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      <Button onClick={runTests} disabled={isTesting} className="w-full">
        {isTesting ? 'Testing...' : 'Run Tests'}
      </Button>
    </div>
  );
}