"use client"

import useSWR from "swr"
import { useSearchParams } from "next/navigation"
import { swrFetcher } from "@/lib/swr-fetcher"
import BookCard, { type Book } from "@/components/book-card"

export default function BookGrid({ initialPath = "/api/books" }: { initialPath?: string }) {
  const sp = useSearchParams()
  const q = sp.get("q")
  const url = q ? `${initialPath}${initialPath.includes("?") ? "&" : "?"}q=${encodeURIComponent(q)}` : initialPath
  const { data, isLoading, error } = useSWR(url, swrFetcher)

  const books: Book[] = data?.items || []

  const addToCart = async (book: Book) => {
    await fetch("/api/cart", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookId: book.id, qty: 1 }),
    })
    // no toast hook provided by default; optionally add one
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div className="text-destructive">Failed to load books</div>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {books.map((b) => (
        <BookCard key={b.id} book={b} onAddToCart={addToCart} />
      ))}
    </div>
  )
}
