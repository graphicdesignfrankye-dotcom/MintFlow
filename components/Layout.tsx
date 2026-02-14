
import React from 'react';
import { LayoutDashboard, List, BrainCircuit, PiggyBank, Settings, Zap, Repeat, ArrowRightLeft } from 'lucide-react';
import { translations } from '../utils/i18n';
import { ProfileType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'list' | 'ai' | 'settings' | 'ricariche' | 'subscriptions' | 'extra';
  setActiveTab: (tab: 'dashboard' | 'list' | 'ai' | 'settings' | 'ricariche' | 'subscriptions' | 'extra') => void;
  lang?: 'it' | 'en';
  currentProfile?: ProfileType;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, lang = 'it', currentProfile = 'personal' }) => {
  const t = translations[lang].nav;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Header Desktop */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-emerald-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
              <PiggyBank className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              MintFlow
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-emerald-50 dark:border-gray-700">
            <NavButton 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')}
              icon={<LayoutDashboard size={18} />}
              label={t.dashboard}
            />
            <NavButton 
              active={activeTab === 'list'} 
              onClick={() => setActiveTab('list')}
              icon={<List size={18} />}
              label={t.expenses}
            />
            <NavButton 
              active={activeTab === 'extra'} 
              onClick={() => setActiveTab('extra')}
              icon={<ArrowRightLeft size={18} />}
              label={t.extra}
            />
            <NavButton 
              active={activeTab === 'subscriptions'} 
              onClick={() => setActiveTab('subscriptions')}
              icon={<Repeat size={18} />}
              label={t.subscriptions}
            />
            <NavButton 
              active={activeTab === 'ricariche'} 
              onClick={() => setActiveTab('ricariche')}
              icon={<Zap size={18} />}
              label={t.wallets}
            />
            <NavButton 
              active={activeTab === 'ai'} 
              onClick={() => setActiveTab('ai')}
              icon={<BrainCircuit size={18} />}
              label={t.ai}
            />
            <NavButton 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')}
              icon={<Settings size={18} />}
              label={t.settings}
            />
          </div>
        </div>
      </header>

      <main>{children}</main>

      {/* Bottom Nav Scorrevole per Mobile (Mostra tutte le sezioni) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-emerald-100 dark:border-gray-800 h-20 px-4 flex items-center overflow-x-auto no-scrollbar gap-8 pb-4 transition-colors z-50">
        <MobileNavButton 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')}
          icon={<LayoutDashboard />}
          label="Home"
        />
        <MobileNavButton 
          active={activeTab === 'list'} 
          onClick={() => setActiveTab('list')}
          icon={<List />}
          label={t.expenses}
        />
        <MobileNavButton 
          active={activeTab === 'extra'} 
          onClick={() => setActiveTab('extra')}
          icon={<ArrowRightLeft />}
          label={t.extra}
        />
        <MobileNavButton 
          active={activeTab === 'subscriptions'} 
          onClick={() => setActiveTab('subscriptions')}
          icon={<Repeat />}
          label={t.subscriptions.substring(0, 5) + '.'}
        />
        <MobileNavButton 
          active={activeTab === 'ricariche'} 
          onClick={() => setActiveTab('ricariche')}
          icon={<Zap />}
          label={t.wallets}
        />
        <MobileNavButton 
          active={activeTab === 'ai'} 
          onClick={() => setActiveTab('ai')}
          icon={<BrainCircuit />}
          label="AI"
        />
        <MobileNavButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')}
          icon={<Settings />}
          label={t.settings.substring(0, 4) + '.'}
        />
      </nav>
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
      active 
        ? 'bg-emerald-500 text-white shadow-md font-semibold' 
        : 'text-emerald-600 dark:text-gray-400 hover:bg-emerald-50 dark:hover:bg-gray-700/50'
    }`}
  >
    {icon}
    <span className="text-sm">{label}</span>
  </button>
);

const MobileNavButton = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all min-w-[60px] shrink-0 ${
      active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'
    }`}
  >
    {React.cloneElement(icon, { size: 22, strokeWidth: active ? 2.5 : 2 })}
    <span className="text-[10px] font-bold uppercase tracking-tighter truncate">{label}</span>
  </button>
);
