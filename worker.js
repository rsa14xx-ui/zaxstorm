export default {
  async fetch(request, env, ctx) {
    // 1. Pengaturan CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", 
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const { messages, systemPrompt, model } = await request.json();
      
      // Ambil API Key dari Environment Variables Cloudflare
      const API_KEY = env.GEMINI_API_KEY; 

      if (!API_KEY) {
        return new Response(JSON.stringify({ error: "API Key belum diset di server." }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Tembak API Google Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages,
          systemInstruction: { parts: [{ text: systemPrompt }] }
        })
      });

      if (!response.ok) {
        return new Response(response.body, { 
          status: response.status, 
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" } 
        });
      }

      // Streaming data balik ke Frontend
      const { readable, writable } = new TransformStream();
      response.body.pipeTo(writable);

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive"
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  }
}