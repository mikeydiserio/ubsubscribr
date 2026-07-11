import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export function createRouteHandlerClient(request: NextRequest) {
  // Route Handlers are terminal responses; NextResponse.next() is only valid
  // in Proxy/middleware and adds an x-middleware-next header that API routes
  // must never return or copy.
  const supabaseResponse = new NextResponse(null)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  return { supabase, supabaseResponse }
}
