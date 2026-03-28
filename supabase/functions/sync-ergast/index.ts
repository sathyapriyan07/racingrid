import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const ALLOWED_ORIGINS = [
  'https://api.jolpi.ca',
  'http://api.jolpi.ca',
  'https://api.openf1.org',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { endpoint } = await req.json()

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'endpoint required' }), { status: 400 })
    }

    const isAllowed = ALLOWED_ORIGINS.some(origin => endpoint.startsWith(origin))
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Endpoint not in allowlist' }), { status: 403 })
    }

    const response = await fetch(endpoint, {
      headers: { 'Accept': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Upstream error: ${response.status}`)
    }

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
