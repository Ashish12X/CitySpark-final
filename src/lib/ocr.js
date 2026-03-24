import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// For browser environment, we configure the PDF.js worker
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const extractTextFromImageOrPdf = async (file) => {
  if (file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    // Scale up for better OCR resolution
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas'); // requires DOM
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    
    // Convert canvas to data URL for Tesseract
    const dataUrl = canvas.toDataURL('image/png');
    const result = await Tesseract.recognize(dataUrl, 'eng');
    return result.data.text;
  } else {
    // It's a regular image
    const result = await Tesseract.recognize(file, 'eng');
    return result.data.text;
  }
};

export const parseAadhaar = async (file) => {
  try {
    const text = await extractTextFromImageOrPdf(file);
    console.log("OCR Result:", text);
    
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
    const fullText = text.replace(/\n/g, ' ');
    
    let name = '';
    let address = '';
    let pin = '';
    let phone = '';

    // 1. PIN Code (6 digits in India)
    const pinMatch = text.match(/\b\d{6}\b/);
    if (pinMatch) pin = pinMatch[0];

    // 2. Phone Number (10 digits starting with 6-9)
    const phoneMatch = text.match(/\b[6-9]\d{9}\b/);
    if (phoneMatch) phone = phoneMatch[0];

    // 3. Address heuristics (Back side of Aadhaar)
    // Matches "Address:", "C/O", "S/O", etc., and captures everything up to the 6 digit pincode.
    const addrRegex = /(?:Address|Addres|Add|C\/O|S\/O|D\/O|W\/O)[\s:,-]*([\s\S]*?\b\d{6}\b)/i;
    const addrMatch = fullText.match(addrRegex);
    
    if (addrMatch) {
       address = addrMatch[1].trim();
    } else {
       // Fallback: finding the pin line
       const pinIndex = lines.findIndex(l => /\b\d{6}\b/.test(l));
       if (pinIndex >= 1) {
          address = lines.slice(Math.max(0, pinIndex - 2), pinIndex + 1).join(', ');
       }
    }

    // 4. Name heuristics (Front side)
    const dobIndex = lines.findIndex(l => l.toLowerCase().includes('dob') || l.toLowerCase().includes('year') || l.toLowerCase().includes('yob'));
    if (dobIndex > 0) {
      name = lines[dobIndex - 1];
    } else {
      for (let i = 0; i < Math.min(6, lines.length); i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        if (!lower.includes('govt') && !lower.includes('india') && !lower.includes('enrollment') && /^[A-Z][a-zA-Z\s.-]{3,}$/.test(line)) {
          name = line;
          break;
        }
      }
    }
    
    if (name) name = name.replace(/[^a-zA-Z\s.-]/g, '').trim();

    return {
      name: name || '',
      zip: pin || '',
      address: address || '',
      phone: phone || ''
    };

  } catch (e) {
    console.error("OCR Error: ", e);
    throw new Error(e.message || "Failed to parse document");
  }
};
