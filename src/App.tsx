import { usePrecipitation } from "./lib/precipitation"
import { useLatestCommit } from "./lib/repo"

const MRMS_URL =
  "https://dynamical-noaa-mrms.s3.us-west-2.amazonaws.com/noaa-mrms-conus-analysis-hourly/v0.3.0.icechunk"

export function App() {
  const { data, isLoading, error } = usePrecipitation()
  const latestCommit = useLatestCommit({ url: MRMS_URL })
  const lastUpdated = latestCommit?.data?.writtenAt

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex min-w-0 flex-col gap-4 text-sm">
        <h1 className="text-lg font-semibold">Precipitation (41°N, 71°W)</h1>
        {lastUpdated && <p className="text-muted-foreground">Last updated: {new Date(lastUpdated).toLocaleString()}</p>}
        {isLoading && <p>Loading...</p>}
        {error && <p className="text-red-500">Error: {error.message}</p>}
        {data && (
          <ul className="flex flex-col gap-1">
            {data.map((d) => (
              <li key={d.time.toISOString()}>
                <span className="font-mono">{d.time.toLocaleString()}</span>
                {" — "}
                <span className="font-semibold">{d.precipInHr.toFixed(5)} in/hr</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default App
