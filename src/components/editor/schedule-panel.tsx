"use client";

import { useState, useCallback } from "react";
import { Clock, Save, AlertCircle } from "lucide-react";

interface RobotSchedule {
  enabled: boolean;
  type: "cron" | "interval";
  cron?: string;
  interval?: "hourly" | "daily" | "weekly";
  timezone?: string;
  nextRunAt?: string;
}

interface SchedulePanelProps {
  robotId: string;
  schedule: RobotSchedule | null;
  onScheduleUpdate?: (schedule: RobotSchedule) => void;
}

export function SchedulePanel({
  robotId,
  schedule,
  onScheduleUpdate,
}: SchedulePanelProps) {
  const currentSchedule = schedule || {
    enabled: false,
    type: "interval",
    interval: "daily",
    timezone: "Asia/Tokyo",
  };

  const [enabled, setEnabled] = useState(currentSchedule.enabled);
  const [type, setType] = useState<"cron" | "interval">(currentSchedule.type);
  const [interval, setInterval] = useState<"hourly" | "daily" | "weekly">(
    currentSchedule.interval || "daily"
  );
  const [cron, setCron] = useState(currentSchedule.cron || "0 9 * * *");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const payload: Record<string, unknown> = {
        enabled,
        type,
      };

      if (type === "interval") {
        payload.interval = interval;
      } else if (type === "cron") {
        payload.cron = cron;
      }

      const response = await fetch(`/api/robots/${robotId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update schedule");
      }

      const data = await response.json();
      onScheduleUpdate?.(data.robot.schedule);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [robotId, enabled, type, interval, cron, onScheduleUpdate]);

  const nextRunAt = currentSchedule.nextRunAt
    ? new Date(currentSchedule.nextRunAt).toLocaleString("ja-JP")
    : "Not scheduled";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <Clock size={18} className="text-gray-500" />
        <h2 className="text-sm font-semibold text-gray-900">Schedule</h2>
      </div>

      <div className="space-y-4">
        {/* Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600">Enable Schedule</label>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              enabled ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {enabled && (
          <>
            {/* Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-gray-500">
                Schedule Type
              </label>
              <div className="flex gap-2">
                {["interval", "cron"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t as "cron" | "interval")}
                    className={`flex-1 rounded px-3 py-2 text-sm transition-colors ${
                      type === t
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {t === "interval" ? "Simple" : "Cron"}
                  </button>
                ))}
              </div>
            </div>

            {/* Interval Selection */}
            {type === "interval" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-gray-500">
                  Frequency
                </label>
                <select
                  value={interval}
                  onChange={(e) =>
                    setInterval(
                      e.target.value as "hourly" | "daily" | "weekly"
                    )
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="hourly">Hourly (Every hour)</option>
                  <option value="daily">Daily (9:00 AM JST)</option>
                  <option value="weekly">Weekly (Monday 9:00 AM JST)</option>
                </select>
              </div>
            )}

            {/* Cron Input */}
            {type === "cron" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-gray-500">
                  Cron Expression
                </label>
                <input
                  type="text"
                  value={cron}
                  onChange={(e) => setCron(e.target.value)}
                  placeholder="0 9 * * *"
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500">
                  Format: minute hour day month weekday (JST)
                </p>
              </div>
            )}

            {/* Next Run Time */}
            <div className="rounded bg-gray-50 p-3">
              <p className="text-xs text-gray-600">Next Run Time</p>
              <p className="text-sm font-mono text-gray-900">{nextRunAt}</p>
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="flex gap-2 rounded bg-red-50 p-3">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-600" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="rounded bg-green-50 p-3">
            <p className="text-sm text-green-700">Schedule updated successfully</p>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={16} />
          {loading ? "Saving..." : "Save Schedule"}
        </button>
      </div>
    </div>
  );
}
