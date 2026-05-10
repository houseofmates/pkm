/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Shield,
  Key,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useSystemStore } from '../../stores/system-store';
import { storageManager } from '@/lib/storage-manager';

export function AppLock() {
  const { system, updateSettings } = useSystemStore();
  
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [lockEnabled, setLockEnabled] = useState(false);

  useEffect(() => {
    // Check if app lock is enabled and if we should be locked
    const checkLockStatus = async () => {
      if (system?.settings?.autoLock) {
        const pinHash = await storageManager.getEncryptedItem('app_lock_pin');
        if (pinHash) {
          setLockEnabled(true);
          // Check if we should be locked (simplified - in real app would check last activity)
          const lastActivity = localStorage.getItem('pkm_last_activity');
          if (!lastActivity || (Date.now() - parseInt(lastActivity)) > 5 * 60 * 1000) {
            setIsLocked(true);
          }
        }
      }
    };
    
    checkLockStatus();
  }, [system?.settings?.autoLock]);

  const hashPin = async (pin: string): Promise<string> => {
    // Simple hash for demo - in production use proper hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + 'pkm-salt');
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const verifyPin = async (inputPin: string, storedHash: string): Promise<boolean> => {
    const inputHash = await hashPin(inputPin);
    return inputHash === storedHash;
  };

  const handleUnlock = async () => {
    if (!currentPin) {
      setPinError('please enter your pin');
      return;
    }

    try {
      const pinHash = await storageManager.getEncryptedItem('app_lock_pin');
      if (pinHash && await verifyPin(currentPin, pinHash)) {
        setIsLocked(false);
        setCurrentPin('');
        setPinError('');
        // Update last activity
        localStorage.setItem('pkm_last_activity', Date.now().toString());
      } else {
        setPinError('incorrect pin');
      }
    } catch (error) {
      setPinError('failed to verify pin');
    }
  };

  const handleSetPin = async () => {
    if (newPin.length < 4) {
      setPinError('pin must be at least 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('pins do not match');
      return;
    }

    try {
      const pinHash = await hashPin(newPin);
      await storageManager.setEncryptedItem('app_lock_pin', pinHash);
      await updateSettings({ autoLock: true, lockPinHash: pinHash });
      setLockEnabled(true);
      setNewPin('');
      setConfirmPin('');
      setPinError('');
    } catch (error) {
      setPinError('failed to set pin');
    }
  };

  const handleDisableLock = async () => {
    if (!currentPin) {
      setPinError('please enter your current pin to disable lock');
      return;
    }

    try {
      const pinHash = await storageManager.getEncryptedItem('app_lock_pin');
      if (pinHash && await verifyPin(currentPin, pinHash)) {
        await storageManager.removeItem('app_lock_pin');
        await updateSettings({ autoLock: false, lockPinHash: undefined });
        setLockEnabled(false);
        setCurrentPin('');
        setPinError('');
      } else {
        setPinError('incorrect pin');
      }
    } catch (error) {
      setPinError('failed to disable lock');
    }
  };

  const handleChangePin = async () => {
    if (!currentPin) {
      setPinError('please enter your current pin');
      return;
    }

    if (newPin.length < 4) {
      setPinError('new pin must be at least 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('new pins do not match');
      return;
    }

    try {
      const pinHash = await storageManager.getEncryptedItem('app_lock_pin');
      if (pinHash && await verifyPin(currentPin, pinHash)) {
        const newPinHash = await hashPin(newPin);
        await storageManager.setEncryptedItem('app_lock_pin', newPinHash);
        await updateSettings({ lockPinHash: newPinHash });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
        setPinError('');
      } else {
        setPinError('incorrect current pin');
      }
    } catch (error) {
      setPinError('failed to change pin');
    }
  };

  // Lock screen overlay
  if (isLocked) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Lock className="h-6 w-6" />
              app locked
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              enter your pin to unlock the system tracker
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="unlock-pin">pin</Label>
              <div className="relative">
                <Input
                  id="unlock-pin"
                  type={showPin ? 'text' : 'password'}
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  placeholder="enter your pin"
                  className="pr-10"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {pinError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{pinError}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleUnlock} className="w-full">
              <Unlock className="h-4 w-4 mr-2" />
              unlock
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold lowercase">privacy & security</h2>
        <p className="text-muted-foreground">manage your system tracker privacy settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Lock */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              app lock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>enable app lock</Label>
                <p className="text-sm text-muted-foreground">
                  require pin to access system tracker
                </p>
              </div>
              <Switch
                checked={lockEnabled}
                onCheckedChange={(enabled) => {
                  if (!enabled && lockEnabled) {
                    // Need current pin to disable
                    setPinError('enter your current pin below to disable lock');
                  } else {
                    setLockEnabled(enabled);
                  }
                }}
              />
            </div>

            {!lockEnabled ? (
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">set up app lock</h4>
                <div>
                  <Label htmlFor="new-pin">new pin</Label>
                  <Input
                    id="new-pin"
                    type={showPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="enter at least 4 digits"
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-pin">confirm pin</Label>
                  <Input
                    id="confirm-pin"
                    type={showPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="confirm your pin"
                    maxLength={10}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={showPin}
                    onCheckedChange={setShowPin}
                  />
                  <Label className="text-sm">show pin</Label>
                </div>
                <Button onClick={handleSetPin} className="w-full">
                  <Key className="h-4 w-4 mr-2" />
                  set pin
                </Button>
              </div>
            ) : (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">app lock is enabled</span>
                </div>

                <div>
                  <Label htmlFor="current-pin-change">current pin</Label>
                  <Input
                    id="current-pin-change"
                    type={showPin ? 'text' : 'password'}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value)}
                    placeholder="enter current pin"
                    maxLength={10}
                  />
                </div>

                <div>
                  <Label htmlFor="new-pin-change">new pin</Label>
                  <Input
                    id="new-pin-change"
                    type={showPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="enter new pin"
                    maxLength={10}
                  />
                </div>

                <div>
                  <Label htmlFor="confirm-pin-change">confirm new pin</Label>
                  <Input
                    id="confirm-pin-change"
                    type={showPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="confirm new pin"
                    maxLength={10}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleChangePin} variant="outline" className="flex-1">
                    change pin
                  </Button>
                  <Button onClick={handleDisableLock} variant="destructive" className="flex-1">
                    disable lock
                  </Button>
                </div>
              </div>
            )}

            {pinError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{pinError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Privacy Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              privacy features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">local storage only</h4>
                  <p className="text-sm text-muted-foreground">
                    all data is stored locally in your browser using indexeddb
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">no cloud sync</h4>
                  <p className="text-sm text-muted-foreground">
                    your data never leaves your device unless you export it
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">encrypted storage</h4>
                  <p className="text-sm text-muted-foreground">
                    sensitive data like pins are encrypted before storage
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">no tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    no analytics, telemetry, or data collection
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">offline first</h4>
                  <p className="text-sm text-muted-foreground">
                    works completely offline after initial page load
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">security recommendations</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• use a strong pin that's not easily guessable</li>
                <li>• regularly export your data as backup</li>
                <li>• clear browser data when disposing of devices</li>
                <li>• keep your browser updated for security</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}