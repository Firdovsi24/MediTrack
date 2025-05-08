/**
 * MediTrack image recognition module using Google's Gemini Vision API
 */

export interface ExtractedMedicationData {
  name?: string;
  dosage?: string;
  instructions?: string;
  frequency?: string;
}

/**
 * Converts a File object to a base64 string with aggressive resizing to avoid the "request entity too large" error
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // First read the image file
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target || !event.target.result) {
        reject(new Error('Failed to read file'));
        return;
      }
      
      // Create an image element to get dimensions and resize
      const img = new Image();
      img.onload = () => {
        // Create a canvas to resize the image
        const canvas = document.createElement('canvas');
        
        // Calculate new dimensions (reduced to max 600px to further reduce file size)
        const maxSize = 600;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        
        // Set canvas dimensions and draw resized image
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Apply some background optimization
        ctx.fillStyle = 'white'; // Set white background
        ctx.fillRect(0, 0, width, height);
        
        // Draw the image with the white background
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get base64 data from canvas (with more aggressive quality reduction to 0.5)
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.5);
        
        // Check the size of the base64 string to ensure it's not too large (approx 6MB limit)
        const base64Data = resizedBase64.split(',')[1];
        const approximateSizeInBytes = Math.ceil((base64Data.length * 3) / 4);
        
        console.log(`Resized image size: ${(approximateSizeInBytes / (1024 * 1024)).toFixed(2)}MB`);
        
        // If still too large, resize again with even more aggressive compression
        if (approximateSizeInBytes > 6 * 1024 * 1024) {
          // Create a smaller canvas
          const smallerCanvas = document.createElement('canvas');
          const smallerMaxSize = 400; // Even smaller size
          let smallerWidth = width;
          let smallerHeight = height;
          
          if (smallerWidth > smallerHeight && smallerWidth > smallerMaxSize) {
            smallerHeight = Math.round((smallerHeight * smallerMaxSize) / smallerWidth);
            smallerWidth = smallerMaxSize;
          } else if (smallerHeight > smallerMaxSize) {
            smallerWidth = Math.round((smallerWidth * smallerMaxSize) / smallerHeight);
            smallerHeight = smallerMaxSize;
          }
          
          smallerCanvas.width = smallerWidth;
          smallerCanvas.height = smallerHeight;
          const smallerCtx = smallerCanvas.getContext('2d');
          
          if (!smallerCtx) {
            reject(new Error('Failed to get canvas context for smaller image'));
            return;
          }
          
          // White background
          smallerCtx.fillStyle = 'white';
          smallerCtx.fillRect(0, 0, smallerWidth, smallerHeight);
          
          // Draw the image
          smallerCtx.drawImage(img, 0, 0, smallerWidth, smallerHeight);
          
          // Get more compressed base64 data
          const moreCompressedBase64 = smallerCanvas.toDataURL('image/jpeg', 0.3);
          const finalBase64Data = moreCompressedBase64.split(',')[1];
          
          const finalSizeInBytes = Math.ceil((finalBase64Data.length * 3) / 4);
          console.log(`Further compressed image size: ${(finalSizeInBytes / (1024 * 1024)).toFixed(2)}MB`);
          
          resolve(finalBase64Data);
        } else {
          // Original resized image is small enough
          resolve(base64Data);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image for resizing'));
      };
      
      // Set the source of the image to the file data
      img.src = event.target.result.toString();
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Analyze image using Google's Gemini Vision API
 */
export async function analyzeImageWithAI(base64Image: string): Promise<string> {
  try {
    // Use our server as a proxy to the Gemini API to keep the API key secure
    const response = await fetch("/api/analyze-medication-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: base64Image
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.result.trim();
  } catch (error) {
    console.error('Error analyzing image with Gemini API:', error);
    throw new Error('Failed to analyze image: ' + (error as Error).message);
  }
}

/**
 * Parse the AI response into structured medication data
 */
export function parseMedicationFromAIResponse(aiResponse: string): ExtractedMedicationData {
  const data: ExtractedMedicationData = {};
  
  // Split response by lines
  const lines = aiResponse.split('\n').filter(line => line.trim() !== '');
  
  // Parse each line - with more robust splitting to handle different formats
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Use robust splitting that handles variations in format
    const getValuePart = (line: string): string | null => {
      // Handle case with proper colon formatting
      if (line.includes(':')) {
        return line.split(':')[1]?.trim();
      }
      // Try to extract value from other formats
      const patterns = [
        /medication\s*name\s*[:-]?\s*(.*)/i,
        /name\s*[:-]?\s*(.*)/i,
        /dosage\s*[:-]?\s*(.*)/i,
        /strength\s*[:-]?\s*(.*)/i,
        /instructions?\s*[:-]?\s*(.*)/i,
        /directions?\s*[:-]?\s*(.*)/i,
        /take\s*[:-]?\s*(.*)/i,
        /frequency\s*[:-]?\s*(.*)/i
      ];
      
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      return null;
    };
    
    // Extract medication name
    if (lowerLine.includes('medication name') || lowerLine.startsWith('name')) {
      const namePart = getValuePart(line);
      if (namePart && namePart !== 'Unknown') {
        // Clean up any brackets or other formatting
        data.name = namePart.replace(/[\[\]]/g, '').trim();
      }
    } 
    // Extract dosage information
    else if (lowerLine.includes('dosage') || lowerLine.includes('strength')) {
      const dosagePart = getValuePart(line);
      if (dosagePart && dosagePart !== 'Unknown') {
        data.dosage = dosagePart.replace(/[\[\]]/g, '').trim();
      }
    } 
    // Extract instructions
    else if (lowerLine.includes('instruction') || lowerLine.includes('directions') || lowerLine.includes('take')) {
      const instructionsPart = getValuePart(line);
      if (instructionsPart && instructionsPart !== 'Unknown') {
        data.instructions = instructionsPart.replace(/[\[\]]/g, '').trim();
        
        // Try to extract frequency from instructions
        const frequencyMatches = instructionsPart.match(/(daily|twice daily|every\s*\d+\s*hours?|once a day|twice a day|three times a day|bedtime)/i);
        if (frequencyMatches && frequencyMatches[1]) {
          data.frequency = frequencyMatches[1].toLowerCase();
        }
      }
    } 
    // Extract direct frequency mention
    else if (lowerLine.includes('frequency')) {
      const frequencyPart = getValuePart(line);
      if (frequencyPart && frequencyPart !== 'Unknown') {
        data.frequency = frequencyPart.replace(/[\[\]]/g, '').trim().toLowerCase();
      }
    }
  }
  
  console.log('Parsed medication data:', data);
  return data;
}

/**
 * Process an image file and extract medication information
 */
export async function processMedicationImage(imageFile: File): Promise<ExtractedMedicationData> {
  try {
    const base64Image = await fileToBase64(imageFile);
    const aiResponse = await analyzeImageWithAI(base64Image);
    console.log('AI Response:', aiResponse);
    
    return parseMedicationFromAIResponse(aiResponse);
  } catch (error) {
    console.error('Error processing medication image:', error);
    throw new Error('Failed to process medication image: ' + (error as Error).message);
  }
}