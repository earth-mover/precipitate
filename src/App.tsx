import { useState, useEffect, useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts"
import { usePrecipitation } from "./lib/precipitation"
import { useLatestCommit } from "./lib/repo"
import { useGeolocation } from "./lib/geolocation"
import { Input } from "./components/ui/input"
import { Label } from "./components/ui/label"
import { Button } from "./components/ui/button"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "./components/ui/chart"

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

export function App() {
  const geo = useGeolocation()

  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [inputLat, setInputLat] = useState("")
  const [inputLon, setInputLon] = useState("")

  // Sync geolocation into state once it resolves (only if user hasn't manually set a location yet)
  useEffect(() => {
    if (geo.lat != null && geo.lon != null && lat == null) {
      setLat(geo.lat)
      setLon(geo.lon)
      setInputLat(geo.lat.toFixed(2))
      setInputLon(geo.lon.toFixed(2))
    }
  }, [geo.lat, geo.lon, lat])

  // Fall back to defaults if geolocation fails or is denied
  useEffect(() => {
    if (!geo.loading && geo.lat == null && lat == null) {
      setLat(DEFAULT_LAT)
      setLon(DEFAULT_LON)
      setInputLat(String(DEFAULT_LAT))
      setInputLon(String(DEFAULT_LON))
    }
  }, [geo.loading, geo.lat, lat])

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedLat = parseFloat(inputLat)
    const parsedLon = parseFloat(inputLon)
    if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLon)) {
      setLat(parsedLat)
      setLon(parsedLon)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col p-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4 text-sm">
        <h1 className="text-lg font-semibold">Precipitation</h1>

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lat">Latitude</Label>
            <Input
              id="lat"
              type="number"
              step="any"
              placeholder={geo.loading ? "Locating..." : String(DEFAULT_LAT)}
              value={inputLat}
              onChange={(e) => setInputLat(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lon">Longitude</Label>
            <Input
              id="lon"
              type="number"
              step="any"
              placeholder={geo.loading ? "Locating..." : String(DEFAULT_LON)}
              value={inputLon}
              onChange={(e) => setInputLon(e.target.value)}
              className="w-28"
            />
          </div>
          <Button type="submit" size="sm">
            Update
          </Button>
        </form>

        {geo.error && <p className="text-muted-foreground">Using default location (geolocation unavailable)</p>}

        {lastUpdated && <p className="text-muted-foreground">Last updated: {new Date(lastUpdated).toLocaleString()}</p>}
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
                domain={[0.001, 6]}
                allowDataOverflow
                hide
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
              >
                <LabelList
                  dataKey="precipInHr"
                  position="top"
                  className="fill-foreground text-[10px]"
                  content={({ x, y, width, index, value }) => {
                    if (index == null || !chartData[index]?.isMax) return null
                    return (
                      <text
                        x={(x as number) + (width as number) / 2}
                        y={(y as number) - 6}
                        textAnchor="middle"
                        className="fill-foreground text-[10px]"
                      >
                        {(value as number).toFixed(3)} in/hr
                      </text>
                    )
                  }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </div>
      <footer className="pt-6 text-xs text-muted-foreground">
        Source:{" "}
        <a
          href="https://app.earthmover.io/marketplace/69b17d6d9b47e3348aeb99dc"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-foreground"
        >
          NOAA MRMS Hourly Precipitation on Earthmover
        </a>
      </footer>
    </div>
  )
}

export default App
