import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    // 使用传入的环境变量，如果没有则使用默认值
    const apiKey = env.API_KEY || env.GEMINI_API_KEY || 'not-set';
    const apiBaseUrl = env.API_BASE_URL || 'https://api.ephone.ai';
    
    console.log('Building with API_KEY:', apiKey ? 'SET' : 'NOT SET');
    console.log('Building with API_BASE_URL:', apiBaseUrl);
    
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(apiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
        'process.env.API_BASE_URL': JSON.stringify(apiBaseUrl)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
