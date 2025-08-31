import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting food image analysis...');
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }

    const { image } = await req.json();
    
    if (!image) {
      console.error('No image provided in request');
      throw new Error('No image provided');
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/[^;]+;base64,/, '');
    
    console.log('Sending request to OpenAI vision model...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'o4-mini-2025-04-16',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this food image and identify all visible food items. For each item, provide:
1. Food name (be specific, e.g., "grilled chicken breast" not just "chicken")
2. Estimated portion size in grams (use visual cues like plate size, utensils for scale)
3. Confidence level (0-100%) based on image clarity and your certainty
4. Brief description of cooking method if apparent (e.g., grilled, fried, steamed)

Return the response as a JSON object with this structure:
{
  "items": [
    {
      "name": "specific food item name",
      "portion_grams": number,
      "confidence": number,
      "cooking_method": "method if apparent"
    }
  ]
}

Be thorough but only include items you can clearly identify. Consider typical serving sizes for accuracy.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_completion_tokens: 1000,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    const content = data.choices[0].message.content;
    console.log('Analysis result:', content);
    
    try {
      const parsedResult = JSON.parse(content);
      return new Response(JSON.stringify({
        success: true,
        result: parsedResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.log('Raw content:', content);
      
      // Return a fallback response if JSON parsing fails
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to parse AI response',
        rawContent: content
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }

  } catch (error) {
    console.error('Error in analyze-food-image function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});