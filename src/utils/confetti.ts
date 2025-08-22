import confetti from 'canvas-confetti';

export const triggerConfetti = (options?: {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
  shapes?: ('square' | 'circle')[];
  scalar?: number;
}) => {
  const defaults = {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
    shapes: ['square', 'circle'] as ('square' | 'circle')[],
    scalar: 1
  };

  confetti({
    ...defaults,
    ...options
  });
};

export const triggerGoalCelebration = () => {
  // Celebratory burst sequence
  const colors = ['#FFD700', '#FFA500', '#FF69B4', '#00CED1', '#32CD32'];
  
  // First burst from left
  triggerConfetti({
    particleCount: 50,
    spread: 55,
    origin: { x: 0.25, y: 0.6 },
    colors,
    scalar: 1.2
  });

  // Second burst from right
  setTimeout(() => {
    triggerConfetti({
      particleCount: 50,
      spread: 55,
      origin: { x: 0.75, y: 0.6 },
      colors,
      scalar: 1.2
    });
  }, 150);

  // Central celebration burst
  setTimeout(() => {
    triggerConfetti({
      particleCount: 100,
      spread: 90,
      origin: { x: 0.5, y: 0.3 },
      colors,
      scalar: 1.5
    });
  }, 300);

  // Final shower
  setTimeout(() => {
    triggerConfetti({
      particleCount: 150,
      spread: 120,
      origin: { x: 0.5, y: 0.1 },
      colors,
      scalar: 0.8
    });
  }, 600);
};

export const triggerMilestoneCelebration = (milestone?: number) => {
  const colors = milestone === 25 ? ['#FFD700', '#FFA500'] :
                milestone === 50 ? ['#4ECDC4', '#45B7D1'] :
                milestone === 75 ? ['#FF69B4', '#9B59B6'] :
                ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'];

  // Main celebration burst
  triggerConfetti({
    particleCount: 120,
    spread: 100,
    origin: { y: 0.4 },
    colors,
    scalar: 1.1
  });

  // Follow-up sparkles
  setTimeout(() => {
    triggerConfetti({
      particleCount: 60,
      spread: 60,
      origin: { x: 0.3, y: 0.7 },
      colors,
      scalar: 0.8
    });
  }, 200);

  setTimeout(() => {
    triggerConfetti({
      particleCount: 60,
      spread: 60,
      origin: { x: 0.7, y: 0.7 },
      colors,
      scalar: 0.8
    });
  }, 400);
};

export const triggerStreakCelebration = () => {
  const fireColors = ['#FF4500', '#FF6347', '#FFD700', '#FF8C00'];
  
  triggerConfetti({
    particleCount: 100,
    spread: 80,
    origin: { y: 0.6 },
    colors: fireColors,
    scalar: 1.0
  });
};

export const triggerWeightLossCelebration = (amount: number) => {
  const greenColors = ['#00C851', '#28A745', '#20C997', '#17A2B8'];
  
  // Celebration intensity based on weight loss amount
  const intensity = Math.min(amount / 5, 3); // Cap at 3x intensity
  
  triggerConfetti({
    particleCount: Math.floor(80 * intensity),
    spread: Math.floor(70 + (intensity * 10)),
    origin: { y: 0.6 },
    colors: greenColors,
    scalar: 0.9 + (intensity * 0.3)
  });
};