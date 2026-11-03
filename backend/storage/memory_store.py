from typing import List, Dict, Optional
from backend.models.sensor_data import StoredSensorData

class MemoryStore:
    def __init__(self):
        self._data: Dict[str, StoredSensorData] = {}
        self._by_device: Dict[str, List[StoredSensorData]] = {}

    def save(self, reading: StoredSensorData):
        self._data[reading.reading_id] = reading
        if reading.device_id not in self._by_device:
            self._by_device[reading.device_id] = []
        self._by_device[reading.device_id].append(reading)

    def get(self, reading_id: str) -> Optional[StoredSensorData]:
        return self._data.get(reading_id)

    def get_by_device(self, device_id: str) -> List[StoredSensorData]:
        return self._by_device.get(device_id, [])

    def clear(self):
        self._data = {}
        self._by_device = {}

store = MemoryStore()
