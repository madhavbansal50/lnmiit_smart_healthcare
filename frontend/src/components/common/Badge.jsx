import React from 'react';

export const RiskBadge = ({ level, size = 'md' }) => {
  const l = (level || 'NORMAL').toUpperCase();

  const styles = {
    NORMAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    MONITOR: 'bg-sky-50 text-sky-700 border-sky-200',
    ATTENTION: 'bg-amber-50 text-amber-700 border-amber-300',
    EMERGENCY: 'bg-red-50 text-red-700 border-red-300 animate-pulse'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3.5 py-1.5 text-sm font-bold'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${styles[l] || styles.NORMAL} ${sizes[size]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        l === 'EMERGENCY' ? 'bg-red-500' :
        l === 'ATTENTION' ? 'bg-amber-500' :
        l === 'MONITOR' ? 'bg-sky-500' : 'bg-emerald-500'
      }`} />
      {l}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const s = (status || 'ONLINE').toUpperCase();
  const isOnline = s === 'ONLINE' || s === 'ACTIVE';

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
      isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {s}
    </span>
  );
};
