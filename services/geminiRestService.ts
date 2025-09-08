import type { GeneratedContent } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

if (!process.env.API_BASE_URL) {
  throw new Error("API_BASE_URL environment variable is not set.");
}

const API_BASE_URL = process.env.API_BASE_URL;
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
    console.log('API_KEY exists:', !!process.env.API_KEY);
    console.log('API_KEY length:', process.env.API_KEY?.length);
    console.log('API_KEY starts with sk-:', process.env.API_KEY?.startsWith('sk-'));
    
    const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY!}`,
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
      const imageRegex = /!\[image\]\(data:image\/[^;]+;base64,([^)]+)\)/;
      const imageMatch = content.match(imageRegex);
      
      if (imageMatch) {
        const base64Data = imageMatch[1];
        result.imageUrl = `data:image/png;base64,${base64Data}`;
        
        // Extract text (remove image markdown)
        result.text = content.replace(imageRegex, '').trim();
      } else {
        result.text = content;
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