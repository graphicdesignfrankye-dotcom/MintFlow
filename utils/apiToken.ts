// Codice personale per i pagamenti automatici: lo genera il browser, il database vede solo la sua impronta sha256.
// Il codice in chiaro si mostra una volta sola, subito dopo la creazione.

const toHex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');

export const sha256Hex = async (text: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest));
};

// 32 byte casuali -> 43 caratteri (base64 sicuro per gli indirizzi) con prefisso riconoscibile
export const generateApiToken = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `mf_${b64}`;
};
