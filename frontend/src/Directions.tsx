import { useState, useEffect, useRef } from 'react'
import { useMapsLibrary, useMap } from '@vis.gl/react-google-maps'
import PlaceAutocomplete from './PlaceAutocomplete'
import type { PlaceAutocompleteHandle } from './PlaceAutocomplete'

import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'

import SwapVertIcon from '@mui/icons-material/SwapVert'
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk'
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus'
import DirectionsTransitIcon from '@mui/icons-material/DirectionsTransit'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'

interface DirectionsProps {
  onActiveLines: (lines: string[]) => void
  fetchCount: number
}

interface RouteStep {
  type: 'walk' | 'transit'
  duration: string
  lineName?: string
  vehicleType?: string
  numStops?: number
  departureStop?: string
  arrivalStop?: string
}

export default function Directions({ onActiveLines, fetchCount }: DirectionsProps) {
  const map = useMap()
  const routesLib = useMapsLibrary('routes')

  const [directionsService, setDirectionsService] =
    useState<google.maps.DirectionsService | null>(null)
  const [directionsRenderer, setDirectionsRenderer] =
    useState<google.maps.DirectionsRenderer | null>(null)

  const [origin, setOrigin] = useState<google.maps.places.PlaceResult | null>(null)
  const [destination, setDestination] = useState<google.maps.places.PlaceResult | null>(null)

  const [directionsResult, setDirectionsResult] =
    useState<google.maps.DirectionsResult | null>(null)
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null)

  const originRef = useRef<PlaceAutocompleteHandle>(null)
  const destinationRef = useRef<PlaceAutocompleteHandle>(null)

  const [refreshProgress, setRefreshProgress] = useState(0)

  useEffect(() => {
    setRefreshProgress(0)
  }, [fetchCount])

  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshProgress(prev => Math.min(prev + 1, 100))
    }, 100)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!routesLib || !map) return

    const service = new routesLib.DirectionsService()
    const renderer = new routesLib.DirectionsRenderer({
      map,
      suppressMarkers: false,
    })

    setDirectionsService(service)
    setDirectionsRenderer(renderer)

    return () => {
      renderer.setMap(null)
    }
  }, [routesLib, map])

  useEffect(() => {
    if (!directionsRenderer || !directionsResult) return

    if (selectedRouteIndex === null) {
      directionsRenderer.setDirections({ routes: [] } as any)
      return
    }

    directionsRenderer.setDirections(directionsResult)
    directionsRenderer.setRouteIndex(selectedRouteIndex)
  }, [selectedRouteIndex, directionsResult, directionsRenderer])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!directionsService || !directionsRenderer) return
    if (!origin?.geometry?.location || !destination?.geometry?.location) return

    setSelectedRouteIndex(null)

    directionsService.route(
      {
        origin: origin.geometry.location,
        destination: destination.geometry.location,
        travelMode: google.maps.TravelMode.TRANSIT,
        provideRouteAlternatives: true,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResult(result)
        } else {
          console.error('Directions request failed:', status)
        }
      }
    )
  }

  const handleClear = () => {
    if (directionsRenderer) {
      directionsRenderer.setDirections({ routes: [] } as any)
    }
    setDirectionsResult(null)
    setSelectedRouteIndex(null)
    setOrigin(null)
    setDestination(null)
    onActiveLines([])
    originRef.current?.setValue('')
    destinationRef.current?.setValue('')
  }

  const handleSwap = () => {
    const tempOrigin = origin
    const tempDestination = destination

    setOrigin(tempDestination)
    setDestination(tempOrigin)

    const originText = tempOrigin?.name || tempOrigin?.formatted_address || ''
    const destText = tempDestination?.name || tempDestination?.formatted_address || ''
    originRef.current?.setValue(destText)
    destinationRef.current?.setValue(originText)
  }

  const parseRouteSteps = (route: google.maps.DirectionsRoute): RouteStep[] => {
    const leg = route.legs[0]
    if (!leg?.steps) return []

    return leg.steps.map(step => {
      if (step.travel_mode === 'TRANSIT') {
        return {
          type: 'transit' as const,
          duration: step.duration?.text || '?',
          lineName: step.transit?.line?.short_name || step.transit?.line?.name || '?',
          vehicleType: step.transit?.line?.vehicle?.name || 'Transit',
          numStops: step.transit?.num_stops,
          departureStop: step.transit?.departure_stop?.name,
          arrivalStop: step.transit?.arrival_stop?.name,
        }
      }
      return {
        type: 'walk' as const,
        duration: step.duration?.text || '?',
      }
    })
  }

  const getLineNames = (route: google.maps.DirectionsRoute): string[] => {
    const leg = route.legs[0]
    if (!leg?.steps) return []

    return leg.steps
      .filter(step => step.travel_mode === 'TRANSIT')
      .map(step => step.transit?.line?.short_name || '')
      .filter(name => name !== '')
  }

  const routes = directionsResult?.routes || []

  return (
    <div style={{
      position: 'absolute',
      top: 10,
      left: 10,
      background: 'white',
      padding: 16,
      borderRadius: 12,
      zIndex: 1,
      maxWidth: 380,
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    }}>
      <LinearProgress
        variant="determinate"
        value={refreshProgress}
        sx={{
          height: 3,
          borderRadius: 2,
          marginBottom: 1.5,
          backgroundColor: '#e0e0e0',
          '& .MuiLinearProgress-bar': { backgroundColor: '#1976d2' },
        }}
      />
      <p style={{ margin: '0 0 12px 0', fontSize: '0.7em', color: '#999', textAlign: 'center' }}>
        Live bus positions update every 10s
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75em', marginBottom: 2, color: '#666' }}>From</label>
            <PlaceAutocomplete ref={originRef} onPlaceSelect={setOrigin} placeholder='Enter origin...' />
          </div>
          <IconButton onClick={handleSwap} size="small" sx={{ marginTop: '14px' }} title="Swap origin and destination">
            <SwapVertIcon />
          </IconButton>
        </div>

        <div style={{ marginTop: 8, marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.75em', marginBottom: 2, color: '#666' }}>To</label>
          <PlaceAutocomplete ref={destinationRef} onPlaceSelect={setDestination} placeholder='Enter destination...' />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button type='submit' variant='contained' startIcon={<SearchIcon />} size='small' fullWidth>
            Get Routes
          </Button>
          <Button type='button' variant='outlined' startIcon={<ClearIcon />} size='small' onClick={handleClear}>
            Clear
          </Button>
        </div>
      </form>

      {routes.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, fontSize: '0.9em' }}>
            {routes.length} route{routes.length !== 1 ? 's' : ''} found
          </p>

          {routes.map((route, index) => {
            const leg = route.legs[0]
            const isSelected = selectedRouteIndex === index
            const steps = parseRouteSteps(route)

            return (
              <div
                key={index}
                onClick={() => {
                  setSelectedRouteIndex(index)
                  onActiveLines(getLineNames(route))
                }}
                style={{
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  background: isSelected ? '#e3f2fd' : '#fff',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05em' }}>
                    {leg?.duration?.text}
                  </span>
                  {leg?.departure_time && leg?.arrival_time && (
                    <span style={{ fontSize: '0.8em', color: '#666' }}>
                      {leg.departure_time.text} — {leg.arrival_time.text}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {i > 0 && (
                        <span style={{ color: '#bbb', margin: '0 2px', fontSize: '0.8em' }}>›</span>
                      )}
                      {step.type === 'walk' ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          padding: '2px 6px', borderRadius: 4, backgroundColor: '#f5f5f5',
                        }}>
                          <DirectionsWalkIcon sx={{ fontSize: 16, color: '#757575' }} />
                          <span style={{ fontSize: '0.8em', color: '#555' }}>{step.duration}</span>
                        </div>
                      ) : (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          padding: '2px 6px', borderRadius: 4, backgroundColor: '#e3f2fd',
                        }}>
                          {step.vehicleType === 'Bus' ? (
                            <DirectionsBusIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                          ) : (
                            <DirectionsTransitIcon sx={{ fontSize: 16, color: '#1976d2' }} />
                          )}
                          <span style={{
                            backgroundColor: '#1976d2', color: 'white',
                            padding: '1px 6px', borderRadius: 3, fontSize: '0.75em', fontWeight: 700,
                          }}>
                            {step.lineName}
                          </span>
                          <span style={{ fontSize: '0.8em', color: '#555' }}>{step.duration}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {isSelected && steps.filter(s => s.type === 'transit').length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e0e0e0' }}>
                    {steps.filter(s => s.type === 'transit').map((step, i) => (
                      <div key={i} style={{ fontSize: '0.8em', color: '#555', marginBottom: 4 }}>
                        <strong>{step.vehicleType} {step.lineName}</strong>
                        {step.numStops && ` · ${step.numStops} stops`}
                        {step.departureStop && step.arrivalStop && (
                          <div style={{ color: '#777', marginTop: 2 }}>
                            {step.departureStop} → {step.arrivalStop}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
