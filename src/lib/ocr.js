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
    
    let name = '';
    let address = '';
    let pin = '';

    // 1. PIN Code (6 digits in India)
    const pinMatch = text.match(/\b\d{6}\b/);
    if (pinMatch) pin = pinMatch[0];

    // 2. Address heuristics
    const addressKeywords = ['address', 'add:', 'add', 'c/o', 's/o', 'd/o', 'w/o'];
    for (let i = 0; i < lines.length; i++) {
      const lowerLine = lines[i].toLowerCase();
      // Look for a line containing address keywords
      if (addressKeywords.some(kw => lowerLine.includes(kw) || lowerLine.startsWith(kw))) {
        let addrLines = [];
        for (let j = i; j < Math.min(i + 4, lines.length); j++) {
           addrLines.push(lines[j]);
           // Stop if the line ends with a numeric PIN
           if (/\b\d{6}\b/.test(lines[j])) break; 
        }
        address = addrLines.join(', ').replace(/^(address|add)[\s:,-]*/i, '').trim();
        break;
      }
    }
    
    if (!address && pin) {
       // fallback: find pin line and snag surrounding lines for address
       const pinIndex = lines.findIndex(l => /\b\d{6}\b/.test(l));
       if (pinIndex >= 1) {
          address = lines.slice(Math.max(0, pinIndex - 2), pinIndex + 1).join(', ');
       }
    }

    // 3. Name heuristics
    const dobIndex = lines.findIndex(l => l.toLowerCase().includes('dob') || l.toLowerCase().includes('year') || l.toLowerCase().includes('yob'));
    if (dobIndex > 0) {
      // Name is strictly above the DOB block in new Aadhaar layout
      name = lines[dobIndex - 1];
    } else {
      // Heuristic scan for alphabetic name at the top
      for (let i = 0; i < Math.min(6, lines.length); i++) {
        const line = lines[i];
        const lower = line.toLowerCase();
        if (!lower.includes('govt') && !lower.includes('india') && !lower.includes('enrollment') && /^[A-Z][a-zA-Z\s.-]{3,}$/.test(line)) {
          name = line;
          break;
        }
      }
    }
    
    // Clean up name artifacts
    if (name) name = name.replace(/[^a-zA-Z\s.-]/g, '').trim();

    return {
      name: name || lines[0] || 'Unknown Name',
      zip: pin || '000000',
      address: address || text.replace(/\n/g, ' ').substring(0, 150) || 'Unknown Address'
    };

  } catch (e) {
    console.error("OCR Error: ", e);
    throw new Error(e.message || "Failed to parse document");
  }
};
