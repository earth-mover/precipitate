import { useQuery } from "@tanstack/react-query"
import * as zarr from "zarrita"
import { useRepo } from "./repo"

const MRMS_URL =
  "https://dynamical-noaa-mrms.s3.us-west-2.amazonaws.com/noaa-mrms-conus-analysis-hourly/v0.3.0.icechunk"

// Grid: lat 54.995..20.005 (descending), lon -129.995..-60.005, 0.01° spacing
const LAT_ORIGIN = 54.995
const LON_ORIGIN = -129.995
const STEP = 0.01

function latIndex(lat: number) {
  return Math.round((LAT_ORIGIN - lat) / STEP)
}
function lonIndex(lon: number) {
  return Math.round((lon - LON_ORIGIN) / STEP)
}

export function usePrecipitation(lat: number, lon: number, hours: number = 24) {
  const { data: repo } = useRepo({ url: MRMS_URL })

  return useQuery({
    queryKey: ["precipitation", lat, lon, hours],
    queryFn: async () => {
      const session = await repo!.readonlySession({ branch: "main" })
      const store = session.store
      const grp = zarr.root(store)

      const precip = await zarr.open(grp.resolve("/precipitation_surface"), { kind: "array" })
      const timeArr = await zarr.open.v3(grp.resolve("/time"), { kind: "array" })

      const timeLen = timeArr.shape[0]
      const numPoints = Math.min(hours, timeLen)
      const tStart = timeLen - numPoints
      const li = latIndex(lat)
      const lo = lonIndex(lon)

      const timeChunk = await zarr.get(timeArr, [zarr.slice(tStart, timeLen)])
      const precipChunk = await zarr.get(precip, [zarr.slice(tStart, timeLen), li, lo])

      const timeData = timeChunk.data as BigInt64Array
      const precipData = precipChunk.data as Float32Array

      const results: { time: Date; precipInHr: number }[] = []
      for (let i = 0; i < numPoints; i++) {
        const epochSeconds = Number(timeData[i])
        const raw = precipData[i]
        if (Number.isNaN(raw)) continue
        const inHr = (raw * 3600) / 25.4
        results.push({
          time: new Date(epochSeconds * 1000),
          precipInHr: inHr,
        })
      }

      return results
    },
    enabled: !!repo,
    retry: false,
  })
}
