import { type NextRequest, NextResponse } from "next/server"

async function safeFetch(bidvUrl: string, tries = 2) {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.01",
    Referer: "https://bidv.com.vn/",
    "X-Requested-With": "XMLHttpRequest",
  } as const

  // 1️⃣ helper that really performs the fetch
  const doFetch = (target: string) =>
    fetch(target, {
      headers,
      cache: "no-store",
    })

  // 2️⃣ Build the 2 proxy urls
  const encoded = encodeURIComponent(bidvUrl)
  const urls = [
    // Fast proxy, no wrapping
    `https://corsproxy.io/?${encoded}`,
    // More reliable fallback
    `https://api.allorigins.win/raw?url=${encoded}`,
  ]

  for (let attempt = 0; attempt < tries; attempt++) {
    for (const url of urls) {
      try {
        const res = await doFetch(url)
        if (res.ok) return res
      } catch {
        /* swallow & try next proxy */
      }
    }
    // small back-off
    await new Promise((r) => setTimeout(r, 400))
  }

  throw new Error("fetch failed")
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")

  if (!date) {
    return NextResponse.json({ error: "Missing ?date=YYYY-MM-DD" }, { status: 400 })
  }

  // Convert YYYY-MM-DD to DD/MM/YYYY for BIDV API
  const [year, month, day] = date.split("-")
  const bidvDate = `${day}/${month}/${year}`

  try {
    // Step 1: Get time records for the date
    const timeUrl = `https://bidv.com.vn/ServicesBIDV/ExchangeDetailSearchTimeServlet?date=${bidvDate}`
    const timeRes = await safeFetch(timeUrl)

    if (!timeRes.ok) {
      return NextResponse.json({ error: `Time search failed: ${timeRes.status}` }, { status: timeRes.status })
    }

    const timeData = await timeRes.json()

    if (!timeData.data || timeData.data.length === 0) {
      return NextResponse.json({ error: "No time records found" }, { status: 404 })
    }

    // Step 2: Find the record with highest time value
    const latestRecord = timeData.data.reduce((prev: any, current: any) => (current.time > prev.time ? current : prev))

    // Step 3: Get exchange rates using the namerecord
    const rateUrl = `https://bidv.com.vn/ServicesBIDV/ExchangeDetailServlet?date=${bidvDate}&time=${latestRecord.namerecord}`
    const rateRes = await safeFetch(rateUrl)

    if (!rateRes.ok) {
      return NextResponse.json({ error: `Rate fetch failed: ${rateRes.status}` }, { status: rateRes.status })
    }

    const rateData = await rateRes.json()
    return NextResponse.json(rateData)
  } catch (error) {
    console.error("BIDV API error:", (error as Error).message)
    return NextResponse.json({ error: "Failed to fetch from BIDV" }, { status: 502 })
  }
}
