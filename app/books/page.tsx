import BookGrid from "@/components/book-grid"

export default function BooksPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">All Books</h1>
      <BookGrid />
    </div>
  )
}
