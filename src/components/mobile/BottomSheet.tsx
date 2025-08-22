import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  height?: 'half' | 'full' | 'auto';
}

export const BottomSheet = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  height = 'auto' 
}: BottomSheetProps) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const getHeight = () => {
    switch (height) {
      case 'half': return '50vh';
      case 'full': return '90vh';
      default: return 'auto';
    }
  };

  const [{ y }, api] = useSpring(() => ({ 
    y: isOpen ? 0 : 1000,
    config: { tension: 300, friction: 30 }
  }));

  useEffect(() => {
    api.start({ y: isOpen ? 0 : 1000 });
  }, [isOpen, api]);

  const bind = useDrag(
    ({ down, movement: [, my], velocity: [, vy], direction: [, yDir] }) => {
      setIsDragging(down);
      
      if (down) {
        api.start({ y: Math.max(0, my), immediate: true });
      } else {
        const shouldClose = my > 100 || (vy > 0.5 && yDir > 0);
        
        if (shouldClose) {
          onClose();
        } else {
          api.start({ y: 0 });
        }
      }
    },
    {
      axis: 'y',
      bounds: { top: 0 }
    }
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <animated.div
        style={{ y }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <Card className="rounded-t-2xl rounded-b-none border-b-0 max-h-[90vh] overflow-hidden">
          {/* Handle */}
          <div 
            {...bind()}
            className="flex justify-center p-2 cursor-grab active:cursor-grabbing touch-pan-x"
          >
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Content */}
          <div 
            className="overflow-y-auto"
            style={{ 
              maxHeight: height === 'auto' ? '70vh' : getHeight(),
              overscrollBehavior: 'contain'
            }}
          >
            <div className="p-4">
              {children}
            </div>
          </div>
        </Card>
      </animated.div>
    </>
  );
};