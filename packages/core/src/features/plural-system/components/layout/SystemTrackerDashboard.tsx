import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePluralSystem } from '../../stores/use-plural-system';
import { MembersPanel } from '../members/MembersPanel';
import { FrontPanel } from '../front/FrontPanel';
import { FrontHistory } from '../front/FrontHistory';
import { AnalyticsPanel } from '../analytics/AnalyticsPanel';
import { GroupManager } from '../groups/GroupManager';
import { JournalPanel } from '../journal/JournalPanel';
import { ChatPanel } from '../chat/ChatPanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { Users, Layers, Clock, BarChart3, FolderOpen, BookOpen, MessageSquare, Settings } from 'lucide-react';

const tabs = [
  { key: 'members', label: 'members', icon: Users },
  { key: 'front', label: 'front', icon: Layers },
  { key: 'history', label: 'history', icon: Clock },
  { key: 'analytics', label: 'analytics', icon: BarChart3 },
  { key: 'groups', label: 'groups', icon: FolderOpen },
  { key: 'journal', label: 'journal', icon: BookOpen },
  { key: 'chat', label: 'chat', icon: MessageSquare },
  { key: 'settings', label: 'settings', icon: Settings },
] as const;

type TabKey = typeof tabs[number]['key'];

export default function SystemTrackerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabKey | null;
  const validTab = tabs.find(t => t.key === tabFromUrl)?.key;
  const [activeTab, setActiveTab] = useState<TabKey>(validTab || 'members');
  const initialize = usePluralSystem(s => s.initialize);
  const systemSettings = usePluralSystem(s => s.systemSettings);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  const isDyslexic = systemSettings.dyslexiaFont;
  const fontClass = isDyslexic ? 'font-sans' : 'font-varela';

  return (
    <div
      className={`h-screen flex flex-col bg-[#0a0a0a] text-white ${fontClass}`}
      style={{
        fontSize: `${systemSettings.fontScale}rem`,
        fontFamily: isDyslexic ? 'OpenDyslexic, sans-serif' : '"Varela Round", sans-serif',
      }}
    >
      {/* subtle animated background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 30%, rgba(246,176,18,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(100,80,200,0.03) 0%, transparent 50%)',
        }}
      />

      {/* header with tabs */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center border-b border-white/5 px-2 py-2 gap-2">
        <div className="flex items-center gap-2 px-2 mr-4">
          <span
            className="text-2xl font-bold"
            style={{ color: '#f6b012', fontFamily: '"Varela Round", sans-serif' }}
          >
            &amp;
          </span>
          <span className="text-sm text-white/60 lowercase hidden sm:inline">system tracker</span>
        </div>

        <div className="flex flex-wrap gap-1 flex-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors lowercase ${isActive
                    ? 'bg-[#f6b012]/20 text-[#f6b012]'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* content */}
      <div className="flex-1 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'members' && <MembersPanel />}
            {activeTab === 'front' && <FrontPanel />}
            {activeTab === 'history' && <FrontHistory />}
            {activeTab === 'analytics' && <AnalyticsPanel />}
            {activeTab === 'groups' && <GroupManager />}
            {activeTab === 'journal' && <JournalPanel />}
            {activeTab === 'chat' && <ChatPanel />}
            {activeTab === 'settings' && <SettingsPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
