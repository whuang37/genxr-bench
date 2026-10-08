import {defineConfig} from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: [
      '@mediapipe/tasks-vision',
      '@mediapipe/tasks-audio',
      'lit',
      '@pmndrs/uikit',
      '@preact/signals-core',
      '@sparkjsdev/spark',
      'rapier3d',
      'three-mesh-bvh',
    ],
  },
  build: {
    rollupOptions: {
      external: [
        '@mediapipe/tasks-vision',
        '@mediapipe/tasks-audio',
        'lit',
        '@pmndrs/uikit',
        '@preact/signals-core',
        '@sparkjsdev/spark',
        'rapier3d',
        'three-mesh-bvh',
      ],
    },
  },
});
