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

export const useLatestCommit = ({
  url,
  branch,
}: {
  url: string
  branch?: string
}) => {
  const { data: repo } = useRepo({ url })
  return useQuery({
    queryKey: ["latest-commit", url],
    queryFn: () => repo!.lookupBranch(branch ?? "main"),
    enabled: !!repo,
    staleTime: 30,
  })
}
