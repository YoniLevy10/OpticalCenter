export const WA_COPY = {
  askStore:
    'שלום! לדיווח תקלה יש לשלוח את קוד החנות (למשל 172) או לסרוק את ה־QR / NFC בחנות.',
  storeNotFound: (code: string) =>
    `לא מצאתי חנות עם הקוד ${code}. בדקו את הקוד ונסו שוב (מספרים בלבד).`,
  askDescription: (storeName: string, storeCode: string) =>
    `זוהתה חנות: ${storeName} (${storeCode}).\nתארו בקצרה את התקלה. אפשר גם לצרף תמונה.`,
  needDescription: 'נא לתאר את התקלה בטקסט (או לצרף תמונה עם תיאור קצר).',
  confirmed: (displayNumber: string, storeName: string) =>
    `הדיווח התקבל ✓\nמספר תקלה: ${displayNumber}\nחנות: ${storeName}\nהצוות קיבל את הדיווח.`,
  mediaNotSaved:
    'הדיווח נקלט, אך לא הצלחנו לשמור את התמונה. אפשר לשלוח אותה שוב בהודעה נפרדת.',
  countryMissing:
    'לא זוהתה מדינה עבור מספר הוואטסאפ. פנו לתמיכה או בדקו את הגדרות הסביבה.',
  genericError: 'אירעה תקלה זמנית בקליטת הדיווח. נסו שוב בעוד רגע.',
} as const
