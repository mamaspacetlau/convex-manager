import React from 'react';

export function StatusBadge({ status }) {
  let color = 'bg-gray-500';
  let text = 'Unknown';
  let pulse = false;

  if (status === 'running') {
    color = 'bg-green-500';
    text = 'Active';
  } else if (status === 'stopped') {
    color = 'bg-gray-500';
    text = 'Stopped';
  } else if (status === 'error') {
    color = 'bg-red-500';
    text = 'Error';
  } else if (status === 'starting') {
    color = 'bg-yellow-500';
    text = 'Starting';
    pulse = true;
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${color} ${pulse ? 'animate-pulse' : ''}`} />
      <span className="text-sm text-gray-400 font-medium">{text}</span>
    </div>
  );
}
