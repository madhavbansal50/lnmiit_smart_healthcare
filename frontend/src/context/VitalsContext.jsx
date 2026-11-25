import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSocket } from '../services/socket';
import api from '../services/api';

const VitalsContext = createContext(null);

export const VitalsProvider = ({ children }) => {
  const [bed1Vitals, setBed1Vitals] = useState(null);
  const [bed2Vitals, setBed2Vitals] = useState(null);

  // Rolling history for live charts (last 30 ticks)
  const [bed1History, setBed1History] = useState([]);
  const [bed2History, setBed2History] = useState([]);

  // Active alerts list
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [currentEmergencyAlert, setCurrentEmergencyAlert] = useState(null);

  // Scenario states
  const [scenarios, setScenarios] = useState({ 1: 'NORMAL', 2: 'NORMAL' });
  const [socketConnected, setSocketConnected] = useState(false);

  // Raw ESP32 Dual Sensor State from Node-RED WebSocket bridge
  const [esp32Data, setEsp32Data] = useState({
    esp32_1: null,
    esp32_2: null,
    timestamp: null,
    isLiveHardware: false
  });

  const [esp32History, setEsp32History] = useState({
    esp32_1: [],
    esp32_2: []
  });

  const [nodeRedStatus, setNodeRedStatus] = useState({
    connected: false,
    url: 'ws://172.20.10.2:1880/ws/sensors',
    lastPacketTime: null
  });

  useEffect(() => {
    const socket = getSocket();
    setSocketConnected(socket.connected);

    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const handleSensorDataUpdate = (data) => {
      if (!data) return;
      const timeStr = new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setEsp32Data(data);

      if (data.esp32_1) {
        setEsp32History((prev) => ({
          ...prev,
          esp32_1: [...prev.esp32_1.slice(-29), { ...data.esp32_1, time: timeStr, timestamp: data.timestamp }]
        }));
      }

      if (data.esp32_2) {
        setEsp32History((prev) => ({
          ...prev,
          esp32_2: [...prev.esp32_2.slice(-29), { ...data.esp32_2, time: timeStr, timestamp: data.timestamp }]
        }));
      }
    };

    const handleNodeRedStatus = (status) => {
      if (status) {
        setNodeRedStatus((prev) => ({ ...prev, ...status }));
      }
    };

    socket.on('SENSOR_DATA_UPDATE', handleSensorDataUpdate);
    socket.on('NODERED_STATUS', handleNodeRedStatus);

    const handleVitalsUpdate = (payload) => {
      const timeStr = new Date(payload.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const chartPoint = {
        ...payload,
        time: timeStr
      };

      if (payload.bedNumber === 1) {
        setBed1Vitals(payload);
        setBed1History((prev) => [...prev.slice(-29), chartPoint]);
        if (payload.scenario) {
          setScenarios((prev) => ({ ...prev, 1: payload.scenario }));
        }
      } else if (payload.bedNumber === 2) {
        setBed2Vitals(payload);
        setBed2History((prev) => [...prev.slice(-29), chartPoint]);
        if (payload.scenario) {
          setScenarios((prev) => ({ ...prev, 2: payload.scenario }));
        }
      }
    };

    const handleEmergencyAlert = (alert) => {
      // Record alert in table/badge without displaying an intrusive full-screen modal
      setActiveAlerts((prev) => [alert, ...prev.slice(0, 19)]);
    };

    const handleScenarioChanged = ({ bedNumber, scenario }) => {
      setScenarios((prev) => ({ ...prev, [bedNumber]: scenario }));
    };

    socket.on('VITALS_UPDATE', handleVitalsUpdate);
    socket.on('EMERGENCY_ALERT', handleEmergencyAlert);
    socket.on('SCENARIO_CHANGED', handleScenarioChanged);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('SENSOR_DATA_UPDATE', handleSensorDataUpdate);
      socket.off('NODERED_STATUS', handleNodeRedStatus);
      socket.off('VITALS_UPDATE', handleVitalsUpdate);
      socket.off('EMERGENCY_ALERT', handleEmergencyAlert);
      socket.off('SCENARIO_CHANGED', handleScenarioChanged);
    };
  }, []);

  const changeScenario = async (bedNumber, scenario) => {
    try {
      await api.post('/devices/simulator/scenario', { bedNumber, scenario });
      setScenarios((prev) => ({ ...prev, [bedNumber]: scenario }));
    } catch (err) {
      console.error('Failed to update scenario:', err);
    }
  };

  const dismissEmergencyModal = () => {
    setCurrentEmergencyAlert(null);
  };

  const acknowledgeAlert = async (alertId) => {
    try {
      await api.put(`/doctors/alerts/${alertId}/acknowledge`);
      setActiveAlerts((prev) => prev.filter((a) => a.id !== alertId));
      if (currentEmergencyAlert?.id === alertId) {
        setCurrentEmergencyAlert(null);
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  return (
    <VitalsContext.Provider
      value={{
        socketConnected,
        esp32Data,
        esp32History,
        nodeRedStatus,
        bed1Vitals,
        bed2Vitals,
        bed1History,
        bed2History,
        activeAlerts,
        currentEmergencyAlert,
        scenarios,
        changeScenario,
        dismissEmergencyModal,
        acknowledgeAlert
      }}
    >
      {children}
    </VitalsContext.Provider>
  );
};

export const useVitals = () => {
  const context = useContext(VitalsContext);
  if (!context) {
    throw new Error('useVitals must be used within a VitalsProvider');
  }
  return context;
};
