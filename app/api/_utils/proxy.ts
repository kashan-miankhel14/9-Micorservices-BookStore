import { type NextRequest, NextResponse } from "next/server"

const MOCK_BOOKS = [
  { id: "1", title: "The Pragmatic Programmer", author: "Andrew Hunt", price: 39.99, rating: 4.7 },
  { id: "2", title: "Clean Code", author: "Robert C. Martin", price: 34.99, rating: 4.6 },
  { id: "3", title: "Design Patterns", author: "Gamma et al.", price: 44.99, rating: 4.5 },
  { id: "4", title: "Refactoring", author: "Martin Fowler", price: 42.0, rating: 4.4 },
  { id: "5", title: "You Don’t Know JS", author: "Kyle Simpson", price: 29.99, rating: 4.3 },
]

function getApiBase() {
  return process.env.API_BASE_URL // server-only
}

export async function forward(req: NextRequest, path: string, init?: RequestInit) {
  const base = getApiBase()
  const token = req.cookies.get("token")?.value
  if (!base) {
    // mock mode
    return mockResponse(req, path)
  }
  const url = `${base}${path}`
  const headers = new Headers(init?.headers || {})
  if (token) headers.set("authorization", `Bearer ${token}`)
  headers.set("content-type", "application/json")

  const res = await fetch(url, {
    method: req.method,
    body: req.body ?? (await req.text()),
    headers,
    redirect: "manual",
  })

  const body = await res.text()
  return new NextResponse(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  })
}

export function setAuthCookie(res: NextResponse, token: string | null) {
  if (!token) {
    res.cookies.set("token", "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" })
    return res
  }
  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}

async function mockResponse(req: NextRequest, path: string) {
  // Handle both /api/books and /books paths
  const cleanPath = path.startsWith('/api') ? path.substring(4) : path;
  
  if (cleanPath.startsWith("/books")) {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const q = url.searchParams.get("q")?.toLowerCase() || "";
      const limit = Number(url.searchParams.get("limit") || "0");
      
      // Handle /books/:id
      const bookId = cleanPath.split('/')[2];
      if (bookId) {
        const book = MOCK_BOOKS.find(b => b.id === bookId);
        return book 
          ? NextResponse.json(book) 
          : NextResponse.json({ error: "Book not found" }, { status: 404 });
      }
      
      // Handle /books with search and limit
      const items = MOCK_BOOKS.filter(
        (b) => !q || b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q),
      );
      
      const result = limit > 0 ? items.slice(0, limit) : items;
      return NextResponse.json({ items: result });
    }
  }
  
  // Handle auth paths
  if (cleanPath === "/auth/login" && req.method === "POST") {
    return setAuthCookie(
      NextResponse.json({ 
        user: { 
          id: "1",
          email: "demo@example.com",
          name: "Demo User"
        } 
      }), 
      "mock-token"
    );
  }
  
  if (cleanPath === "/auth/signup" && req.method === "POST") {
    return setAuthCookie(
      NextResponse.json({ 
        user: { 
          id: "1",
          email: "demo@example.com",
          name: "Demo User"
        } 
      }), 
      "mock-token"
    );
  }
  
  if (cleanPath === "/auth/me" && req.method === "GET") {
    const hasToken = Boolean(req.cookies.get("token")?.value);
    return hasToken
      ? NextResponse.json({ 
          user: { 
            id: "1",
            email: "demo@example.com",
            name: "Demo User"
          } 
        })
      : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if (cleanPath.startsWith("/cart")) {
    if (req.method === "GET") {
      return NextResponse.json({
        items: [
          { 
            id: "1", 
            bookId: "1",
            title: "The Pragmatic Programmer", 
            price: 39.99, 
            quantity: 1,
            image: "/placeholder-book.jpg"
          }
        ],
        total: 39.99,
        itemCount: 1
      });
    }
    
    if (req.method === "POST") {
      return NextResponse.json({
        success: true,
        message: "Item added to cart"
      });
    }
  }
  
  if (cleanPath.startsWith("/orders")) {
    if (req.method === "GET") {
      return NextResponse.json({
        orders: [
          { 
            id: "1", 
            status: "processing", 
            items: [
              { 
                id: "1", 
                bookId: "1",
                title: "The Pragmatic Programmer", 
                price: 39.99, 
                quantity: 1,
                image: "/placeholder-book.jpg"
              }
            ],
            total: 39.99,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
      });
    }
    
    if (req.method === "POST") {
      return NextResponse.json({
        success: true,
        orderId: "ORD" + Math.floor(Math.random() * 1000000),
        message: "Order placed successfully"
      });
    }
  }
  
  return NextResponse.json({ ok: true })
}
