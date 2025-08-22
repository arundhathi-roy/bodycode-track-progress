import { useEffect, useState } from 'react';
import { removeBackground, loadImage } from '@/utils/backgroundRemoval';

interface LogoProcessorProps {
  onProcessed: (processedLogoUrl: string) => void;
}

export const LogoProcessor = ({ onProcessed }: LogoProcessorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const processLogo = async () => {
      try {
        setIsProcessing(true);
        
        // Fetch the original logo
        const response = await fetch('/lovable-uploads/18716076-4e90-48b2-8969-fd4bdea3b01f.png');
        const blob = await response.blob();
        
        // Load as image element
        const imageElement = await loadImage(blob);
        
        // Remove background
        const processedBlob = await removeBackground(imageElement);
        
        // Create URL for the processed image
        const processedUrl = URL.createObjectURL(processedBlob);
        onProcessed(processedUrl);
        
      } catch (error) {
        console.error('Error processing logo:', error);
        // Fallback to original logo
        onProcessed('/lovable-uploads/18716076-4e90-48b2-8969-fd4bdea3b01f.png');
      } finally {
        setIsProcessing(false);
      }
    };

    processLogo();
  }, [onProcessed]);

  if (isProcessing) {
    return (
      <div className="h-16 w-16 mx-auto mb-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return null;
};