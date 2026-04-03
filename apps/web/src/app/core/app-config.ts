export interface AppConfig {
  apiBaseUrl: string;
}

const defaultApiBase = 'https://ido-manager-api.up.railway.app/api/v1';

export const appConfig: AppConfig = {
  // Cambia esto por la URL de tu API desplegada (Railway/Fly/Render) cuando lo lances.
  // También puedes establecer una variable global en index.html:
  // <script>window.API_BASE_URL='https://mi-api-host';</script>
  apiBaseUrl: (window as any).API_BASE_URL || defaultApiBase,
};
