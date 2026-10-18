import React from 'react';

export default function Tabs({ tabs = [], activeTab, onChange, className = '' }) {
  return (
    <div className={`flex items-center gap-1 p-1 bg-appBg rounded-xl w-fit ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`px-4 py-2 rounded-lg text-[14px] font-medium transition-all ${
            activeTab === tab.value ? 'bg-surface shadow-card text-textPrimary' : 'text-textSecondary hover:text-textPrimary'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[11px] ${activeTab === tab.value ? 'bg-primary-light text-primary' : 'bg-surface text-textSecondary'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
