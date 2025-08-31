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
    console.log('Starting food image analysis...');
    
    // Get the API key from environment
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('API key available:', !!openAIApiKey);
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment variables');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    console.log('Request received:', { 
      has_image: !!requestBody.image_url, 
      has_description: !!requestBody.meal_description 
    });
    
    const { image_url, meal_description, prompt } = requestBody;
    
    if (!image_url && !meal_description) {
      console.error('No image URL or meal description provided in request');
      throw new Error('No image URL or meal description provided');
    }

    console.log('Sending request to OpenAI with:', { 
      has_image: !!image_url, 
      has_description: !!meal_description,
      prompt_preview: prompt?.substring(0, 100)
    });
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: `You are a nutrition analysis expert. Analyze food from images and/or text descriptions and extract detailed nutritional information using the provided functions.

Your task:
1. Identify all food items mentioned in text descriptions and/or visible in images
2. Estimate portion sizes based on descriptions (e.g., "200g chicken") or visual cues
3. Use the extract_meal_nutrition function to provide detailed nutrition data
4. Be accurate with portion estimates - consider typical serving sizes
5. Include cooking methods when mentioned or visible
6. When both image and text are provided, use both sources for maximum accuracy

Guidelines for text analysis:
- Look for quantity indicators (grams, cups, pieces, servings)
- Infer cooking methods from descriptions
- Consider context clues (restaurant vs home-cooked)
- Ask for clarification in confidence scores when descriptions are vague

Guidelines for image analysis:
- Use visual cues to estimate realistic portion sizes
- Consider plate size, utensils, hands for scale
- Merge similar items into single portions`
          },
          {
            role: 'user',
            content: image_url ? [
              {
                type: 'text',
                text: meal_description ? 
                  `Please analyze both this meal description: "${meal_description}" and the accompanying image for detailed nutrition information.` :
                  prompt || `Analyze this food image and extract detailed nutrition information for all visible food items.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image_url
                }
              }
            ] : [
              {
                type: 'text',
                text: meal_description ? 
                  `Please analyze this meal description for detailed nutrition information: "${meal_description}"

Provide estimates based on typical portion sizes and cooking methods. If specific quantities aren't mentioned, use reasonable assumptions for standard serving sizes.` :
                  prompt || 'Please provide meal information to analyze.'
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_meal_nutrition',
              description: 'Extract detailed nutrition information for food items identified in the meal',
              parameters: {
                type: 'object',
                properties: {
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string',
                          description: 'Specific food item name (e.g., "grilled chicken breast", "brown rice", "mixed green salad")'
                        },
                        estimated_grams: {
                          type: 'number',
                          description: 'Estimated weight in grams based on visual portion size'
                        },
                        calories_per_100g: {
                          type: 'number',
                          description: 'Estimated calories per 100g for this specific food item'
                        },
                        protein_per_100g: {
                          type: 'number',
                          description: 'Protein content per 100g in grams'
                        },
                        carbs_per_100g: {
                          type: 'number',
                          description: 'Carbohydrate content per 100g in grams'
                        },
                        fat_per_100g: {
                          type: 'number',
                          description: 'Fat content per 100g in grams'
                        },
                        fiber_per_100g: {
                          type: 'number',
                          description: 'Fiber content per 100g in grams'
                        },
                        cooking_method: {
                          type: 'string',
                          description: 'Cooking method if visible (grilled, fried, steamed, raw, etc.)'
                        },
                        confidence: {
                          type: 'number',
                          description: 'Confidence level in identification (0.0 to 1.0)'
                        }
                      },
                      required: ['name', 'estimated_grams', 'calories_per_100g', 'protein_per_100g', 'carbs_per_100g', 'fat_per_100g', 'confidence']
                    }
                  },
                  meal_context: {
                    type: 'object',
                    properties: {
                      setting: {
                        type: 'string',
                        description: 'Meal setting (restaurant, home, fast food, etc.)'
                      },
                      plate_size: {
                        type: 'string',
                        description: 'Estimated plate size (small, medium, large)'
                      },
                      meal_type: {
                        type: 'string',
                        description: 'Likely meal type (breakfast, lunch, dinner, snack)'
                      }
                    }
                  }
                },
                required: ['items']
              }
            }
          }
        ],
        tool_choice: {
          type: 'function',
          function: { name: 'extract_meal_nutrition' }
        },
        max_completion_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');
    
    const message = data.choices[0].message;
    console.log('Full message:', JSON.stringify(message, null, 2));
    
    // Check if GPT-4 used function calling
    if (message.tool_calls && message.tool_calls.length > 0) {
      const functionCall = message.tool_calls[0];
      if (functionCall.function.name === 'extract_meal_nutrition') {
        try {
          const nutritionData = JSON.parse(functionCall.function.arguments);
          console.log('Function call result:', nutritionData);
          
          // Transform the function call result to match expected format
          const transformedResult = {
            items: nutritionData.items.map((item: any) => ({
              label: item.name,
              confidence: item.confidence,
              bbox_area_ratio: 0.8, // Default value since not provided by function
              estimated_grams: item.estimated_grams,
              portion_size: item.estimated_grams < 80 ? 'small' : item.estimated_grams > 200 ? 'large' : 'medium',
              cooking_method: item.cooking_method || 'unknown',
              // Store nutrition data for direct use
              nutrition: {
                calories_per_100g: item.calories_per_100g,
                protein_per_100g: item.protein_per_100g,
                carbs_per_100g: item.carbs_per_100g,
                fat_per_100g: item.fat_per_100g,
                fiber_per_100g: item.fiber_per_100g || 0
              }
            })),
            plate_present: true,
            plate_size_estimate: nutritionData.meal_context?.plate_size || 'medium',
            meal_context: nutritionData.meal_context
          };
          
          return new Response(JSON.stringify({
            success: true,
            result: transformedResult
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (parseError) {
          console.error('Failed to parse function call arguments:', parseError);
          return new Response(JSON.stringify({
            success: false,
            error: 'Failed to parse function call result',
            rawData: functionCall.function.arguments
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
          });
        }
      }
    }
    
    // Fallback if no function calling was used
    const content = message.content;
    console.log('Fallback - Analysis result:', content);
    
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