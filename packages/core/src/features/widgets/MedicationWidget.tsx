import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pill, Check, Clock, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRecords } from '@/hooks/use-records';
import { dataService } from '@/services/data.service';

interface Medication {
  id: string;
  name: string;
  time: string;
  taken: boolean;
  dosage?: string;
}

interface MedicationLog {
  id: string;
  medication_id: string;
  medication_name: string;
  timestamp: string;
  taken: boolean;
  dosage?: string;
}

interface MedicationWidgetProps {
  data?: {
    collectionName?: string;
    medications?: Medication[];
  };
  onUpdate?: (patch: Record<string, unknown>) => void;
}

const THEME_COLOR = '#f6b012';
const SECONDARY_COLOR = '#3c9fdd';

export function MedicationWidget({ data, onUpdate }: MedicationWidgetProps) {
  const collectionName = data?.collectionName ?? 'medication_logs';
  const { createRecord, records, refresh } = useRecords(collectionName);

  const [medications, setMedications] = useState<Medication[]>(
    data?.medications ?? [
      { id: 'morning', name: 'morning meds', time: '08:00', taken: false },
      { id: 'afternoon', name: 'afternoon meds', time: '14:00', taken: false },
      { id: 'evening', name: 'evening meds', time: '20:00', taken: false },
    ]
  );
  const [logs, setLogs] = useState<MedicationLog[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newMed, setNewMed] = useState({ name: '', time: '', dosage: '' });

  useEffect(() => {
    if (records) {
      const today = new Date().toISOString().split('T')[0];
      const todayLogs = records
        .filter((r: any) => r.timestamp?.startsWith(today))
        .map((r: any) => ({
          id: r.id,
          medication_id: r.medication_id,
          medication_name: r.medication_name,
          timestamp: r.timestamp,
          taken: r.taken,
          dosage: r.dosage,
        }));
      setLogs(todayLogs);

      // update medication taken status based on logs
      setMedications(prev => prev.map(med => ({
        ...med,
        taken: todayLogs.some((l: MedicationLog) => l.medication_id === med.id && l.taken)
      })));
    }
  }, [records]);

  const handleLog = async (medication: Medication) => {
    setIsLogging(true);

    try {
      const payload = {
        medication_id: medication.id,
        medication_name: medication.name,
        timestamp: new Date().toISOString(),
        taken: true,
        dosage: medication.dosage,
      };

      await createRecord(payload);

      // emit sync event
      dataService.emitDataUpdate('medication_taken', {
        medication_id: medication.id,
        medication_name: medication.name
      });

      setLogs(prev => [{
        id: Date.now().toString(),
        ...payload
      }, ...prev]);

      setMedications(prev => prev.map(m => 
        m.id === medication.id ? { ...m, taken: true } : m
      ));

      toast.success(`${medication.name} logged`, {
        icon: <Check className="w-4 h-4 text-[#22c55e]" />,
      });

      refresh();
    } catch (e) {
      toast.error('failed to save log');
    } finally {
      setIsLogging(false);
    }
  };

  const handleAddMedication = () => {
    if (!newMed.name || !newMed.time) return;
    
    const med: Medication = {
      id: `custom_${Date.now()}`,
      name: newMed.name,
      time: newMed.time,
      taken: false,
      dosage: newMed.dosage,
    };

    setMedications(prev => [...prev, med]);
    setNewMed({ name: '', time: '', dosage: '' });
    setShowAdd(false);
    onUpdate?.({ medications: [...medications, med] });
  };

  const getTimeStatus = (timeStr: string): 'past' | 'current' | 'future' => {
    const now = new Date();
    const [hours, minutes] = timeStr.split(':').map(Number);
    const medTime = new Date();
    medTime.setHours(hours, minutes, 0, 0);
    
    const diffMinutes = (now.getTime() - medTime.getTime()) / (1000 * 60);
    
    if (diffMinutes > 60) return 'past';
    if (Math.abs(diffMinutes) <= 60) return 'current';
    return 'future';
  };

  return (
    <div 
      className="w-full h-full rounded-xl overflow-hidden flex flex-col"
      style={{ 
        background: '#050505',
        border: `1px solid ${SECONDARY_COLOR}20`,
      }}
    >
      {/* header */}
      <div 
        className="px-3 py-2 flex items-center justify-between shrink-0"
        style={{ 
          background: `linear-gradient(90deg, ${SECONDARY_COLOR}10 0%, transparent 100%)`,
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4" style={{ color: SECONDARY_COLOR }} />
          <span className="text-xs font-medium lowercase" style={{ color: THEME_COLOR }}>
            medication schedule
          </span>
        </div>
      </div>

      {/* content */}
      <div className="flex-1 p-3 space-y-2 overflow-auto min-h-0">
        {/* medication list */}
        {medications.map((med) => {
          const timeStatus = getTimeStatus(med.time);
          const isCurrent = timeStatus === 'current';
          
          return (
            <div
              key={med.id}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg transition-all",
                med.taken ? "opacity-60" : ""
              )}
              style={{
                background: med.taken 
                  ? 'rgba(34, 197, 94, 0.1)' 
                  : isCurrent 
                    ? `${THEME_COLOR}10`
                    : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${med.taken ? '#22c55e30' : isCurrent ? THEME_COLOR : 'rgba(255, 255, 255, 0.08)'}`,
              }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ 
                    background: med.taken 
                      ? '#22c55e20' 
                      : isCurrent 
                        ? `${THEME_COLOR}20`
                        : 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  {med.taken ? (
                    <Check className="w-4 h-4" style={{ color: '#22c55e' }} />
                  ) : (
                    <Clock className="w-4 h-4" style={{ color: isCurrent ? THEME_COLOR : SECONDARY_COLOR }} />
                  )}
                </div>
                <div>
                  <span className="text-xs font-medium lowercase block" style={{ color: '#ffffff' }}>
                    {med.name}
                  </span>
                  <span className="text-[10px] lowercase" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                    {med.time} {med.dosage && `· ${med.dosage}`}
                  </span>
                </div>
              </div>
              
              {!med.taken && (
                <Button
                  size="xs"
                  onClick={() => handleLog(med)}
                  disabled={isLogging}
                  className="h-7 px-2 text-[10px] lowercase"
                  style={{
                    background: isCurrent ? THEME_COLOR : SECONDARY_COLOR,
                    color: '#000000',
                  }}
                >
                  {isLogging ? '...' : 'log'}
                </Button>
              )}
            </div>
          );
        })}

        {/* add medication */}
        {showAdd ? (
          <div className="space-y-2 p-2 rounded-lg border border-white/10 bg-white/5">
            <input
              value={newMed.name}
              onChange={(e) => setNewMed(prev => ({ ...prev, name: e.target.value }))}
              placeholder="medication name"
              className="w-full h-8 px-2 text-xs bg-black/40 border border-white/10 rounded lowercase"
            />
            <div className="flex gap-2">
              <input
                type="time"
                value={newMed.time}
                onChange={(e) => setNewMed(prev => ({ ...prev, time: e.target.value }))}
                className="h-8 px-2 text-xs bg-black/40 border border-white/10 rounded"
              />
              <input
                value={newMed.dosage}
                onChange={(e) => setNewMed(prev => ({ ...prev, dosage: e.target.value }))}
                placeholder="dosage"
                className="flex-1 h-8 px-2 text-xs bg-black/40 border border-white/10 rounded lowercase"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="xs"
                className="flex-1 h-7 text-[10px] lowercase"
                onClick={handleAddMedication}
                style={{ background: THEME_COLOR, color: '#000000' }}
              >
                add
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => setShowAdd(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="xs"
            variant="ghost"
            className="w-full h-7 text-[10px] lowercase border border-dashed border-white/20"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            add medication
          </Button>
        )}

        {/* today's summary */}
        {logs.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <span className="text-[10px] lowercase text-white/40">
              today: {logs.filter(l => l.taken).length} / {medications.length} taken
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
