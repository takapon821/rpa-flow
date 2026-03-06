'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRecorderWebSocket } from '@/hooks/useRecorderWebSocket';
import { ActionConfirmDialog } from './ActionConfirmDialog';
import type { VisualStep } from '@/hooks/useVisualEditor';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Circle,
  CircleStop,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface PlaywrightRecorderPanelProps {
  onActionSelect: (step: Omit<VisualStep, 'id'>) => void;
}

export function PlaywrightRecorderPanel({
  onActionSelect,
}: PlaywrightRecorderPanelProps) {
  const recorder = useRecorderWebSocket();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [inputUrl, setInputUrl] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 });

  // Track whether we're recording
  const isRecording = recorder.status === 'connected' && recorder.sessionId !== null;

  // Draw screenshot on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !recorder.screenshot) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create or reuse image element
    if (!imageRef.current) {
      imageRef.current = new Image();
    }

    const img = imageRef.current;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw hover highlight
      if (recorder.hoveredElement) {
        const rect = recorder.hoveredElement.rect;
        const scaleX = canvas.width / recorder.frameWidth;
        const scaleY = canvas.height / recorder.frameHeight;

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          rect.x * scaleX,
          rect.y * scaleY,
          rect.width * scaleX,
          rect.height * scaleY
        );
      }
    };
    img.src = `data:image/jpeg;base64,${recorder.screenshot}`;
  }, [recorder.screenshot, recorder.hoveredElement, recorder.frameWidth, recorder.frameHeight]);

  // Resize canvas to fit container
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          // Maintain 16:9 aspect ratio within container
          const aspectRatio = 16 / 9;
          let canvasW = width;
          let canvasH = width / aspectRatio;
          if (canvasH > height) {
            canvasH = height;
            canvasW = height * aspectRatio;
          }
          setCanvasSize({ width: Math.floor(canvasW), height: Math.floor(canvasH) });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Convert canvas coords to viewport coords
  const canvasToViewport = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = recorder.frameWidth / rect.width;
      const scaleY = recorder.frameHeight / rect.height;
      return {
        x: Math.round((clientX - rect.left) * scaleX),
        y: Math.round((clientY - rect.top) * scaleY),
      };
    },
    [recorder.frameWidth, recorder.frameHeight]
  );

  // Start recording session
  const handleStartRecording = async () => {
    const url = inputUrl.trim();
    if (!url) return;

    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    setIsStarting(true);

    try {
      // Get token from Next.js API
      const res = await fetch('/api/recorder/start', { method: 'POST' });
      if (!res.ok) {
        throw new Error('Failed to start recorder session');
      }

      const { workerWsUrl, token } = await res.json();

      // Connect WebSocket (returns Promise, resolves on open)
      await recorder.connect(workerWsUrl, token);

      // Connection is now open, send start immediately
      recorder.sendStart(fullUrl, { width: 1280, height: 720 });
    } catch (err) {
      console.error('Failed to start recording:', err);
    } finally {
      setIsStarting(false);
    }
  };

  // Mouse event handlers
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isRecording) return;

      // Debounce hover to 100ms
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
      hoverTimerRef.current = setTimeout(() => {
        const { x, y } = canvasToViewport(e.clientX, e.clientY);
        recorder.sendHover(x, y);
      }, 100);
    },
    [isRecording, canvasToViewport, recorder]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isRecording) return;
      const { x, y } = canvasToViewport(e.clientX, e.clientY);
      recorder.sendClick(x, y);
    },
    [isRecording, canvasToViewport, recorder]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (!isRecording) return;
      e.preventDefault();
      recorder.sendScroll(0, e.deltaY);
    },
    [isRecording, recorder]
  );

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
    recorder.clearHover();
  }, [recorder]);

  // URL bar navigation
  const handleUrlNavigate = () => {
    if (!isRecording) {
      handleStartRecording();
      return;
    }
    const url = inputUrl.trim();
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    recorder.sendNavigate(fullUrl);
  };

  // Action confirmed from dialog
  const handleActionConfirm = (action: {
    type: 'click' | 'type' | 'select' | 'scroll' | 'wait';
    selector: string;
    value?: string;
  }) => {
    const step: Omit<VisualStep, 'id'> = {
      type: action.type,
      selector: action.selector,
      value: action.value,
      description:
        action.type === 'click'
          ? `${action.selector} をクリック`
          : action.type === 'type'
            ? `${action.selector} に入力: "${action.value}"`
            : action.type === 'select'
              ? `${action.selector} を選択`
              : `待機`,
    };

    onActionSelect(step);
    recorder.clearElementInfo();
  };

  // Update URL bar when page navigates
  useEffect(() => {
    if (recorder.currentUrl) {
      setInputUrl(recorder.currentUrl);
    }
  }, [recorder.currentUrl]);

  // Connection status indicator
  const statusColor =
    recorder.status === 'connected'
      ? 'text-green-500'
      : recorder.status === 'connecting'
        ? 'text-yellow-500'
        : recorder.status === 'error'
          ? 'text-red-500'
          : 'text-gray-400';

  return (
    <div className="flex flex-col h-full relative bg-white">
      {/* URL bar + controls */}
      <div className="flex items-center gap-1.5 p-2 border-b border-gray-200 bg-gray-50">
        {/* Navigation buttons */}
        <button
          onClick={() => recorder.sendBack()}
          disabled={!isRecording}
          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="戻る"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => recorder.sendForward()}
          disabled={!isRecording}
          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="進む"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => recorder.sendRefresh()}
          disabled={!isRecording}
          className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          title="更新"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* URL input */}
        <input
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUrlNavigate()}
          placeholder="https://example.com"
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {/* Start/Stop button */}
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            disabled={isStarting || !inputUrl.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStarting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Circle className="w-4 h-4" />
            )}
            {isStarting ? '接続中...' : '録画開始'}
          </button>
        ) : (
          <button
            onClick={() => recorder.disconnect()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-700 text-white rounded hover:bg-gray-800 transition"
          >
            <CircleStop className="w-4 h-4" />
            停止
          </button>
        )}
      </div>

      {/* Canvas display area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden flex items-center justify-center bg-gray-100"
      >
        {recorder.screenshot ? (
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            onMouseMove={handleMouseMove}
            onClick={handleClick}
            onWheel={handleWheel}
            onMouseLeave={handleMouseLeave}
            className="cursor-crosshair shadow-lg"
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 text-sm gap-3">
            {recorder.status === 'connecting' ? (
              <>
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p>ブラウザに接続中...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p>URLを入力して「録画開始」をクリック</p>
                <p className="text-xs text-gray-300">
                  Playwrightでブラウザを操作し、アクションを記録します
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-gray-200 bg-gray-50 text-xs text-gray-500">
        <div className={`flex items-center gap-1 ${statusColor}`}>
          {recorder.status === 'connected' ? (
            <Wifi className="w-3 h-3" />
          ) : (
            <WifiOff className="w-3 h-3" />
          )}
          {recorder.status === 'connected'
            ? '接続中'
            : recorder.status === 'connecting'
              ? '接続処理中...'
              : recorder.status === 'error'
                ? 'エラー'
                : '未接続'}
        </div>
        {recorder.currentUrl && (
          <div className="truncate flex-1">{recorder.currentUrl}</div>
        )}
        {recorder.hoveredElement && (
          <div className="text-gray-400 truncate max-w-xs">
            {recorder.hoveredElement.tag}
            {recorder.hoveredElement.text && `: ${recorder.hoveredElement.text.slice(0, 30)}`}
          </div>
        )}
      </div>

      {/* Action confirm dialog */}
      {recorder.elementInfo && (
        <ActionConfirmDialog
          elementInfo={recorder.elementInfo}
          onConfirm={handleActionConfirm}
          onCancel={() => recorder.clearElementInfo()}
          onType={(text) => recorder.sendType(text)}
        />
      )}
    </div>
  );
}
