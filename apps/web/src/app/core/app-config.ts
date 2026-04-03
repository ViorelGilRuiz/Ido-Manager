export interface AppConfig {
  apiBaseUrl: string;
}

export const appConfig: AppConfig = {
  // Cambia esto por la URL de tu API desplegada (Railway/Fly/Render) cuando lo lances.
  apiBaseUrl: 'http://localhost:3000/api/v1',
};
