import { useMonitoring } from '../context/MonitoringContext';

export function useMonitoringData() {
  return useMonitoring();
}
