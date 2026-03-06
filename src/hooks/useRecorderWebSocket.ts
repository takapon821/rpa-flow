'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { VisualStep } from './useVisualEditor';

interface HoveredElement {
  rect: { x: number; y: number; width: number; height: number };
  selector: string;
  tag: string;
  text: string;
}

interface ElementInfo {
  selector: string;
  altSelectors: string[];
  tag: string;
  text: string;
  rect: { x: number; y: number; width: number; height: number };
  suggestedAction: 'click' | 'type' | 'select';
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface StepExecutedMessage {
  type: 'step_executed';
  success: boolean;
  screenshot?: string;
  error?: string;
  url: string;
}

interface RecorderState {
  status: ConnectionStatus;
  screenshot: string | null;
  frameWidth: number;
  frameHeight: number;
  hoveredElement: HoveredElement | null;
  elementInfo: ElementInfo | null;
  currentUrl: string;
  currentTitle: string;
  actions: VisualStep[];
  sessionId: string | null;
}

export function useRecorderWebSocket() {
  const [state, setState] = useState<RecorderState>({
    status: 'disconnected',
    screenshot: null,
    frameWidth: 1280,
    frameHeight: 720,
    hoveredElement: null,
    elementInfo: null,
    currentUrl: '',
    currentTitle: '',
    actions: [],
    sessionId: null,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const stepExecutedCallbackRef = useRef<((msg: StepExecutedMessage) => void) | null>(null);
  const connectionParamsRef = useRef<{ workerWsUrl: string; token: string } | null>(null);
  const intentionalDisconnectRef = useRef(false);

  const sendMessage = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  const connect = useCallback((workerWsUrl: string, token: string): Promise<void> => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    intentionalDisconnectRef.current = false;
    connectionParamsRef.current = { workerWsUrl, token };
    setState((prev) => ({ ...prev, status: 'connecting' }));

    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${workerWsUrl}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryCountRef.current = 0;
        setState((prev) => ({ ...prev, status: 'connected' }));
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'ready':
              setState((prev) => ({
                ...prev,
                sessionId: msg.sessionId,
                currentUrl: msg.url,
                currentTitle: msg.title,
              }));
              break;

            case 'frame':
              setState((prev) => ({
                ...prev,
                screenshot: msg.data,
                frameWidth: msg.width,
                frameHeight: msg.height,
              }));
              // Ack the frame
              sendMessage('ack_frame');
              break;

            case 'element_info':
              setState((prev) => ({
                ...prev,
                elementInfo: {
                  selector: msg.selector,
                  altSelectors: msg.altSelectors,
                  tag: msg.tag,
                  text: msg.text,
                  rect: msg.rect,
                  suggestedAction: msg.suggestedAction,
                },
              }));
              break;

            case 'hover_result':
              setState((prev) => ({
                ...prev,
                hoveredElement: {
                  rect: msg.rect,
                  selector: msg.selector,
                  tag: msg.tag,
                  text: msg.text,
                },
              }));
              break;

            case 'navigated':
              setState((prev) => ({
                ...prev,
                currentUrl: msg.url,
                currentTitle: msg.title,
              }));
              break;

            case 'stopped':
              setState((prev) => ({
                ...prev,
                status: 'disconnected',
                actions: msg.actions || [],
                sessionId: null,
              }));
              break;

            case 'step_executed':
              stepExecutedCallbackRef.current?.(msg);
              break;

            case 'error':
              console.error('[recorder-ws] Server error:', msg.message);
              break;
          }
        } catch (err) {
          console.error('[recorder-ws] Parse error:', err);
        }
      };

      ws.onerror = () => {
        setState((prev) => ({ ...prev, status: 'error' }));
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        wsRef.current = null;
        setState((prev) => {
          if (prev.status === 'connected' || prev.status === 'connecting') {
            return { ...prev, status: 'disconnected' };
          }
          return prev;
        });

        // Auto-reconnect on unexpected disconnection
        if (!intentionalDisconnectRef.current && retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`[recorder-ws] Reconnecting (attempt ${retryCountRef.current}/${maxRetries})...`);
          const params = connectionParamsRef.current;
          if (params) {
            setTimeout(() => {
              // Re-attempt connection (fire-and-forget; don't chain to original promise)
              const retryWs = new WebSocket(`${params.workerWsUrl}?token=${params.token}`);
              wsRef.current = retryWs;
              setState((prev) => ({ ...prev, status: 'connecting' }));

              retryWs.onopen = ws.onopen;
              retryWs.onmessage = ws.onmessage;
              retryWs.onerror = ws.onerror;
              retryWs.onclose = ws.onclose;
            }, 1000 * retryCountRef.current);
          }
        }
      };
    });
  }, [sendMessage]);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    if (wsRef.current) {
      sendMessage('stop');
      // Give server time to process stop before closing
      setTimeout(() => {
        wsRef.current?.close();
        wsRef.current = null;
      }, 500);
    }
    setState((prev) => ({
      ...prev,
      status: 'disconnected',
      screenshot: null,
      sessionId: null,
    }));
  }, [sendMessage]);

  const sendClick = useCallback(
    (x: number, y: number) => sendMessage('click', { x, y }),
    [sendMessage]
  );

  const sendType = useCallback(
    (text: string) => sendMessage('type', { text }),
    [sendMessage]
  );

  const sendScroll = useCallback(
    (deltaX: number, deltaY: number) => sendMessage('scroll', { deltaX, deltaY }),
    [sendMessage]
  );

  const sendHover = useCallback(
    (x: number, y: number) => sendMessage('hover', { x, y }),
    [sendMessage]
  );

  const sendNavigate = useCallback(
    (url: string) => sendMessage('navigate', { url }),
    [sendMessage]
  );

  const sendStart = useCallback(
    (url: string, viewport?: { width: number; height: number }) =>
      sendMessage('start', { url, viewport }),
    [sendMessage]
  );

  const sendBack = useCallback(() => sendMessage('back'), [sendMessage]);
  const sendForward = useCallback(() => sendMessage('forward'), [sendMessage]);
  const sendRefresh = useCallback(() => sendMessage('refresh'), [sendMessage]);

  const clearElementInfo = useCallback(() => {
    setState((prev) => ({ ...prev, elementInfo: null }));
  }, []);

  const clearHover = useCallback(() => {
    setState((prev) => ({ ...prev, hoveredElement: null }));
  }, []);

  const sendExecuteStep = useCallback(
    (step: { actionType: string; config: Record<string, unknown> }): Promise<StepExecutedMessage> => {
      return new Promise((resolve, reject) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket not connected'));
          return;
        }
        stepExecutedCallbackRef.current = (msg) => {
          stepExecutedCallbackRef.current = null;
          resolve(msg);
        };
        sendMessage('execute_step', step);
        // Timeout after 30s
        setTimeout(() => {
          if (stepExecutedCallbackRef.current) {
            stepExecutedCallbackRef.current = null;
            reject(new Error('Step execution timed out'));
          }
        }, 30000);
      });
    },
    [sendMessage]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    sendStart,
    sendClick,
    sendType,
    sendScroll,
    sendHover,
    sendNavigate,
    sendBack,
    sendForward,
    sendRefresh,
    sendExecuteStep,
    clearElementInfo,
    clearHover,
  };
}
