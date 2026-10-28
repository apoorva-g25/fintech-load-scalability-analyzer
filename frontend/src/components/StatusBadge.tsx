import React from 'react';

interface Props {
  status: string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const s = status.toUpperCase();
  let colorClasses = 'bg-gray-800 text-gray-300 border-gray-700';

  if (s === 'SUCCESS' || s === 'COMPLETED') {
    colorClasses = 'bg-emerald-950/70 text-emerald-400 border-emerald-800';
  } else if (s === 'RUNNING') {
    colorClasses = 'bg-cyan-950/70 text-cyan-400 border-cyan-700 animate-pulse';
  } else if (s === 'QUEUED') {
    colorClasses = 'bg-amber-950/70 text-amber-400 border-amber-800';
  } else if (s === 'FLAGGED') {
    colorClasses = 'bg-amber-950/70 text-amber-400 border-amber-700';
  } else if (s === 'FAILED') {
    colorClasses = 'bg-rose-950/70 text-rose-400 border-rose-800';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}>
      {s === 'RUNNING' && <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-cyan-400 animate-ping"></span>}
      {s}
    </span>
  );
};
