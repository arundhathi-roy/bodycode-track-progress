import { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Loader2, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";

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
  fiber_per_100?: number;
}

interface CalculatedMeal {
  name: string;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

const FoodRecognition = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<FoodRecognitionResult | null>(null);
  const [normalizedResult, setNormalizedResult] = useState<{ items: NormalizedFoodItem[] } | null>(null);
  const [calculatedMeals, setCalculatedMeals] = useState<CalculatedMeal[] | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeNutrition = async (detectedItems: FoodItem[]): Promise<{ items: NormalizedFoodItem[] }> => {
    try {
      // Fetch nutrition reference data
      const { data: nutritionData, error } = await supabase
        .from('nutrition_reference')
        .select('name, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, fiber_per_100, aliases');

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
            fat_per_100: Number(bestMatch.fat_per_100),
            fiber_per_100: Number(bestMatch.fiber_per_100 || 0)
          });
        } else {
          // Default nutritional values for unknown items
          normalizedItems.push({
            name: item.label,
            source_name: item.label,
            kcal_per_100: 100,
            protein_per_100: 5,
            carbs_per_100: 15,
            fat_per_100: 2,
            fiber_per_100: 1
          });
        }
      }

      return { items: normalizedItems };
    } catch (error) {
      console.error('Error normalizing nutrition:', error);
      return { items: [] };
    }
  };

  const calculatePortionsAndNutrition = (detectedItems: FoodItem[], normalizedItems: NormalizedFoodItem[]): CalculatedMeal[] => {
    return detectedItems.map((detected, index) => {
      const normalized = normalizedItems[index];
      if (!normalized) return null;

      // Simple portion estimation based on area ratio
      // For demo: assume plate is ~27cm diameter, estimate grams from area
      const plateArea = Math.PI * Math.pow(13.5, 2); // 27cm diameter
      const itemArea = plateArea * detected.bbox_area_ratio;
      
      // Estimate height and density based on food type
      let height = 1.5; // default cm
      let density = 0.8; // default g/ml
      
      if (normalized.name.includes('rice') || normalized.name.includes('pasta')) {
        height = 1.8;
        density = 0.85;
      } else if (normalized.name.includes('chicken') || normalized.name.includes('meat')) {
        height = 2.0;
        density = 1.05;
      } else if (normalized.name.includes('salad') || normalized.name.includes('vegetables')) {
        height = 1.2;
        density = 0.2;
      }
      
      const volume = itemArea * height; // cm³ ≈ ml
      let grams = Math.round(volume * density);
      
      // Clamp between 20g and 800g, round to nearest 10g
      grams = Math.max(20, Math.min(800, Math.round(grams / 10) * 10));
      
      // Calculate nutrition based on grams
      const factor = grams / 100;
      
      return {
        name: normalized.name,
        grams: grams,
        kcal: Math.round(normalized.kcal_per_100 * factor),
        protein_g: Math.round(normalized.protein_per_100 * factor * 10) / 10,
        carbs_g: Math.round(normalized.carbs_per_100 * factor * 10) / 10,
        fat_g: Math.round(normalized.fat_per_100 * factor * 10) / 10,
        fiber_g: Math.round((normalized.fiber_per_100 || 0) * factor * 10) / 10
      };
    }).filter(Boolean) as CalculatedMeal[];
  };

  const saveMealsToDatabase = async (meals: CalculatedMeal[], mealType: string = 'snack') => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save meals",
        variant: "destructive"
      });
      return;
    }

    try {
      const mealEntries = meals.map(meal => ({
        user_id: user.id,
        meal_date: new Date().toISOString().split('T')[0],
        meal_type: mealType,
        food_name: meal.name,
        grams: meal.grams,
        kcal: meal.kcal,
        protein_g: meal.protein_g,
        carbs_g: meal.carbs_g,
        fat_g: meal.fat_g,
        fiber_g: meal.fiber_g
      }));

      const { error } = await supabase
        .from('meals')
        .insert(mealEntries);

      if (error) throw error;

      toast({
        title: "Meals Saved!",
        description: `Saved ${meals.length} food items to your daily nutrition`,
      });
    } catch (error) {
      console.error('Error saving meals:', error);
      toast({
        title: "Error",
        description: "Failed to save meals to database",
        variant: "destructive"
      });
    }
  };

  const processFoodRecognition = async (imageFile: File): Promise<FoodRecognitionResult> => {
    try {
      // Convert image to base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Call the edge function for food analysis
      const { data, error } = await supabase.functions.invoke('analyze-food-image', {
        body: { image: base64Image }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error('Failed to analyze food image');
      }

      if (!data.success) {
        console.error('Analysis failed:', data.error);
        throw new Error(data.error || 'Food analysis failed');
      }

      // Transform the AI response to match our expected format
      const aiItems = data.result.items || [];
      const transformedItems: FoodItem[] = aiItems.map((item: any) => ({
        label: item.name,
        confidence: item.confidence / 100, // Convert percentage to decimal
        bbox_area_ratio: Math.min(0.5, Math.max(0.1, item.portion_grams / 500)) // Estimate area from portion size
      }));

      return {
        items: transformedItems,
        plate_present: transformedItems.length > 0
      };
    } catch (error) {
      console.error('Error in processFoodRecognition:', error);
      throw error;
    }
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

    await processImage(file);
  };

  const handleCameraCapture = async () => {
    try {
      if (!Capacitor.isNativePlatform()) {
        // Fallback to file input on web
        triggerFileInput();
        return;
      }

      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      });

      if (image.webPath) {
        setImagePreview(image.webPath);
        
        // Convert to File object
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
        
        await processImage(file);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      // Fallback to file input if camera fails
      triggerFileInput();
    }
  };

  const processImage = async (file: File) => {
    // Process image
    setIsProcessing(true);
    try {
      const recognition = await processFoodRecognition(file);
      setResult(recognition);
      
      // Normalize nutrition data
      if (recognition.items.length > 0) {
        const normalized = await normalizeNutrition(recognition.items);
        setNormalizedResult(normalized);
        
        // Calculate portions and nutrition
        if (normalized.items.length > 0) {
          const calculated = calculatePortionsAndNutrition(recognition.items, normalized.items);
          setCalculatedMeals(calculated);
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setResult(null);
      setNormalizedResult(null);
      setCalculatedMeals(null);
    } finally {
      setIsProcessing(false);
      setImagePreview(null); // Clear image preview after processing
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
        Calories Tracker
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
          className="w-full mb-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Image className="h-4 w-4 mr-2" />
              Choose from Gallery
            </>
          )}
        </Button>

        <Button 
          onClick={handleCameraCapture}
          disabled={isProcessing}
          variant="outline"
          className="w-full"
        >
          <Camera className="h-4 w-4 mr-2" />
          Take Photo
        </Button>

        {/* Results are processed but not shown until final nutrition */}

        {/* Final Nutrition Calculation */}
        {calculatedMeals && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-foreground">Nutrition Results</h4>
              <Button
                onClick={() => saveMealsToDatabase(calculatedMeals)}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                Save to Profile
              </Button>
            </div>
            
            <div className="bg-background/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-center mb-4">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {calculatedMeals.reduce((sum, meal) => sum + meal.kcal, 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">Total Calories</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {calculatedMeals.reduce((sum, meal) => sum + meal.grams, 0)}g
                  </div>
                  <div className="text-xs text-muted-foreground">Total Weight</div>
                </div>
              </div>

              {calculatedMeals.map((meal, index) => (
                <div 
                  key={index}
                  className="p-3 bg-background/30 rounded-lg mb-3 last:mb-0"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{meal.name}</div>
                    <div className="text-sm text-muted-foreground">{meal.grams}g</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>🔥 {meal.kcal} kcal</div>
                    <div>🥩 {meal.protein_g}g protein</div>
                    <div>🍞 {meal.carbs_g}g carbs</div>
                    <div>🥑 {meal.fat_g}g fat</div>
                    {meal.fiber_g > 0 && <div>🌾 {meal.fiber_g}g fiber</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default FoodRecognition;