import type { GeneratedContent } from '../types';

// 获取运行时配置（优先使用运行时配置，fallback 到构建时配置）
const getConfig = () => {
  // @ts-ignore - window.APP_CONFIG 在运行时注入
  if (typeof window !== 'undefined' && window.APP_CONFIG) {
    // @ts-ignore
    return window.APP_CONFIG;
  }
  
  // Fallback 到构建时配置
  return {
    API_KEY: process.env.API_KEY || 'not-set',
    API_BASE_URL: process.env.API_BASE_URL || 'https://api.ephone.ai'
  };
};

const config = getConfig();

if (!config.API_KEY || config.API_KEY === 'not-set') {
  throw new Error("API_KEY is not configured. Please set it in docker-compose environment variables.");
}

if (!config.API_BASE_URL) {
  throw new Error("API_BASE_URL is not configured.");
}

const API_BASE_URL = config.API_BASE_URL;
const MODEL = "gemini-2.5-flash-image-preview";

export async function editImage(
    base64ImageData: string, 
    mimeType: string, 
    prompt: string,
    maskBase64: string | null,
    secondaryImage: { base64: string; mimeType: string } | null
): Promise<GeneratedContent> {
  try {
    let fullPrompt = prompt;
    
    // Build content array for OpenAI format
    const content: any[] = [];
    
    // Add text prompt
    content.push({
      type: "text",
      text: fullPrompt
    });

    // Add main image
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${base64ImageData}`
      }
    });

    // Add mask if provided
    if (maskBase64) {
      content.push({
        type: "image_url", 
        image_url: {
          url: `data:image/png;base64,${maskBase64}`
        }
      });
      fullPrompt = `Apply the following instruction only to the masked area of the image: "${prompt}". Preserve the unmasked area.`;
      // Update the text content
      content[0].text = fullPrompt;
    }
    
    // Add secondary image if provided
    if (secondaryImage) {
      content.push({
        type: "image_url",
        image_url: {
          url: `data:${secondaryImage.mimeType};base64,${secondaryImage.base64}`
        }
      });
    }

    console.log('API Request Details:');
    console.log('URL:', `${API_BASE_URL}/v1/chat/completions`);
    console.log('API_KEY exists:', !!config.API_KEY);
    console.log('API_KEY length:', config.API_KEY?.length);
    console.log('API_KEY starts with sk-:', config.API_KEY?.startsWith('sk-'));
    console.log('Using runtime config:', typeof window !== 'undefined' && window.APP_CONFIG ? 'YES' : 'NO');
    
    const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [
          {
            role: "user",
            content: content
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('API Error Response:', response.status, response.statusText);
      console.error('API Error Data:', errorData);
      
      let errorMessage = "The model did not return an image. It might have refused the request. Please try a different image or prompt.";
      
      try {
        const parsedError = JSON.parse(errorData);
        if (parsedError.error && parsedError.error.message) {
          errorMessage = parsedError.error.message;
        }
      } catch (e) {
        // Not JSON, use original error data
        errorMessage = errorData || `HTTP ${response.status}: ${response.statusText}`;
      }
      
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    const result: GeneratedContent = { imageUrl: null, text: null };

    // Parse OpenAI format response
    const choice = responseData.choices?.[0];
    if (choice?.message?.content) {
      const content = choice.message.content;
      
      // Extract text and image from markdown format
      const httpImageRegex = /!\[image\]\((https?:\/\/[^\s)]+)\)/;
      const base64ImageRegex = /!\[image\]\(data:image\/[^;]+;base64,([^)]+)\)/;
      
      // Try HTTP URL first
      const httpMatch = content.match(httpImageRegex);
      if (httpMatch) {
        const imageUrl = httpMatch[1];
        result.imageUrl = imageUrl;
        
        // Extract text (remove image markdown)
        result.text = content.replace(httpImageRegex, '').trim();
      } else {
        // Try base64 format
        const base64Match = content.match(base64ImageRegex);
        if (base64Match) {
          const base64Data = base64Match[1];
          result.imageUrl = `data:image/png;base64,${base64Data}`;
          
          // Extract text (remove image markdown)
          result.text = content.replace(base64ImageRegex, '').trim();
        } else {
          // No image found, just text
          result.text = content;
        }
      }
    }

    if (!result.imageUrl && !result.text) {
      throw new Error("The model did not return any content. Please try a different image or prompt.");
    }

    return result;

  } catch (error) {
    console.error("Error calling API:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unknown error occurred while communicating with the API.");
  }
}