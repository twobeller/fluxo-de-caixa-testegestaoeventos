import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

interface RequestPayload {
  imageUrl?: string
  url?: string
}

Deno.serve(async (req: Request) => {
  // Tratar requisições preflight OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: 'Chave de API GEMINI_API_KEY não configurada no ambiente.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    let payload: RequestPayload
    try {
      payload = await req.json()
    } catch {
      return new Response(
        JSON.stringify({
          error:
            'Corpo da requisição inválido. Esperado JSON com { imageUrl: string } ou { url: string }.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const receiptUrl = payload.imageUrl || payload.url
    if (!receiptUrl || typeof receiptUrl !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'URL da imagem não informada. Envie o campo imageUrl ou url no JSON.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Buscar a imagem a partir da URL fornecida
    const imageResponse = await fetch(receiptUrl)
    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `Não foi possível baixar a imagem da URL fornecida (HTTP ${imageResponse.status}).`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const imageBlob = await imageResponse.blob()
    const contentType = imageResponse.headers.get('content-type') || imageBlob.type || 'image/jpeg'
    const mimeType = contentType.split(';')[0].trim() || 'image/jpeg'

    const arrayBuffer = await imageBlob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Converter para base64 em chunks para evitar estouro de stack com imagens grandes
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      binary += String.fromCharCode(...uint8Array.subarray(i, i + chunkSize))
    }
    const base64Data = btoa(binary)

    const promptText =
      'Extraia deste comprovante de pagamento os seguintes campos: valor, data, nome do pagador, forma de pagamento (PIX/cartão/dinheiro) e retorne em JSON'

    // Chamada para a API Gemini (gemini-2.5-flash)
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      geminiApiKey,
    )}`

    // Para PDF usamos application/pdf, para imagens o mimeType correto
    const normalizedMimeType = mimeType.toLowerCase().includes('pdf') ? 'application/pdf' : mimeType

    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              text: promptText,
            },
            {
              inlineData: {
                mimeType: normalizedMimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }

    const geminiResponse = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiPayload),
    })

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      return new Response(
        JSON.stringify({
          error: `Erro retornado pela API do Gemini: ${errorText}`,
        }),
        {
          status:
            geminiResponse.status >= 400 && geminiResponse.status < 500
              ? geminiResponse.status
              : 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const geminiResult = await geminiResponse.json()
    const candidateText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text

    if (!candidateText) {
      return new Response(
        JSON.stringify({
          error: 'Nenhum dado retornado pelo modelo Gemini.',
          raw: geminiResult,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // Fazer parse do JSON retornado pelo Gemini (removendo markdown caso venha com ```json ... ```)
    let parsedData: unknown
    try {
      const sanitizedJson = candidateText
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
      parsedData = JSON.parse(sanitizedJson)
    } catch {
      // Se não conseguir parsear como JSON direto, repassar o texto ou objeto com a string
      parsedData = { raw_text: candidateText }
    }

    return new Response(JSON.stringify(parsedData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({
        error: `Erro interno ao processar comprovante: ${message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
