import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit3 } from 'lucide-react';
import { useSpring, animated } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';

interface SwipeableEntryProps {
  children: React.ReactNode;
  onDelete: () => void;
  onEdit: () => void;
  disabled?: boolean;
}

export const SwipeableEntry = ({ 
  children, 
  onDelete, 
  onEdit, 
  disabled = false 
}: SwipeableEntryProps) => {
  const [swiped, setSwiped] = useState(false);
  
  const [{ x }, api] = useSpring(() => ({ x: 0 }));

  const bind = useDrag(
    ({ down, movement: [mx], direction: [xDir], velocity: [vx] }) => {
      if (disabled) return;
      
      const trigger = Math.abs(mx) > 50 || Math.abs(vx) > 0.5;
      const dir = xDir < 0 ? -1 : 1;
      
      if (!down && trigger) {
        setSwiped(dir === -1);
        api.start({ x: dir === -1 ? -120 : 0 });
      } else if (down) {
        api.start({ x: mx, immediate: true });
      } else {
        api.start({ x: swiped ? -120 : 0 });
      }
    },
    {
      axis: 'x',
      bounds: { left: -120, right: 0 }
    }
  );

  const handleDelete = () => {
    onDelete();
    api.start({ x: 0 });
    setSwiped(false);
  };

  const handleEdit = () => {
    onEdit();
    api.start({ x: 0 });
    setSwiped(false);
  };

  const resetSwipe = () => {
    api.start({ x: 0 });
    setSwiped(false);
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Action buttons (revealed when swiped) */}
      <div className="absolute right-0 top-0 h-full flex items-center bg-destructive/10 rounded-r-lg">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleEdit}
          className="h-full px-3 rounded-none text-muted-foreground hover:text-primary"
        >
          <Edit3 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="h-full px-3 rounded-none text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Main content */}
      <animated.div
        {...bind()}
        style={{ x }}
        onClick={swiped ? resetSwipe : undefined}
        className="relative z-10 touch-pan-y select-none"
      >
        <Card className="p-4 cursor-grab active:cursor-grabbing">
          {children}
        </Card>
      </animated.div>
    </div>
  );
};