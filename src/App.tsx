import { useState, useEffect, useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"
import { usePrecipitation } from "./lib/precipitation"
import { useLatestCommit } from "./lib/repo"
import { useGeolocation } from "./lib/geolocation"
import { Input } from "./components/ui/input"
import { Label } from "./components/ui/label"
import { Button } from "./components/ui/button"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./components/ui/chart"
import { Tooltip, TooltipTrigger, TooltipContent } from "./components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "./components/ui/dialog"

const MRMS_URL =
  "https://dynamical-noaa-mrms.s3.us-west-2.amazonaws.com/noaa-mrms-conus-analysis-hourly/v0.3.0.icechunk"

const DEFAULT_LAT = 41
const DEFAULT_LON = -71

const chartConfig = {
  precipInHr: {
    label: "Precipitation (in/hr)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function getInitialLocation(): { lat: number; lon: number } | null {
  const params = new URLSearchParams(window.location.search)
  const lat = parseFloat(params.get("lat") ?? "")
  const lon = parseFloat(params.get("lon") ?? "")
  if (!Number.isNaN(lat) && !Number.isNaN(lon)) return { lat, lon }
  return null
}

export function App() {
  const urlLocation = useMemo(getInitialLocation, [])
  const geo = useGeolocation()

  const [lat, setLat] = useState<number | null>(urlLocation?.lat ?? null)
  const [lon, setLon] = useState<number | null>(urlLocation?.lon ?? null)
  const [inputLat, setInputLat] = useState(urlLocation ? String(urlLocation.lat) : "")
  const [inputLon, setInputLon] = useState(urlLocation ? String(urlLocation.lon) : "")

  // Sync geolocation into state once it resolves (only if no URL params and user hasn't manually set a location yet)
  useEffect(() => {
    if (!urlLocation && geo.lat != null && geo.lon != null && lat == null) {
      setLat(geo.lat)
      setLon(geo.lon)
      setInputLat(geo.lat.toFixed(2))
      setInputLon(geo.lon.toFixed(2))
    }
  }, [geo.lat, geo.lon, lat, urlLocation])

  // Fall back to defaults and open dialog if geolocation fails or is denied (and no URL params)
  useEffect(() => {
    if (!urlLocation && !geo.loading && geo.lat == null && lat == null) {
      setLat(DEFAULT_LAT)
      setLon(DEFAULT_LON)
      setInputLat(String(DEFAULT_LAT))
      setInputLon(String(DEFAULT_LON))
      setDialogOpen(true)
    }
  }, [geo.loading, geo.lat, lat, urlLocation])

  // Sync location to URL
  useEffect(() => {
    if (lat != null && lon != null) {
      const url = new URL(window.location.href)
      url.searchParams.set("lat", String(lat))
      url.searchParams.set("lon", String(lon))
      window.history.replaceState(null, "", url)
    }
  }, [lat, lon])

  const activeLat = lat ?? DEFAULT_LAT
  const activeLon = lon ?? DEFAULT_LON

  const { data, isLoading, error } = usePrecipitation(activeLat, activeLon)
  const latestCommit = useLatestCommit({ url: MRMS_URL })
  const lastUpdated = latestCommit?.data?.writtenAt

  const chartData = useMemo(() => {
    if (!data) return []
    const maxVal = Math.max(...data.map((d) => d.precipInHr))
    return data.map((d) => ({
      time: d.time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      precipInHr: d.precipInHr,
      isMax: d.precipInHr === maxVal && maxVal > 0,
    }))
  }, [data])

  const [dialogOpen, setDialogOpen] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedLat = parseFloat(inputLat)
    const parsedLon = parseFloat(inputLon)
    if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLon)) {
      setLat(parsedLat)
      setLon(parsedLon)
      setDialogOpen(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4 text-sm">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Precipitate</h1>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                {geo.loading ? "Locating..." : `${Math.abs(activeLat).toFixed(2)}° ${activeLat >= 0 ? "N" : "S"}, ${Math.abs(activeLon).toFixed(2)}° ${activeLon >= 0 ? "E" : "W"}`}
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Location</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="lat">Latitude (°N)</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="any"
                      placeholder="41.43 (negative = South)"
                      value={inputLat}
                      onChange={(e) => setInputLat(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Label htmlFor="lon">Longitude (°E)</Label>
                    <Input
                      id="lon"
                      type="number"
                      step="any"
                      placeholder="-71.46 (negative = West)"
                      value={inputLon}
                      onChange={(e) => setInputLon(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">Cancel</Button>
                  </DialogClose>
                  <Button type="submit" size="sm">Update</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error.message}</p>}
        {data && (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={chartData} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                scale="log"
                domain={[0.005, 6]}
                allowDataOverflow
                ticks={[0.01, 0.1, 0.3, 2]}
                tickFormatter={(value: number) => {
                  if (value <= 0.01) return "Trace"
                  if (value <= 0.1) return "Light"
                  if (value <= 0.3) return "Moderate"
                  return "Heavy"
                }}
                axisLine={false}
                tickLine={false}
                width={70}
                className="text-[10px]"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      `${(value as number).toFixed(4)} in/hr`
                    }
                  />
                }
              />
              <Bar
                dataKey="precipInHr"
                fill="var(--color-precipInHr)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {lastUpdated && (
            <Tooltip>
              <TooltipTrigger className="inline-flex cursor-default items-center rounded-md border border-border px-2 py-0.5">
                Updated {new Date(lastUpdated).toLocaleString()}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-left">
                <div className="flex flex-col gap-1">
                  <span className="font-medium">Commit {latestCommit.data?.id?.slice(0, 8)}</span>
                  {latestCommit.data?.message && <span>{latestCommit.data.message}</span>}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
          <a
            href="https://app.earthmover.io/marketplace/69b17d6d9b47e3348aeb99dc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-md border border-border px-2 py-0.5 underline hover:text-foreground"
          >
            Source: NOAA MRMS on Earthmover
          </a>
        </div>
      </div>
    </div>
  )
}

export default App
