import { useState, useEffect } from "react"

interface GeolocationState {
  lat: number | null
  lon: number | null
  loading: boolean
  error: string | null
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lon: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ lat: null, lon: null, loading: false, error: "Geolocation is not supported" })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          loading: false,
          error: null,
        })
      },
      (err) => {
        setState({ lat: null, lon: null, loading: false, error: err.message })
      },
    )
  }, [])

  return state
}
