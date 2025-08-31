import { useState, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Camera, Loader2 } from "lucide-react";

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