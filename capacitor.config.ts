import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.450aabb30604489cb8eb96cd1b776926',
  appName: 'bodycode-track-progress',
  webDir: 'dist',
  server: {
    url: 'https://450aabb3-0604-489c-b8eb-96cd1b776926.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
  }
};

export default config;