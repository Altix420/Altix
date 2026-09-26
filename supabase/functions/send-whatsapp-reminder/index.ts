// Placeholder Edge Function para recordatorios de WhatsApp
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  return new Response(
    JSON.stringify({ message: "WhatsApp notification service placeholder ready" }),
    { headers: { "Content-Type": "application/json" } },
  )
})
