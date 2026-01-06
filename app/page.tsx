import BookGrid from "@/components/book-grid"
import { Suspense } from "react"

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border bg-card">
        <div className="p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-balance">Your next favorite book awaits</h1>
          <p className="mt-3 text-muted-foreground text-pretty">
            Discover top-rated titles across genres. Browse, review, and order with ease.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Featured Books</h2>
        <Suspense fallback={<div>Loading books...</div>}>
          {/* limit featured using query param */}
          <BookGrid initialPath="/api/books?limit=8" />
        </Suspense>
      </section>
    </div>
  )
}
