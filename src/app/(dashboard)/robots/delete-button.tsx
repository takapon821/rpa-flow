"use client";

import { deleteRobot } from "./actions";
import { Trash2 } from "lucide-react";
import { useTransition } from "react";

export function DeleteRobotButton({ robotId }: { robotId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (!confirm("このロボットを削除しますか？")) return;
        startTransition(() => deleteRobot(robotId));
      }}
      className="rounded px-2 py-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 size={14} />
    </button>
  );
}
