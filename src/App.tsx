import { useLatestCommit } from "./lib/repo"

const MRMS_URL =
  "https://dynamical-noaa-mrms.s3.us-west-2.amazonaws.com/noaa-mrms-conus-analysis-hourly/v0.3.0.icechunk"

export function App() {
    const latestCommit = useLatestCommit({ url: MRMS_URL })

    const lastUpdated = latestCommit?.data?.writtenAt

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>{lastUpdated && <p>Last updated: {new Date(lastUpdated).toLocaleString()}</p>}</div>
      </div>
    </div>
  )
}

export default App
