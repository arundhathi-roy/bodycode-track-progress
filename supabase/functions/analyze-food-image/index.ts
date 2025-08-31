import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing OPENAI_API_KEY in Supabase Edge Function secrets. Please add it and retry.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {}

    const { image_url, meal_description } = body;
    if (!image_url && !meal_description) {
      return new Response(JSON.stringify({ success: false, error: 'Provide an image_url or meal_description' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const messages: any[] = [
      { role: 'system', content: 'You are a fast nutrition expert. Analyze food images/descriptions quickly. Return ONLY JSON: {"items":[{"name":"","estimated_grams":0,"calories_per_100g":0,"protein_per_100g":0,"carbs_per_100g":0,"fat_per_100g":0,"fiber_per_100g":0,"confidence":0.8}]}' }
    ];

    if (image_url && meal_description) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Analyze this meal description and image and return ONLY JSON: ${meal_description}` },
          { type: 'image_url', image_url: { url: image_url } }
        ]
      });
    } else if (image_url) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this food image and return ONLY JSON.' },
          { type: 'image_url', image_url: { url: image_url } }
        ]
      });
    } else {
      messages.push({ role: 'user', content: `Analyze this description and return ONLY JSON: ${meal_description}` });
    }

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAIApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: 'gpt-4o-mini', // Faster, cheaper model
        messages, 
        max_completion_tokens: 800,
        temperature: 0.1 // Lower temperature for more consistent output
      })
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return new Response(JSON.stringify({ success: false, error: `OpenAI error ${aiRes.status}: ${errText}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const data = await aiRes.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';

    // Extract JSON block from the response safely
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'AI returned non-JSON output. Please try again.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const transformed = {
      items: (parsed.items || []).map((it: any) => ({
        label: it.name,
        confidence: it.confidence ?? 0.8,
        bbox_area_ratio: 0.8,
        estimated_grams: it.estimated_grams ?? 100,
        portion_size: (it.estimated_grams ?? 100) < 80 ? 'small' : (it.estimated_grams ?? 100) > 200 ? 'large' : 'medium',
        cooking_method: it.cooking_method || 'unknown',
        nutrition: {
          calories_per_100g: it.calories_per_100g ?? 200,
          protein_per_100g: it.protein_per_100g ?? 10,
          carbs_per_100g: it.carbs_per_100g ?? 20,
          fat_per_100g: it.fat_per_100g ?? 5,
          fiber_per_100g: it.fiber_per_100g ?? 2
        }
      }))
    };

    return new Response(JSON.stringify({ success: true, result: transformed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || 'Unknown error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }
});