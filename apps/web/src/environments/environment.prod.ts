// Configuración específica para Netlify
export const environment = {
  production: true,
  apiBaseUrl: (typeof window !== 'undefined' && (window as any).API_BASE_URL) 
    ? (window as any).API_BASE_URL
    : 'https://ido-manager-api.railway.app/api/v1',
};
