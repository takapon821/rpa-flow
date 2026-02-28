'use client';

import { Copy } from 'lucide-react';
import { useTransition } from 'react';

export function DuplicateRobotButton({ robotId }: { robotId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDuplicate = () => {
    startTransition(async () => {
      try {
        // Duplicate functionality to be implemented
        console.log('Duplicate robot:', robotId);
      } catch (error) {
        console.error('Failed to duplicate robot:', error);
      }
    });
  };

  return (
    <button
      disabled={isPending}
      onClick={handleDuplicate}
      className="rounded px-2 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
      title="Duplicate robot"
    >
      <Copy size={14} />
    </button>
  );
}
