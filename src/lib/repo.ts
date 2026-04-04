import { Repository } from "@earthmover/icechunk"
import { createFetchStorage } from "@earthmover/icechunk/fetch-storage"
import { useQuery } from "@tanstack/react-query"

export async function openRepo(url: string) {
  const storage = await createFetchStorage(url)
  return await Repository.open(storage)
}

export const useRepo = ({ url }: { url: string }) => {
  return useQuery({
    queryKey: ["repo", url],
    queryFn: () => openRepo(url),
  })
}

export const useLatestCommit = ({ url }: { url: string }) => {
  const { data: repo } = useRepo({ url })
  return useQuery({
    queryKey: ["latest-commit", url],
    queryFn: async () => {
      const latestCommitHash = await repo!.lookupBranch("main")
      const latestCommit = await repo?.lookupSnapshot(latestCommitHash)
      return latestCommit
    },
    enabled: !!repo,
    staleTime: 30,
  })
}
