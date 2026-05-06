// ===== Claude AI Proxy Edge Function =====
// Keeps your Anthropic API key server-side, never exposed to the browser.
// Deploy: npx supabase functions deploy claude-proxy

import Anthropic from "npm:@anthropic-ai/sdk@0.27.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { task, prompt, brand, tone, type, canvasWidth, canvasHeight } = await req.json();

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    let systemPrompt = "";
    let userMessage = "";

    // ===== Layout Generator =====
    if (task === "layout") {
      systemPrompt = `You are a graphic design AI. Generate layout JSON for a Fabric.js canvas.
Return ONLY valid JSON with this structure:
{
  "background": "#hexcolor",
  "elements": [
    { "type": "rect", "x": 0, "y": 0, "width": 400, "height": 200, "fill": "#color", "radius": 8 },
    { "type": "text", "x": 50, "y": 60, "content": "Headline", "size": 48, "color": "#color", "font": "Inter", "bold": true, "width": 600 },
    { "type": "circle", "x": 100, "y": 100, "radius": 40, "fill": "#color" }
  ]
}
Canvas size is ${canvasWidth}x${canvasHeight}px. Use good visual hierarchy. Limit to 6-10 elements.`;
      userMessage = prompt;
    }

    // ===== Copywriter =====
    else if (task === "copy") {
      systemPrompt = `You are a professional copywriter. Generate 3 short ${type} options for ${brand} with a ${tone} tone.
Return ONLY valid JSON: { "options": ["Option 1", "Option 2", "Option 3"] }
Keep each option concise — under 15 words for headlines/taglines/CTAs, under 40 words for descriptions/captions.`;
      userMessage = `Generate ${type} copy for ${brand}`;
    }

    else {
      return new Response(JSON.stringify({ error: "Unknown task" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
