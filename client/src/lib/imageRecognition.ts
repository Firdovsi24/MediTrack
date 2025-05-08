/**
 * MediTrack image recognition module using OpenAI Vision API
 */

export interface ExtractedMedicationData {
  name?: string;
  dosage?: string;
  instructions?: string;
  frequency?: string;
}

/**
 * Converts a File object to a base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Analyze image using OpenAI Vision API
 */
export async function analyzeImageWithOpenAI(base64Image: string): Promise<string> {
  try {
    // Use our server as a proxy to the OpenAI API to keep the API key secure
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
      throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.result.trim();
  } catch (error) {
    console.error('Error analyzing image with OpenAI:', error);
    throw new Error('Failed to analyze image: ' + (error as Error).message);
  }
}

/**
 * Parse the OpenAI response into structured medication data
 */
export function parseMedicationFromAIResponse(aiResponse: string): ExtractedMedicationData {
  const data: ExtractedMedicationData = {};
  
  // Split response by lines
  const lines = aiResponse.split('\n').filter(line => line.trim() !== '');
  
  // Parse each line
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('medication name') || lowerLine.startsWith('name')) {
      const namePart = line.split(':')[1];
      if (namePart && namePart.trim() !== 'Unknown') {
        data.name = namePart.trim();
      }
    } else if (lowerLine.includes('dosage') || lowerLine.includes('strength')) {
      const dosagePart = line.split(':')[1];
      if (dosagePart && dosagePart.trim() !== 'Unknown') {
        data.dosage = dosagePart.trim();
      }
    } else if (lowerLine.includes('instruction') || lowerLine.includes('directions') || lowerLine.includes('take')) {
      const instructionsPart = line.split(':')[1];
      if (instructionsPart && instructionsPart.trim() !== 'Unknown') {
        data.instructions = instructionsPart.trim();
        
        // Try to extract frequency from instructions
        const frequencyMatches = instructionsPart.match(/(daily|twice daily|every\s*\d+\s*hours?|once a day|twice a day|three times a day|bedtime)/i);
        if (frequencyMatches && frequencyMatches[1]) {
          data.frequency = frequencyMatches[1].toLowerCase();
        }
      }
    } else if (lowerLine.includes('frequency')) {
      const frequencyPart = line.split(':')[1];
      if (frequencyPart && frequencyPart.trim() !== 'Unknown') {
        data.frequency = frequencyPart.trim().toLowerCase();
      }
    }
  }
  
  return data;
}

/**
 * Process an image file and extract medication information
 */
export async function processMedicationImage(imageFile: File): Promise<ExtractedMedicationData> {
  try {
    const base64Image = await fileToBase64(imageFile);
    const aiResponse = await analyzeImageWithOpenAI(base64Image);
    console.log('AI Response:', aiResponse);
    
    return parseMedicationFromAIResponse(aiResponse);
  } catch (error) {
    console.error('Error processing medication image:', error);
    throw new Error('Failed to process medication image: ' + (error as Error).message);
  }
}