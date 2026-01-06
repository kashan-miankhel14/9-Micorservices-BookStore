import { notFound } from "next/navigation"

async function getBook(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const url = new URL(`${baseUrl}/api/books/${id}`, 'http://localhost:3000');
  
  const res = await fetch(url.toString(), {
    cache: "no-store",
  });
  
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to load book");
  return res.json();
}

export default async function BookDetail({ params }: { params: { id: string } }) {
  const data = await getBook(params.id)
  if (!data?.id) return notFound()

  const addToCart = async (formData: FormData) => {
    "use server"
    const baseUrl = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const url = new URL(`${baseUrl}/api/cart`, 'http://localhost:3000');
    
    try {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bookId: data.id, qty: 1 }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add to cart');
      }
      
      // Redirect to cart page or show success message
      revalidatePath('/cart');
      redirect('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      // You can return an error message to show to the user
      return { error: 'Failed to add item to cart' };
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <img
          src={data.coverUrl || "/placeholder.svg?height=360&width=480&query=book cover large"}
          alt={`${data.title} cover`}
          className="w-full h-auto rounded-lg border"
        />
      </div>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-pretty">{data.title}</h1>
        <p className="text-muted-foreground">by {data.author}</p>
        <div className="flex items-center gap-4">
          <span className="text-2xl font-semibold">${Number(data.price).toFixed(2)}</span>
          <span className="text-sm text-muted-foreground">
            {data.rating ? `★ ${Number(data.rating).toFixed(1)}` : "No rating"}
          </span>
        </div>
        <form action={addToCart}>
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground h-10 px-4 py-2">
            Add to Cart
          </button>
        </form>
      </div>
    </div>
  )
}
