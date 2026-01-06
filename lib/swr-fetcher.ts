export const swrFetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then(async (r) => {
    if (!r.ok) {
      const text = await r.text().catch(() => "")
      throw new Error(text || `Request failed: ${r.status}`)
    }
    return r.json()
  })
