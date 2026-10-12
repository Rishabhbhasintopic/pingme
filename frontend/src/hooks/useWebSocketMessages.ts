import { useEffect, useRef, useState } from 'react';
import { getStoredApiUrl, getStoredToken } from '../services/storage';

interface WebSocketCallbacks {
  onMessageCreated?: (data: any) => void;
  onReplyCreated?: (data: any) => void;
  onMessageRead?: (data: any) => void;
  onSync?: () => void;
}

export function useWebSocketMessages(callbacks: WebSocketCallbacks) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

  useEffect(() => {
    let unmounted = false;

    const connect = () => {
      if (unmounted) return;
      const baseUrl = getStoredApiUrl();
      const token = getStoredToken();

      // Convert http(s) to ws(s)
      const wsUrl = baseUrl.replace(/^http/, 'ws') + `/api/v1/ws?token=${encodeURIComponent(token)}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (unmounted) return;
          setIsConnected(true);
          // Ping every 25 seconds to keep connection alive through proxies
          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'message_created' && callbacks.onMessageCreated) {
              callbacks.onMessageCreated(payload.data);
            } else if (payload.type === 'reply_created' && callbacks.onReplyCreated) {
              callbacks.onReplyCreated(payload.data);
            } else if (payload.type === 'message_read' && callbacks.onMessageRead) {
              callbacks.onMessageRead(payload.data);
            }
          } catch (e) {
            console.debug('WS parse error:', e);
          }
        };

        ws.onclose = () => {
          if (unmounted) return;
          setIsConnected(false);
          clearInterval(pingIntervalRef.current);
          // Reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };
      } catch (err) {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      }
    };

    connect();

    // Fallback polling interval every 5 seconds to ensure synchronization
    const pollInterval = setInterval(() => {
      if (callbacks.onSync) {
        callbacks.onSync();
      }
    }, 5000);

    return () => {
      unmounted = true;
      clearInterval(pollInterval);
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [callbacks.onMessageCreated, callbacks.onReplyCreated, callbacks.onMessageRead, callbacks.onSync]);

  return { isConnected };
}
