import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  ...(process.env.STANDALONE === 'true' ? { output: 'standalone' as const } : {}),
  outputFileTracingRoot: path.resolve(__dirname),
  serverExternalPackages: ['ws', 'onnxruntime-web'],
  outputFileTracingIncludes: {
    '/api/cctv/frame': [
      './node_modules/onnxruntime-web/dist/ort.node.min.mjs',
      './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
      './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
    ],
  },
  turbopack: {
    rules: {
      'maplibre-gl.mjs': {
        loaders: [path.resolve(__dirname, 'tools/maplibre-url-loader.cjs')],
      },
    },
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /maplibre-gl\.mjs$/,
      use: [path.resolve(__dirname, 'tools/maplibre-url-loader.cjs')],
    });
    return config;
  },
  async headers() {
    return [
      {
        source: '/vendor/maplibre/:version/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/vendor/yolox/:version/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self), bluetooth=(self), usb=(self), serial=(self), hid=(self), midi=(self)' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' blob: https: http:",
              "connect-src 'self' https: wss: ws: http:",
              "worker-src 'self' blob:",
              "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.twitch.tv https://www.tiktok.com https:// Embed.windy.com https://*.windy.com https:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
