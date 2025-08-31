import { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Loader2 } from "lucide-react";
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

interface FoodItem {
  label: string;
  confidence: number;
  bbox_area_ratio: number;
}

interface FoodRecognitionResult {
  items: FoodItem[];
  plate_present: boolean;
}

const FoodRecognition = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<FoodRecognitionResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const foodKeywords = [
    'rice', 'bread', 'chicken', 'beef', 'fish', 'egg', 'potato', 'tomato',
    'lettuce', 'salad', 'pasta', 'noodle', 'soup', 'curry', 'dal', 'idli',
    'dosa', 'chapati', 'roti', 'vegetable', 'fruit', 'apple', 'banana',
    'carrot', 'broccoli', 'cheese', 'milk', 'yogurt', 'pizza', 'burger',
    'sandwich', 'cake', 'cookie', 'pie', 'meat', 'pork', 'turkey'
  ];

  const processFoodRecognition = async (imageFile: File): Promise<FoodRecognitionResult> => {
    try {
      // Create classifier pipeline
      const classifier = await pipeline(
        'image-classification',
        'google/vit-base-patch16-224',
        { device: 'webgpu' }
      );

      // Process the image
      const results = await classifier(imageFile);
      
      // Filter and process results for food items
      const foodItems: FoodItem[] = [];
      let plateDetected = false;
      
      results.forEach((item: any, index: number) => {
        const label = item.label.toLowerCase();
        const confidence = item.score;
        
        // Check if it's a plate
        if (label.includes('plate') || label.includes('bowl') || label.includes('dish')) {
          plateDetected = true;
        }
        
        // Check if it's food-related
        const isFoodItem = foodKeywords.some(keyword => 
          label.includes(keyword) || keyword.includes(label.split(' ')[0])
        );
        
        if (isFoodItem && confidence > 0.1) {
          // Simplified food name
          let simplifiedLabel = label;
          if (label.includes('chicken')) simplifiedLabel = 'grilled chicken';
          else if (label.includes('rice')) simplifiedLabel = 'rice';
          else if (label.includes('bread')) simplifiedLabel = 'bread';
          else if (label.includes('salad') || label.includes('lettuce')) simplifiedLabel = 'salad';
          else if (label.includes('potato')) simplifiedLabel = 'potato';
          else if (label.includes('soup')) simplifiedLabel = 'soup';
          else if (label.includes('pasta') || label.includes('noodle')) simplifiedLabel = 'pasta';
          
          // Estimate area ratio based on confidence and position
          // Higher confidence items get larger area ratios
          const baseArea = confidence * 0.4; // Scale down from confidence
          const positionFactor = 1 - (index * 0.1); // Earlier results get larger areas
          const areaRatio = Math.min(baseArea * Math.max(positionFactor, 0.1), 0.8);
          
          foodItems.push({
            label: simplifiedLabel,
            confidence: parseFloat(confidence.toFixed(3)),
            bbox_area_ratio: parseFloat(areaRatio.toFixed(3))
          });
        }
      });
      
      // Merge similar items and normalize area ratios
      const mergedItems = new Map<string, FoodItem>();
      
      foodItems.forEach(item => {
        if (mergedItems.has(item.label)) {
          const existing = mergedItems.get(item.label)!;
          mergedItems.set(item.label, {
            label: item.label,
            confidence: Math.max(existing.confidence, item.confidence),
            bbox_area_ratio: existing.bbox_area_ratio + item.bbox_area_ratio
          });
        } else {
          mergedItems.set(item.label, item);
        }
      });
      
      // Convert back to array and normalize ratios to sum ≤ 1.0
      const finalItems = Array.from(mergedItems.values());
      const totalRatio = finalItems.reduce((sum, item) => sum + item.bbox_area_ratio, 0);
      
      if (totalRatio > 1.0) {
        finalItems.forEach(item => {
          item.bbox_area_ratio = parseFloat((item.bbox_area_ratio / totalRatio).toFixed(3));
        });
      }
      
      return {
        items: finalItems,
        plate_present: plateDetected
      };
      
    } catch (error) {
      console.error('Food recognition error:', error);
      // Return empty result on error
      return {
        items: [],
        plate_present: false
      };
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

    // Process image
    setIsProcessing(true);
    try {
      const recognition = await processFoodRecognition(file);
      setResult(recognition);
    } catch (error) {
      console.error('Error processing image:', error);
      setResult(null);
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
          <div className="mt-6 space-y-3">
            <h4 className="font-medium text-foreground">Recognition Results:</h4>
            
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
      </div>
    </Card>
  );
};

export default FoodRecognition;