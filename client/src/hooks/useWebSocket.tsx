import { useEffect, useRef, useState, useCallback } from 'react';
import { TradingSignal, TechnicalIndicator } from '@shared/schema';

interface WebSocketData {
  signals: TradingSignal[];
  activeSignal: TradingSignal | null;
  indicators: TechnicalIndicator | null;
}

interface UseWebSocketReturn extends WebSocketData {
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [data, setData] = useState<WebSocketData>({
    signals: [],
    activeSignal: null,
    indicators: null,
  });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log('WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'INITIAL_DATA':
              setData({
                signals: message.data.signals || [],
                activeSignal: message.data.activeSignal || null,
                indicators: message.data.indicators || null,
              });
              break;
              
            case 'NEW_SIGNAL':
              setData(prev => ({
                ...prev,
                activeSignal: message.data,
                signals: [message.data, ...prev.signals].slice(0, 50),
              }));
              break;
              
            case 'SIGNAL_EXECUTED':
              setData(prev => ({
                ...prev,
                activeSignal: null,
                signals: prev.signals.map(signal => 
                  signal.id === message.data.id ? message.data : signal
                ),
              }));
              break;
              
            case 'INDICATORS_UPDATE':
              setData(prev => ({
                ...prev,
                indicators: message.data,
              }));
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        setConnectionError('WebSocket connection failed');
        setIsConnected(false);
        console.error('WebSocket error:', error);
      };
      
    } catch (error) {
      setConnectionError('Failed to create WebSocket connection');
      console.error('WebSocket creation error:', error);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    ...data,
    isConnected,
    connectionError,
    reconnect,
  };
}
