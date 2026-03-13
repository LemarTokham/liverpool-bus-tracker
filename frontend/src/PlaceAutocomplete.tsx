import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'


interface PlaceAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void
  placeholder?: string
}


export interface PlaceAutocompleteHandle {
  setValue: (text: string) => void
}

const PlaceAutocomplete = forwardRef<PlaceAutocompleteHandle, PlaceAutocompleteProps>(
  ({ onPlaceSelect, placeholder }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)

    const placesLib = useMapsLibrary('places')
    
    useImperativeHandle(ref, () => ({
      setValue: (text: string) => {
        if (inputRef.current) {
          inputRef.current.value = text
        }
      },
    }))

    useEffect(() => {
      if (!placesLib || !inputRef.current) return

      const ac = new placesLib.Autocomplete(inputRef.current, {
        fields: ['geometry', 'name', 'formatted_address'],
        componentRestrictions: { country: 'gb' },
      })

      setAutocomplete(ac)
    }, [placesLib])

    useEffect(() => {
      if (!autocomplete) return

      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        onPlaceSelect(place)
      })

      return () => listener.remove()
    }, [autocomplete, onPlaceSelect])

    return (
      <input
        ref={inputRef}
        placeholder={placeholder ?? 'Search a place...'}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #ddd',
          borderRadius: 6,
          fontSize: '0.9em',
          boxSizing: 'border-box',
        }}
      />
    )
  }
)

export default PlaceAutocomplete
