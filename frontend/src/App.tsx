import { useState, useEffect } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow } from '@vis.gl/react-google-maps'
import Directions from './Directions'
import './App.css'

interface BusPosition {
  vehicle_ref: string
  line_ref: string
  published_line_name: string
  direction: string
  latitude: number
  longitude: number
  bearing: number | null
  origin_name: string
  destination_name: string
  operator_ref: string
  recorded_at: string
  provider: string
}

interface BusPositionsResponse {
  buses: BusPosition[]
  last_updated: string
  count: number
}

function App() {
  const [busPositions, setBusPositions] = useState<BusPositionsResponse | null>(null)
  const [selectedBus, setSelectedBus] = useState<BusPosition | null>(null)
  const [activeLines, setActiveLines] = useState<string[]>([])
  const [fetchCount, setFetchCount] = useState(0)

  useEffect(() => {
    const fetchBusPositions = () => {
      fetch('http://127.0.0.1:8000/api/buses/positions')
        .then(res => res.json())
        .then(data => {
          setBusPositions(data)
          setFetchCount(prev => prev + 1)
        })
        .catch(console.error)
    }

    fetchBusPositions()
    const intervalId = setInterval(fetchBusPositions, 10_000)
    return () => clearInterval(intervalId)
  }, [])

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <Map
        style={{ width: '100vw', height: '100vh' }}
        defaultCenter={{ lat: 53.408, lng: -2.991 }}
        defaultZoom={12}
        gestureHandling='greedy'
        disableDefaultUI
        mapId='DEMO_MAP_ID'
      >
        <Directions onActiveLines={setActiveLines} fetchCount={fetchCount} />

        {busPositions?.buses
          .filter(bus => activeLines.some(line => bus.published_line_name.startsWith(line)))
          .map(bus => (
            <AdvancedMarker
              key={bus.vehicle_ref}
              position={{ lat: bus.latitude, lng: bus.longitude }}
              title={`${bus.published_line_name}: ${bus.origin_name} → ${bus.destination_name}`}
              onClick={() => setSelectedBus(bus)}
            >
              <Pin
                background={bus.provider === 'stagecoach' ? '#e65100' : '#1976d2'}
                glyphColor='#ffffff'
                borderColor={bus.provider === 'stagecoach' ? '#bf360c' : '#0d47a1'}
              >
                {bus.published_line_name}
              </Pin>
            </AdvancedMarker>
          ))}

        {selectedBus && (
          <InfoWindow
            position={{ lat: selectedBus.latitude, lng: selectedBus.longitude }}
            onCloseClick={() => setSelectedBus(null)}
          >
            <div>
              <h3 style={{ margin: '0 0 8px 0' }}>
                Route {selectedBus.published_line_name}
              </h3>
              <p style={{ margin: '4px 0' }}>
                <strong>From:</strong> {selectedBus.origin_name}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>To:</strong> {selectedBus.destination_name}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Operator:</strong>{' '}
                <span style={{
                  color: selectedBus.provider === 'stagecoach' ? '#e65100' : '#1976d2',
                  fontWeight: 600,
                }}>
                  {selectedBus.provider === 'stagecoach' ? 'Stagecoach' : 'Arriva'}
                </span>
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Vehicle:</strong> {selectedBus.vehicle_ref}
              </p>
              <p style={{ margin: '4px 0', fontSize: '0.85em', color: '#666' }}>
                Last updated: {new Date(selectedBus.recorded_at).toLocaleTimeString()}
              </p>
            </div>
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  )
}

export default App
