import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [selectedStation, setSelectedStation] = useState('BHARATI');
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'reconnecting' | 'disconnected'
  const [blackout, setBlackout] = useState(false);
  const [liveData, setLiveData] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [messages, setMessages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });

    newSocket.on('connect', () => {
      console.log('[APP] Connected');
      setConnectionStatus('connected');

      // Seed existing alerts from DB so pages don't start empty
      fetch('/api/alerts?unresolved=true&limit=100')
        .then(r => r.json())
        .then(existing => {
          setAlerts(prev => {
            const map = new Map();
            [...existing, ...prev].forEach(a => map.set(a.id, a));
            return Array.from(map.values()).slice(0, 200);
          });
        })
        .catch(() => {});
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      console.log(`[APP] Reconnecting... attempt ${attempt}`);
      setConnectionStatus('reconnecting');
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`[APP] Disconnected: ${reason}`);
      setConnectionStatus('disconnected');
    });

    newSocket.on('reconnect', () => {
      console.log('[APP] Reconnected');
      setConnectionStatus('connected');
      // Re-subscribe to channels after reconnect
      ['BHARATI', 'MAITRI'].forEach(stationId => {
        ['energy', 'environment', 'infrastructure', 'logistics'].forEach(type => {
          newSocket.emit('subscribe:sensor', { stationId, type });
        });
        newSocket.emit('subscribe:alerts', { stationId });
      });
      newSocket.emit('subscribe:blackout');
    });

    // Subscribe to all sensor channels
    ['BHARATI', 'MAITRI'].forEach(stationId => {
      ['energy', 'environment', 'infrastructure', 'logistics'].forEach(type => {
        newSocket.emit('subscribe:sensor', { stationId, type });
      });
      newSocket.emit('subscribe:alerts', { stationId });
    });
    newSocket.emit('subscribe:blackout');

    newSocket.on('reading', (reading) => {
      const key = `${reading.stationId}:${reading.type}`;
      setLiveData(prev => ({
        ...prev,
        [key]: { ...prev[key], ...reading, _receivedAt: Date.now() },
      }));
    });

    newSocket.on('alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 200));
    });

    newSocket.on('alert:updated', (alert) => {
      setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
    });

    newSocket.on('blackout:status', ({ active }) => {
      setBlackout(active);
    });

    newSocket.on('blackout:drain', ({ processed, total, done }) => {
      setLiveData(prev => ({
        ...prev,
        _drainProgress: { processed, total, done },
      }));
    });

    // Feature 1: live notification dispatch events
    newSocket.on('notification:new', (notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 200));
    });

    // Feature 2: live chat message events
    newSocket.on('message:new', (message) => {
      setMessages(prev => [...prev, message]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const send = useCallback((event, data) => {
    if (socket) socket.emit(event, data);
  }, [socket]);

  const getReading = useCallback((stationId, type) => {
    const key = `${stationId}:${type}`;
    return liveData?.[key] || null;
  }, [liveData]);

  const getAlertsForStation = useCallback((stationId) => {
    return alerts.filter(a => a.stationId === stationId || !stationId);
  }, [alerts]);

  return (
    <AppContext.Provider value={{
      selectedStation, setSelectedStation,
      socket, connected: connectionStatus === 'connected', connectionStatus,
      send,
      blackout, setBlackout,
      liveData, getReading,
      alerts, getAlertsForStation,
      notifications,
      messages,
      sidebarOpen, setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
