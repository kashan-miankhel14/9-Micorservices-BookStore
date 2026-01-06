"use client"
import useSWR from "swr"
import { swrFetcher } from "@/lib/swr-fetcher"

export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR("/api/auth/me", swrFetcher)
  return {
    user: data?.user || null,
    loading: isLoading,
    error,
    refresh: mutate,
  }
}
