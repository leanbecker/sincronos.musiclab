// Cliente mínimo para la API REST de PayPal (Orders v2).
// Docs: https://developer.paypal.com/docs/api/orders/v2/

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE ?? 'https://api-m.sandbox.paypal.com'

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error('No se pudo autenticar contra PayPal')
  }

  const data = await res.json()
  return data.access_token
}

export async function paypalFetch(path: string, options: RequestInit = {}) {
  const accessToken = await getAccessToken()

  return fetch(`${PAYPAL_API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
}
