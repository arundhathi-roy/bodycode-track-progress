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

    const { image_url, prompt } = await req.json();
    
    if (!image_url) {
      console.error('No image URL provided in request');
      throw new Error('No image URL provided');
    }

    console.log('Sending request to OpenAI vision model with image URL:', image_url);
    
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
            role: 'system',
            content: `You are a food recognition assistant.
Input: a meal photo.
Detect visible foods and return ONLY JSON.

Schema:
{
  "items": [
    { "label": "string", "confidence": 0.0-1.0, "bbox_area_ratio": 0.0-1.0 }
  ],
  "plate_present": true|false
}

Rules:
- No text outside JSON.
- Keep labels short and common (e.g., "rice", "chicken curry", "salad").
- Merge duplicates (two scoops of rice = one entry).`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt || `Photo: ${image_url}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image_url
                }
              }
            ]
          }
        ],
        max_completion_tokens: 1000,
        temperature: 0.1
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