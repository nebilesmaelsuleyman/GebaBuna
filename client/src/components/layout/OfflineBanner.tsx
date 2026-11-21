'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, X } from 'lucide-react';
import { OFFLINE_EVENT } from '../../services/api';

export const OfflineBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener(OFFLINE_EVENT, show);
    return () => window.removeEventListener(OFFLINE_EVENT, show);
  }, []);

  if (!visible) return null;

  return (
    <div role="status" className="mx-auto mt-3 flex max-w-[1200px] items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 md:mx-8 xl:mx-auto">
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">
        <strong>Offline sample data.</strong> The Buna server could not be reached, so this page shows example
        figures. Nothing you do here will be saved.
      </p>
      <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss" className="text-amber-700 hover:text-amber-950">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
