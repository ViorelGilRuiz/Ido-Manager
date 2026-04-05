import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = this.getBaseUrl();

  private getBaseUrl(): string {
    // 1. Primero intentar variable global window.API_BASE_URL (puede ser inyectada por Netlify)
    if ((window as any).API_BASE_URL) {
      console.log('Using API_BASE_URL from window:', (window as any).API_BASE_URL);
      return (window as any).API_BASE_URL;
    }

    // 2. Usar la configuración de Angular environments
    if (environment.apiBaseUrl) {
      console.log('Using API_BASE_URL from environment:', environment.apiBaseUrl);
      return environment.apiBaseUrl;
    }

    // 3. Fallback para producción
    if (!environment.production) {
      console.log('Running in development mode');
      return 'http://localhost:3000/api/v1';
    }

    console.log('Using default Railway API URL');
    return 'https://ido-manager-api.railway.app/api/v1';
  }

  getAuthUrl(endpoint: string): string {
    return `${this.baseUrl}/auth${endpoint}`;
  }

  getTemplatesUrl(endpoint: string = ''): string {
    return `${this.baseUrl}/templates${endpoint}`;
  }

  getEventsUrl(endpoint: string = ''): string {
    return `${this.baseUrl}/events${endpoint}`;
  }

  getDocumentsUrl(endpoint: string = ''): string {
    return `${this.baseUrl}/documents${endpoint}`;
  }

  getBaseApiUrl(): string {
    return this.baseUrl;
  }

  /**
   * Permite cambiar la URL de la API en tiempo de ejecución (útil para testing)
   */
  setApiBaseUrl(url: string): void {
    (window as any).API_BASE_URL = url;
    localStorage.setItem('API_BASE_URL', url);
    location.reload();
  }

  getCurrentApiUrl(): string {
    console.log('🔌 Current API URL:', this.baseUrl);
    return this.baseUrl;
  }
}


