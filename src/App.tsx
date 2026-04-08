import { useState, useEffect, useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { usePrecipitation } from "./lib/precipitation"
import { useLatestCommit } from "./lib/repo"
import { useGeolocation } from "./lib/geolocation"
import { Input } from "./components/ui/input"
import { Label } from "./components/ui/label"
import { Button } from "./components/ui/button"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./components/ui/chart"
import { Tooltip, TooltipTrigger, TooltipContent } from "./components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "./components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "./components/ui/popover"
import { Skeleton } from "./components/ui/skeleton"

const MRMS_URL =
  "https://dynamical-noaa-mrms.s3.us-west-2.amazonaws.com/noaa-mrms-conus-analysis-hourly/v0.3.0.icechunk"

const DEFAULT_LAT = 41
const DEFAULT_LON = -71

const TIME_RANGES = [
  { hours: 12, label: "Last 12 hours" },
  { hours: 24, label: "Last 24 hours" },
  { hours: 48, label: "Last 48 hours" },
  { hours: 72, label: "Last 72 hours" },
  { hours: 168, label: "Last week" },
] as const

const chartConfig = {
  precipInHr: {
    label: "Precipitation (in/hr)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function getInitialParams(): { lat?: number; lon?: number; hours?: number } {
  const params = new URLSearchParams(window.location.search)
  const lat = parseFloat(params.get("lat") ?? "")
  const lon = parseFloat(params.get("lon") ?? "")
  const hours = parseInt(params.get("hours") ?? "", 10)
  return {
    lat: !Number.isNaN(lat) && !Number.isNaN(lon) ? lat : undefined,
    lon: !Number.isNaN(lat) && !Number.isNaN(lon) ? lon : undefined,
    hours: !Number.isNaN(hours) && hours > 0 ? hours : undefined,
  }
}

export function App() {
  const initialParams = useMemo(getInitialParams, [])
  const geo = useGeolocation()

  const [lat, setLat] = useState<number | null>(initialParams.lat ?? null)
  const [lon, setLon] = useState<number | null>(initialParams.lon ?? null)
  const [inputLat, setInputLat] = useState(initialParams.lat != null ? String(initialParams.lat) : "")
  const [inputLon, setInputLon] = useState(initialParams.lon != null ? String(initialParams.lon) : "")

  // Sync geolocation into state once it resolves (only if no URL params and user hasn't manually set a location yet)
  useEffect(() => {
    if (!initialParams.lat && geo.lat != null && geo.lon != null && lat == null) {
      setLat(geo.lat)
      setLon(geo.lon)
      setInputLat(geo.lat.toFixed(2))
      setInputLon(geo.lon.toFixed(2))
    }
  }, [geo.lat, geo.lon, lat, initialParams.lat])

  // Fall back to defaults and open dialog if geolocation fails or is denied (and no URL params)
  useEffect(() => {
    if (!initialParams.lat && !geo.loading && geo.lat == null && lat == null) {
      setLat(DEFAULT_LAT)
      setLon(DEFAULT_LON)
      setInputLat(String(DEFAULT_LAT))
      setInputLon(String(DEFAULT_LON))
      setDialogOpen(true)
    }
  }, [geo.loading, geo.lat, lat, initialParams.lat])

  const [dialogOpen, setDialogOpen] = useState(false)
  const [hours, setHours] = useState(initialParams.hours ?? 24)
  const [rangeOpen, setRangeOpen] = useState(false)

  // Sync location and time range to URL
  useEffect(() => {
    if (lat != null && lon != null) {
      const url = new URL(window.location.href)
      url.searchParams.set("lat", String(lat))
      url.searchParams.set("lon", String(lon))
      url.searchParams.set("hours", String(hours))
      window.history.replaceState(null, "", url)
    }
  }, [lat, lon, hours])

  const activeLat = lat ?? DEFAULT_LAT
  const activeLon = lon ?? DEFAULT_LON

  const { data, isLoading, error } = usePrecipitation(activeLat, activeLon, hours)
  const latestCommit = useLatestCommit({ url: MRMS_URL })
  const lastUpdated = latestCommit?.data?.writtenAt

  const chartData = useMemo(() => {
    if (!data) return []
    const maxVal = Math.max(...data.map((d) => d.precipInHr))
    return data.map((d) => ({
      time: hours > 24
        ? d.time.toLocaleString([], { month: "short", day: "numeric", hour: "numeric" })
        : d.time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      precipInHr: d.precipInHr,
      isMax: d.precipInHr === maxVal && maxVal > 0,
    }))
  }, [data, hours])

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

          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger render={<button />} className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                {geo.loading ? "Locating..." : `${Math.abs(activeLat).toFixed(2)}° ${activeLat >= 0 ? "N" : "S"}, ${Math.abs(activeLon).toFixed(2)}° ${activeLon >= 0 ? "E" : "W"}`}
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
                  <DialogClose render={<Button variant="outline" size="sm" />}>Cancel</DialogClose>
                  <Button type="submit" size="sm">Update</Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
            <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
              <PopoverTrigger render={<button />} className="flex cursor-pointer items-center gap-1.5 rounded-sm border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
                {TIME_RANGES.find((r) => r.hours === hours)?.label ?? `Last ${hours} hours`}
              </PopoverTrigger>
              <PopoverContent align="end" className="flex w-auto flex-col gap-0.5 p-1">
                {TIME_RANGES.map((range) => (
                  <button
                    key={range.hours}
                    className={`cursor-pointer rounded-sm px-3 py-1.5 text-left text-xs transition-colors hover:bg-accent ${range.hours === hours ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"}`}
                    onClick={() => {
                      setHours(range.hours)
                      setRangeOpen(false)
                    }}
                  >
                    {range.label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {error && <p className="text-red-500">Error: {error.message}</p>}
        {isLoading && !data && (
          <Skeleton className="h-[250px] w-full" />
        )}
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
              <TooltipTrigger className="inline-flex cursor-default items-center rounded-sm border border-border px-2 py-0.5">
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
          <span className="inline-flex items-center gap-1.5 rounded-sm border border-border px-2 py-0.5">
            Source: <a href="https://www.nssl.noaa.gov/projects/mrms/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">NOAA MRMS</a> from{" "}
            <a href="https://dynamical.org/catalog/noaa-mrms-conus-analysis-hourly/" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">dynamical.org</a>
            {" "}via{" "}
            <a href="https://app.earthmover.io/marketplace/69b17d6d9b47e3348aeb99dc" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Earthmover</a>
          </span>
        </div>
      </div>
      <footer className="mt-auto pt-4 text-center text-xs text-muted-foreground">
        <a
          href="https://github.com/earth-mover/precipitate"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          Fork me on GitHub
        </a>
      </footer>
    </div>
  )
}

export default App
