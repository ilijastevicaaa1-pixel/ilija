// Utility functions for account management
export const validateIBAN = (iban) => {
  // Remove spaces and convert to uppercase
  const cleanIBAN = iban.replace(/\s+/g, '').toUpperCase();
  
  // Check if IBAN is valid length (country dependent, but we'll do basic check)
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,}[0-9]{7}([A-Z0-9]?){0,16}$/.test(cleanIBAN)) {
    return false;
  }
  
  // Move first 4 chars to the end
  const rearranged = cleanIBAN.substring(4) + cleanIBAN.substring(0, 4);
  
  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  const numericString = rearranged.replace(/[A-Z]/g, char => 
    char.charCodeAt(0) - 55
  );
  
  // Calculate mod 98
  let remainder = 0;
  for (let i = 0; i < numericString.length; i++) {
    remainder = (remainder * 10 + parseInt(numericString.charAt(i))) % 98;
  }
  
  return remainder === 1;
};

export const validateBIC = (bic) => {
  // BIC/SWIFT code: 8 or 11 characters
  // First 4: bank code (letters only)
  // Next 2: country code (letters only)
  // Next 2: location code (letters/digits)
  // Last 3: branch code (optional, letters/digits)
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic.toUpperCase());
};

export const validateAccountNumber = (accountNumber) => {
  // Basic validation: at least 3 characters, alphanumeric and spaces allowed
  return /^[A-Za-z0-9\s]{3,}$/.test(accountNumber.trim());
};

export const validateCurrency = (currency) => {
  // Common currencies
  const validCurrencies = ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'CZK'];
  return validCurrencies.includes(currency);
};

export const createAccountObject = (formData) => ({
  id: Date.now(),
  name: formData.name.trim(),
  iban: formData.iban.replace(/\s+/g, '').toUpperCase(),
  bic: formData.bic.toUpperCase().replace(/\s+/g, ''),
  accountNumber: formData.accountNumber.trim(),
  currency: formData.currency,
  createdAt: new Date().toISOString()
});

export const filterTransactionsByAccount = (transactions, accountName) => {
  if (!accountName) return [];
  return transactions.filter(t => t.account === accountName);
};