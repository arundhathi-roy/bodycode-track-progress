import { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FoodItem {
  label: string;
  confidence: number;
  bbox_area_ratio: number;
}

interface FoodRecognitionResult {
  items: FoodItem[];
  plate_present: boolean;
}

interface NormalizedFoodItem {
  name: string;
  source_name: string;
  kcal_per_100: number;
  protein_per_100: number;
  carbs_per_100: number;
  fat_per_100: number;
}

const FoodRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<FoodRecognitionResult | null>(null);
  const [normalizedResult, setNormalizedResult] = useState<{ items: NormalizedFoodItem[] } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeNutrition = async (detectedItems: FoodItem[]): Promise<{ items: NormalizedFoodItem[] }> => {
    try {
      // Fetch nutrition reference data
      const { data: nutritionData, error } = await supabase
        .from('nutrition_reference')
        .select('name, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, aliases');

      if (error) {
        console.error('Error fetching nutrition data:', error);
        return { items: [] };
      }

      const normalizedItems: NormalizedFoodItem[] = [];

      for (const item of detectedItems) {
        // Find best match in nutrition database
        let bestMatch = null;
        let bestScore = 0;

        for (const nutrition of nutritionData || []) {
          // Check exact name match
          if (nutrition.name.toLowerCase() === item.label.toLowerCase()) {
            bestMatch = nutrition;
            break;
          }

          // Check aliases
          if (nutrition.aliases) {
            for (const alias of nutrition.aliases) {
              if (alias.toLowerCase() === item.label.toLowerCase()) {
                bestMatch = nutrition;
                break;
              }
            }
            if (bestMatch) break;
          }

          // Fuzzy matching - check if item label contains nutrition name or vice versa
          const itemLower = item.label.toLowerCase();
          const nutritionLower = nutrition.name.toLowerCase();
          
          if (itemLower.includes(nutritionLower.split(',')[0]) || nutritionLower.includes(itemLower)) {
            const score = Math.max(
              itemLower.length - Math.abs(itemLower.length - nutritionLower.length),
              nutritionLower.length - Math.abs(itemLower.length - nutritionLower.length)
            );
            
            if (score > bestScore) {
              bestScore = score;
              bestMatch = nutrition;
            }
          }
        }

        if (bestMatch) {
          normalizedItems.push({
            name: bestMatch.name,
            source_name: item.label,
            kcal_per_100: Number(bestMatch.kcal_per_100),
            protein_per_100: Number(bestMatch.protein_per_100),
            carbs_per_100: Number(bestMatch.carbs_per_100),
            fat_per_100: Number(bestMatch.fat_per_100)
          });
        } else {
          // Default nutritional values for unknown items
          normalizedItems.push({
            name: item.label,
            source_name: item.label,
            kcal_per_100: 100,
            protein_per_100: 5,
            carbs_per_100: 15,
            fat_per_100: 2
          });
        }
      }

      return { items: normalizedItems };
    } catch (error) {
      console.error('Error normalizing nutrition:', error);
      return { items: [] };
    }
  };

  const processFoodRecognition = async (imageFile: File): Promise<FoodRecognitionResult> => {
    // Simulate food recognition for demo purposes
    // In a real implementation, this would use AI/ML for food detection
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock results for demo
        const mockItems: FoodItem[] = [
          {
            label: "rice",
            confidence: 0.892,
            bbox_area_ratio: 0.35
          },
          {
            label: "grilled chicken", 
            confidence: 0.765,
            bbox_area_ratio: 0.28
          },
          {
            label: "salad",
            confidence: 0.654,
            bbox_area_ratio: 0.22
          }
        ];

        resolve({
          items: mockItems,
          plate_present: true
        });
      }, 2000); // Simulate processing time
    });
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process image
    setIsProcessing(true);
    try {
      const recognition = await processFoodRecognition(file);
      setResult(recognition);
      
      // Normalize nutrition data
      if (recognition.items.length > 0) {
        const normalized = await normalizeNutrition(recognition.items);
        setNormalizedResult(normalized);
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setResult(null);
      setNormalizedResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-soft border-0">
      <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <Camera className="h-5 w-5 text-primary" />
        Food Recognition
      </h3>
      
      <div className="space-y-4">
        {/* Upload Area */}
        <div 
          onClick={triggerFileInput}
          className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          {imagePreview ? (
            <img 
              src={imagePreview} 
              alt="Food preview" 
              className="max-w-full h-48 mx-auto object-contain rounded-lg mb-4"
            />
          ) : (
            <div className="space-y-2">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Click to upload a meal photo</p>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <Button 
          onClick={triggerFileInput}
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
            </>
          )}
        </Button>

        {/* Results */}
        {result && (
          <div className="mt-6 space-y-4">
            <h4 className="font-medium text-foreground">Step 1: Food Detection</h4>
            
            <div className="bg-background/50 rounded-lg p-4">
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            {result.items.length > 0 && (
              <div className="space-y-2">
                {result.items.map((item, index) => (
                  <div 
                    key={index}
                    className="flex justify-between items-center p-2 bg-background/30 rounded"
                  >
                    <span className="font-medium">{item.label}</span>
                    <div className="text-sm text-muted-foreground">
                      {(item.confidence * 100).toFixed(1)}% • {(item.bbox_area_ratio * 100).toFixed(1)}% area
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Normalized Nutrition Results */}
        {normalizedResult && (
          <div className="mt-6 space-y-4">
            <h4 className="font-medium text-foreground">Step 2: Nutrition Normalization</h4>
            
            <div className="bg-background/50 rounded-lg p-4">
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(normalizedResult, null, 2)}
              </pre>
            </div>

            {normalizedResult.items.length > 0 && (
              <div className="space-y-3">
                {normalizedResult.items.map((item, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-background/30 rounded-lg"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Originally: "{item.source_name}"
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Calories: {item.kcal_per_100}/100g</div>
                      <div>Protein: {item.protein_per_100}g</div>
                      <div>Carbs: {item.carbs_per_100}g</div>
                      <div>Fat: {item.fat_per_100}g</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default FoodRecognition;