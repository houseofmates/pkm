import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Webhook, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface N8nWidgetProps {
  data: {
    webhookUrl: string;
    label?: string;
    payload?: any;
  };
}

export function N8nWidget({ data }: N8nWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const triggerWorkflow = async () => {
    if (!data.webhookUrl) {
      toast.error('Webhook URL not configured');
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const res = await fetch(data.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data.payload || {})
      });

      if (res.ok) {
        setStatus('success');
        toast.success('Workflow triggered');
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        throw new Error('Workflow failed');
      }
    } catch (e) {
      secureLogger.error(e);
      setStatus('error');
      toast.error('Failed to trigger workflow');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = () => {
    if (status === 'success') return 'bg-green-500/20 text-green-500';
    if (status === 'error') return 'bg-red-500/20 text-red-500';
    return 'bg-primary/20 text-primary';
  };

  return (
    <div className="w-full h-full bg-card/20 backdrop-blur-md border border-primary/20 rounded-xl p-4 flex flex-col items-center justify-center gap-3">
      <div className={`p-3 rounded-full ${getStatusClass()} transition-colors`}>
        {loading ? <Loader2 className="animate-spin" /> :
         status === 'success' ? <CheckCircle /> :
         status === 'error' ? <AlertCircle /> :
         <Webhook />}
      </div>
      <div className="text-center">
        <h3 className="font-bold text-sm lowercase">{data.label || 'Run Workflow'}</h3>
        <p className="text-[10px] text-muted-foreground line-clamp-1 opacity-50">{data.webhookUrl}</p>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full mt-1 border-primary/20 hover:bg-primary/10 hover:text-primary lowercase"
        onClick={triggerWorkflow}
        disabled={loading}
      >
        {loading ? 'Running...' : 'Trigger'}
      </Button>
    </div>
  );
}
