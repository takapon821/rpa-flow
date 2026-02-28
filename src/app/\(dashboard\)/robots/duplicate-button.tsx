"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";

interface DuplicateRobotButtonProps {
  robotId: string;
}

export function DuplicateRobotButton({ robotId }: DuplicateRobotButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDuplicate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/robots/${robotId}/duplicate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "複製に失敗しました");
      }

      const data = await response.json();
      // Navigate to the editor of the duplicated robot
      router.push(data.editorUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : "複製に失敗しました";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleDuplicate}
        disabled={isLoading}
        className="rounded px-2 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        title="このロボットを複製"
      >
        <Copy size={16} />
      </button>
      {error && (
        <div className="text-xs text-red-600 mt-1">{error}</div>
      )}
    </>
  );
}
