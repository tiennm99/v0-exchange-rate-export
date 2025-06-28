import { NextResponse } from "next/server"

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get("date")

  if (!date) {
    return NextResponse.json({ error: "Missing ?date=YYYY-MM-DD" }, { status: 400 })
  }

  const remoteURL = `https://techcombank.com/content/techcombank/web/vn/vi/cong-cu-tien-ich/ty-gia/_jcr_content.exchange-rates.${date}.integration.json`

  try {
    const res = await fetch(remoteURL, { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error ${res.status}` }, { status: res.status })
    }
    const json = await res.json()
    return NextResponse.json(json)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch upstream" }, { status: 502 })
  }
}
