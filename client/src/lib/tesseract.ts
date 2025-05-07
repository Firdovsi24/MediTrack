import Tesseract from 'tesseract.js';

export interface ExtractedMedicationData {
  name?: string;
  dosage?: string;
  instructions?: string;
  frequency?: string;
}

export async function extractTextFromImage(imageFile: File): Promise<string> {
  try {
    const result = await Tesseract.recognize(
      imageFile,
      'eng',
      { 
        logger: m => console.log(m)
      }
    );
    
    return result.data.text;
  } catch (error) {
    console.error('Error recognizing text:', error);
    throw new Error('Failed to extract text from image');
  }
}

// Extract medication data from OCR text
export async function parseMedicationInfo(text: string): Promise<ExtractedMedicationData> {
  const data: ExtractedMedicationData = {};
  
  // Try to identify medication name
  const nameMatch = text.match(/RX#?\s*\d*\s*([A-Za-z-]+\s?[A-Za-z-]*)/i) || 
                    text.match(/NAME:?\s*([A-Za-z-]+\s?[A-Za-z-]*)/i);
  if (nameMatch && nameMatch[1]) {
    data.name = nameMatch[1].trim();
  }
  
  // Try to identify dosage information
  const dosageMatch = text.match(/(\d+\s*(?:mg|mcg|ml|g))/i);
  if (dosageMatch && dosageMatch[1]) {
    data.dosage = dosageMatch[1].trim();
  }
  
  // Try to identify instructions
  const instructionsMatch = text.match(/TAKE\s*(.*?)(?:REFILLS|QTY|$)/i) || 
                            text.match(/DIRECTIONS:?\s*(.*?)(?:REFILLS|QTY|$)/i);
  if (instructionsMatch && instructionsMatch[1]) {
    data.instructions = instructionsMatch[1].trim();
    
    // Extract frequency information from instructions
    const frequencyMatches = data.instructions.match(/(daily|twice daily|every\s*\d+\s*hours?|every\s*morning|every\s*evening|once a day|twice a day|three times a day|bedtime|morning|evening|weekly)/i);
    if (frequencyMatches && frequencyMatches[1]) {
      data.frequency = frequencyMatches[1].toLowerCase();
    }
  }
  
  return data;
}

// Process image and extract medication information
export async function processMedicationImage(imageFile: File): Promise<ExtractedMedicationData> {
  try {
    const text = await extractTextFromImage(imageFile);
    console.log('Extracted text:', text);
    return parseMedicationInfo(text);
  } catch (error) {
    console.error('Error processing medication image:', error);
    throw new Error('Failed to process medication image');
  }
}
