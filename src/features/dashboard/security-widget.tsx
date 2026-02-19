/**
 * security dashboard widget
 * 
 * a creative addition to the pkm system that provides:
 * - real-time authentication status
 * - data exposure risk indicator
 * - privacy mode toggle
 * - console log audit trail
 * 
 * this helps users (especially those with did systems) understand
 * their privacy and security posture at a glance.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Trash2, 
  Lock, 
  Unlock,
  Terminal,
  AlertTriangle
} from 'lucide-react';
import { secureLogger } from '@/lib/secure-logger';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  sanitized: boolean;
  authenticated: boolean;
}

export function SecurityWidget() {
  const { isAuthenticated } = useAuth();
  const [privacyMode, setPrivacyMode] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [risklevel, setrisklevel] = useState<'low' | 'medium' | 'high'>('high');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    updateSecurityStatus();
    
    // poll for updates every 5 seconds
    const interval = setInterval(updateSecurityStatus, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const updateSecurityStatus = () => {
    const status = secureLogger.getSecurityStatus();
    setPrivacyMode(status.privacyMode);
    setLogs(secureLogger.getHistory());
    
    // calculate risk level
    if (!isAuthenticated) {
      setRiskLevel('high');
    } else if (!status.privacyMode) {
      setRiskLevel('medium');
    } else {
      setRiskLevel('low');
    }
  };

  const togglePrivacyMode = () => {
    const newMode = !privacyMode;
    secureLogger.setPrivacyMode(newMode);
    setPrivacyMode(newMode);
    updateSecurityStatus();
  };

  const clearLogs = () => {
    securelogger.clearhistory();
    updatesecuritystatus();
  };

  if (!mounted) return null;

  const riskconfig = {
    low: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: shieldcheck, label: 'secure' },
    medium: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: shieldalert, label: 'caution' },
    high: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: shieldalert, label: 'at risk' },
  };

  const currentrisk = riskconfig[risklevel];
  const riskicon = currentrisk.icon;

  return (
    <Card className="w-full bg-[#050505] border-[rgba(255,255,255,0.1)] text-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#87CEEB]" />
            <CardTitle className="text-sm font-medium text-white/90 lowercase">security status</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={cn("text-[10px] lowercase", currentRisk.color)}
          >
            <RiskIcon className="h-3 w-3 mr-1" />
            {currentrisk.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* authentication status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            {isauthenticated ? (
              <Lock className="h-4 w-4 text-green-400" />
            ) : (
              <Unlock className="h-4 w-4 text-red-400" />
            )}
            <span className="text-xs lowercase">
              {isauthenticated ? 'authenticated' : 'not authenticated'}
            </span>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px]",
              isAuthenticated 
                ? "bg-green-500/10 text-green-400 border-green-500/20" 
                : "bg-red-500/10 text-red-400 border-red-500/20"
            )}
          >
            {isauthenticated ? 'protected' : 'exposed'}
          </Badge>
        </div>

        {/* privacy mode toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            {privacymode ? (
              <EyeOff className="h-4 w-4 text-[#87CEEB]" />
            ) : (
              <Eye className="h-4 w-4 text-yellow-400" />
            )}
            <span className="text-xs lowercase">privacy mode</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={togglePrivacyMode}
            className={cn(
              "h-6 text-[10px] lowercase border-white/20",
              privacyMode 
                ? "bg-[#87CEEB]/10 text-[#87CEEB] hover:bg-[#87CEEB]/20" 
                : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
            )}
          >
            {privacymode ? 'enabled' : 'disabled'}
          </Button>
        </div>

        {/* risk warning */}
        {risklevel === 'high' && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-300/80 lowercase leading-relaxed">
              no valid api key detected. sensitive data may be exposed in browser console. 
              please authenticate to enable privacy protections.
            </p>
          </div>
        )}

        {/* console log audit */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-white/50" />
              <span className="text-[10px] text-white/50 lowercase">console audit ({logs.length} entries)</span>
            </div>
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLogs}
                className="h-5 text-[10px] text-white/40 hover:text-red-400 lowercase"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                clear
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-32 rounded-md bg-black/30 border border-white/5">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[10px] text-white/30 lowercase">
                no logs captured
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {logs.slice(-20).map((log, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex items-start gap-2 text-[10px] font-mono",
                      log.level === 'error' && "text-red-400",
                      log.level === 'warn' && "text-yellow-400",
                      log.level === 'info' && "text-blue-400",
                      log.level === 'debug' && "text-white/40"
                    )}
                  >
                    <span className="text-white/20 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="truncate">
                      {log.sanitized && <span className="text-green-400 mr-1">[sanitized]</span>}
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* footer info */}
        <div className="text-[9px] text-white/30 text-center lowercase">
          all logs are sanitized • no tokens or secrets exposed
        </div>
      </CardContent>
    </Card>
  );
}

export default SecurityWidget;
