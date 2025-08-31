import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('Starting food analysis...');
    
    // Get the API key from environment
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found - returning fallback nutrition');
      const transformedResult = {
        items: [{
          label: 'Estimated meal',
          confidence: 0.2,
          bbox_area_ratio: 0.8,
          estimated_grams: 150,
          portion_size: 'medium',
          cooking_method: 'unknown',
          nutrition: {
            calories_per_100g: 180,
            protein_per_100g: 8,
            carbs_per_100g: 22,
            fat_per_100g: 6,
            fiber_per_100g: 3
          }
        }]
      };
      return new Response(JSON.stringify({
        success: true,
        warning: 'OPENAI_API_KEY missing; returned fallback estimates.',
        result: transformedResult
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let requestBody;
    try {
      requestBody = await req.json();
      console.log('Request parsed successfully');
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid request format' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { image_url, meal_description } = requestBody;
    console.log('Request data:', { has_image: !!image_url, has_description: !!meal_description });
    
    if (!image_url && !meal_description) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No image URL or meal description provided'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare the OpenAI request
    const messages = [
      {
        role: 'system',
        content: 'You are a nutrition expert. Analyze food and provide detailed nutritional information in JSON format.'
      }
    ];

    if (image_url && meal_description) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analyze this meal: "${meal_description}" and the provided image. Return a JSON object with an array of food items, each containing: name, estimated_grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, confidence.`
          },
          {
            type: 'image_url',
            image_url: { url: image_url }
          }
        ]
      });
    } else if (image_url) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this food image. Return a JSON object with an array of food items, each containing: name, estimated_grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, confidence.'
          },
          {
            type: 'image_url',
            image_url: { url: image_url }
          }
        ]
      });
    } else if (meal_description) {
      messages.push({
        role: 'user',
        content: `Analyze this meal description: "${meal_description}". Return a JSON object with an array of food items, each containing: name, estimated_grams, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g, confidence.`
      });
    }

    console.log('Sending request to OpenAI...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: messages,
        max_completion_tokens: 1200
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      const transformedResult = {
        items: [{
          label: 'Estimated meal',
          confidence: 0.3,
          bbox_area_ratio: 0.8,
          estimated_grams: 100,
          portion_size: 'medium',
          cooking_method: 'unknown',
          nutrition: {
            calories_per_100g: 200,
            protein_per_100g: 10,
            carbs_per_100g: 20,
            fat_per_100g: 5,
            fiber_per_100g: 2
          }
        }]
      };
      return new Response(JSON.stringify({
        success: true,
        warning: `OpenAI API error: ${response.status}`,
        result: transformedResult
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    const aiContent = data.choices[0].message.content;
    console.log('AI content:', aiContent);
    
    // Try to parse the JSON response
    let nutritionData;
    try {
      nutritionData = JSON.parse(aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      // Keep a robust fallback
      nutritionData = {
        items: [{
          name: "Unknown food",
          estimated_grams: 100,
          calories_per_100g: 200,
          protein_per_100g: 10,
          carbs_per_100g: 20,
          fat_per_100g: 5,
          fiber_per_100g: 2,
          confidence: 0.5
        }]
      };
    }

    // Transform to expected format
    const transformedResult = {
      items: nutritionData.items?.map((item: any) => ({
        label: item.name,
        confidence: item.confidence || 0.8,
        bbox_area_ratio: 0.8,
        estimated_grams: item.estimated_grams || 100,
        portion_size: item.estimated_grams < 80 ? 'small' : item.estimated_grams > 200 ? 'large' : 'medium',
        cooking_method: item.cooking_method || 'unknown',
        nutrition: {
          calories_per_100g: item.calories_per_100g || 200,
          protein_per_100g: item.protein_per_100g || 10,
          carbs_per_100g: item.carbs_per_100g || 20,
          fat_per_100g: item.fat_per_100g || 5,
          fiber_per_100g: item.fiber_per_100g || 2
        }
      })) || []
    };

    return new Response(JSON.stringify({
      success: true,
      result: transformedResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});