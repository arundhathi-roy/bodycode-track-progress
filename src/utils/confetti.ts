import confetti from 'canvas-confetti';

export const triggerConfetti = (options?: {
  particleCount?: number;
  spread?: number;
  origin?: { x?: number; y?: number };
  colors?: string[];
}) => {
  const defaults = {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7']
  };

  confetti({
    ...defaults,
    ...options
  });
};

export const triggerGoalCelebration = () => {
  // First burst
  triggerConfetti({
    particleCount: 50,
    spread: 60,
    origin: { x: 0.3, y: 0.6 }
  });

  // Second burst
  setTimeout(() => {
    triggerConfetti({
      particleCount: 50,
      spread: 60,
      origin: { x: 0.7, y: 0.6 }
    });
  }, 200);

  // Third burst from center
  setTimeout(() => {
    triggerConfetti({
      particleCount: 75,
      spread: 90,
      origin: { x: 0.5, y: 0.4 }
    });
  }, 400);
};

export const triggerMilestoneCelebration = () => {
  triggerConfetti({
    particleCount: 200,
    spread: 180,
    origin: { y: 0.3 },
    colors: ['#FFD700', '#FFA500', '#FF69B4', '#00CED1']
  });
};