import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini Multimodal Service
 * Handles image, audio, and document processing using Gemini Vision and Audio APIs
 */

// Supported formats
export const SUPPORTED_IMAGE_FORMATS = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
export const SUPPORTED_AUDIO_FORMATS = ['audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac'];

// Response interfaces
export interface DocumentScanResult {
  type: 'id_card' | 'invoice' | 'receipt' | 'w2' | 'paystub' | 'other';
  extractedData: Record<string, any>;
  confidence: number;
  rawText: string;
}

export interface ImageVerificationResult {
  isValid: boolean;
  documentType: string;
  confidence: number;
  warnings: string[];
  details: Record<string, any>;
}

export interface AudioTranscriptionResult {
  transcript: string;
  duration?: number;
  language?: string;
  confidence: number;
}

class GeminiMultimodalService {
  private static instance: GeminiMultimodalService;
  private genAI: GoogleGenerativeAI;
  private visionModel: any;
  private audioModel: any;

  private constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.visionModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    this.audioModel = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    console.log('[Gemini Multimodal] Service initialized');
  }

  public static getInstance(): GeminiMultimodalService {
    if (!GeminiMultimodalService.instance) {
      GeminiMultimodalService.instance = new GeminiMultimodalService();
    }
    return GeminiMultimodalService.instance;
  }

  /**
   * Process an image with a custom prompt
   */
  async processImage(imageData: string, mimeType: string, prompt: string): Promise<string> {
    try {
      console.log(`[Gemini Multimodal] Processing image (${mimeType})`);

      if (!SUPPORTED_IMAGE_FORMATS.includes(mimeType)) {
        throw new Error(`Unsupported image format: ${mimeType}`);
      }

      // Remove data URL prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

      const result = await this.visionModel.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
        prompt,
      ]);

      const response = result.response;
      const text = response.text();

      console.log(`[Gemini Multimodal] Image processed successfully`);
      return text;
    } catch (error) {
      console.error('[Gemini Multimodal] Error processing image:', error);
      throw new Error(`Failed to process image: ${(error as Error).message}`);
    }
  }

  /**
   * Scan and extract data from ID card
   */
  async scanIDCard(imageData: string, mimeType: string): Promise<DocumentScanResult> {
    const prompt = `Analyze this ID card or identification document and extract the following information in JSON format:
{
  "fullName": "extracted full name",
  "firstName": "first name",
  "lastName": "last name",
  "dateOfBirth": "date of birth in YYYY-MM-DD format",
  "idNumber": "ID or document number",
  "address": "full address if visible",
  "city": "city",
  "state": "state/province",
  "zipCode": "zip/postal code",
  "country": "country",
  "expirationDate": "expiration date in YYYY-MM-DD format if applicable",
  "documentType": "type of document (e.g., driver's license, passport, national ID)"
}

Only include fields that are clearly visible and readable. Use null for fields that cannot be determined.`;

    try {
      const response = await this.processImage(imageData, mimeType, prompt);

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let extractedData = {};

      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }

      return {
        type: 'id_card',
        extractedData,
        confidence: this.estimateConfidence(response),
        rawText: response,
      };
    } catch (error) {
      console.error('[Gemini Multimodal] Error scanning ID card:', error);
      throw error;
    }
  }

  /**
   * Scan and extract data from invoice or receipt
   */
  async scanInvoiceOrReceipt(imageData: string, mimeType: string): Promise<DocumentScanResult> {
    const prompt = `Analyze this invoice or receipt and extract the following information in JSON format:
{
  "documentType": "invoice or receipt",
  "vendor": "vendor/merchant name",
  "vendorAddress": "vendor address if visible",
  "date": "transaction date in YYYY-MM-DD format",
  "invoiceNumber": "invoice or receipt number",
  "items": [
    {
      "description": "item description",
      "quantity": "quantity",
      "unitPrice": "unit price",
      "totalPrice": "total price"
    }
  ],
  "subtotal": "subtotal amount as number",
  "tax": "tax amount as number",
  "total": "total amount as number",
  "currency": "currency code (e.g., USD)",
  "paymentMethod": "payment method if visible"
}

Extract all visible line items. Use null for fields that cannot be determined. Return only valid JSON.`;

    try {
      const response = await this.processImage(imageData, mimeType, prompt);

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let extractedData = {};

      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }

      const docType = (extractedData as any).documentType?.toLowerCase().includes('invoice') ? 'invoice' : 'receipt';

      return {
        type: docType as 'invoice' | 'receipt',
        extractedData,
        confidence: this.estimateConfidence(response),
        rawText: response,
      };
    } catch (error) {
      console.error('[Gemini Multimodal] Error scanning invoice/receipt:', error);
      throw error;
    }
  }

  /**
   * Scan W-2 tax form
   */
  async scanW2Form(imageData: string, mimeType: string): Promise<DocumentScanResult> {
    const prompt = `Analyze this W-2 tax form and extract the following information in JSON format:
{
  "employeeName": "employee name (box c)",
  "employeeSSN": "employee SSN (box a)",
  "employerName": "employer name (box c)",
  "employerEIN": "employer EIN (box b)",
  "employerAddress": "employer address",
  "wages": "wages, tips, other compensation (box 1) as number",
  "federalTaxWithheld": "federal income tax withheld (box 2) as number",
  "socialSecurityWages": "social security wages (box 3) as number",
  "socialSecurityTaxWithheld": "social security tax withheld (box 4) as number",
  "medicareWages": "medicare wages (box 5) as number",
  "medicareTaxWithheld": "medicare tax withheld (box 6) as number",
  "year": "tax year"
}

Extract all visible amounts as numbers without currency symbols. Use null for fields that cannot be determined. Return only valid JSON.`;

    try {
      const response = await this.processImage(imageData, mimeType, prompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let extractedData = {};

      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      }

      return {
        type: 'w2',
        extractedData,
        confidence: this.estimateConfidence(response),
        rawText: response,
      };
    } catch (error) {
      console.error('[Gemini Multimodal] Error scanning W-2:', error);
      throw error;
    }
  }

  /**
   * Verify document authenticity
   */
  async verifyDocument(imageData: string, mimeType: string): Promise<ImageVerificationResult> {
    const prompt = `Analyze this document image and assess its authenticity. Check for:
1. Image quality and clarity
2. Signs of tampering or manipulation
3. Presence of security features (watermarks, holograms, etc.)
4. Text alignment and consistency
5. Overall document structure

Provide assessment in JSON format:
{
  "isLikelyAuthentic": true/false,
  "documentType": "identified document type",
  "confidenceScore": 0-100,
  "warnings": ["list of concerns or warnings"],
  "securityFeatures": ["identified security features"],
  "qualityIssues": ["image quality issues if any"]
}`;

    try {
      const response = await this.processImage(imageData, mimeType, prompt);

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      let details: any = {};

      if (jsonMatch) {
        details = JSON.parse(jsonMatch[0]);
      }

      return {
        isValid: details.isLikelyAuthentic !== false,
        documentType: details.documentType || 'unknown',
        confidence: details.confidenceScore || 50,
        warnings: details.warnings || [],
        details,
      };
    } catch (error) {
      console.error('[Gemini Multimodal] Error verifying document:', error);
      throw error;
    }
  }

  /**
   * Process audio and get transcription
   */
  async transcribeAudio(audioData: string, mimeType: string, language?: string): Promise<AudioTranscriptionResult> {
    try {
      console.log(`[Gemini Multimodal] Transcribing audio (${mimeType})`);

      if (!SUPPORTED_AUDIO_FORMATS.includes(mimeType)) {
        throw new Error(`Unsupported audio format: ${mimeType}`);
      }

      // Remove data URL prefix if present
      const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, '');

      const prompt = language
        ? `Transcribe this audio in ${language}. Provide only the transcription text.`
        : 'Transcribe this audio. Provide only the transcription text.';

      const result = await this.audioModel.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
        prompt,
      ]);

      const response = result.response;
      const transcript = response.text();

      console.log(`[Gemini Multimodal] Audio transcribed successfully`);

      return {
        transcript: transcript.trim(),
        language: language || 'auto-detected',
        confidence: 85, // Gemini doesn't provide confidence scores directly
      };
    } catch (error) {
      console.error('[Gemini Multimodal] Error transcribing audio:', error);
      throw new Error(`Failed to transcribe audio: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze audio content (sentiment, summary, etc.)
   */
  async analyzeAudio(audioData: string, mimeType: string, analysisType: 'summary' | 'sentiment' | 'keywords'): Promise<string> {
    try {
      const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, '');

      let prompt = '';
      switch (analysisType) {
        case 'summary':
          prompt = 'Provide a concise summary of this audio content.';
          break;
        case 'sentiment':
          prompt = 'Analyze the sentiment of this audio. Is it positive, negative, or neutral? Provide brief explanation.';
          break;
        case 'keywords':
          prompt = 'Extract the main keywords and topics discussed in this audio. List them.';
          break;
      }

      const result = await this.audioModel.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
        prompt,
      ]);

      return result.response.text();
    } catch (error) {
      console.error('[Gemini Multimodal] Error analyzing audio:', error);
      throw error;
    }
  }

  /**
   * Compare two faces for identity verification
   */
  async compareFaces(image1Data: string, image1Type: string, image2Data: string, image2Type: string): Promise<{
    match: boolean;
    confidence: number;
    details: string;
  }> {
    try {
      const base64Image1 = image1Data.replace(/^data:image\/\w+;base64,/, '');
      const base64Image2 = image2Data.replace(/^data:image\/\w+;base64,/, '');

      const prompt = `Compare these two images and determine if they show the same person.
Analyze facial features, structure, and distinctive characteristics.

Provide response in JSON format:
{
  "sameP person": true/false,
  "confidenceScore": 0-100,
  "explanation": "brief explanation of the comparison"
}`;

      const result = await this.visionModel.generateContent([
        {
          inlineData: {
            data: base64Image1,
            mimeType: image1Type,
          },
        },
        {
          inlineData: {
            data: base64Image2,
            mimeType: image2Type,
          },
        },
        prompt,
      ]);

      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          match: data.samePerson || false,
          confidence: data.confidenceScore || 0,
          details: data.explanation || response,
        };
      }

      return {
        match: false,
        confidence: 0,
        details: response,
      };
    } catch (error) {
      console.error('[Gemini Multimodal] Error comparing faces:', error);
      throw error;
    }
  }

  /**
   * Estimate confidence based on response quality
   */
  private estimateConfidence(response: string): number {
    // Simple heuristic: longer, more structured responses = higher confidence
    if (response.includes('{') && response.includes('}')) {
      return 85; // JSON response indicates good structure
    }
    if (response.length > 200) {
      return 75; // Detailed response
    }
    if (response.length > 100) {
      return 60; // Moderate response
    }
    return 40; // Short or unclear response
  }
}

// Singleton instance
export function getGeminiMultimodal(): GeminiMultimodalService {
  return GeminiMultimodalService.getInstance();
}

// Export convenience functions
export async function scanDocument(imageData: string, mimeType: string, documentType: 'id_card' | 'invoice' | 'receipt' | 'w2'): Promise<DocumentScanResult> {
  const service = getGeminiMultimodal();

  switch (documentType) {
    case 'id_card':
      return service.scanIDCard(imageData, mimeType);
    case 'invoice':
    case 'receipt':
      return service.scanInvoiceOrReceipt(imageData, mimeType);
    case 'w2':
      return service.scanW2Form(imageData, mimeType);
    default:
      throw new Error(`Unsupported document type: ${documentType}`);
  }
}

export async function transcribeAudio(audioData: string, mimeType: string, language?: string): Promise<AudioTranscriptionResult> {
  return getGeminiMultimodal().transcribeAudio(audioData, mimeType, language);
}

export async function verifyDocumentImage(imageData: string, mimeType: string): Promise<ImageVerificationResult> {
  return getGeminiMultimodal().verifyDocument(imageData, mimeType);
}
