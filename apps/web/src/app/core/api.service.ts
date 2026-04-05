import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = this.getBaseUrl();
    console.log('🔌 API Service - Using URL:', this.baseUrl);
  }

  private getBaseUrl(): string {
    // 1. Variable global de ventana (puede ser inyectada por Netlify)
    if ((window as any).API_BASE_URL) {
      return (window as any).API_BASE_URL;
    }

    // 2. Variable en localStorage (puede cambiar en runtime)
    const storedUrl = localStorage.getItem('API_BASE_URL');
    if (storedUrl) {
      return storedUrl;
    }

    // 3. Usar configuración de Angular environments
    if (environment.apiBaseUrl) {
      return environment.apiBaseUrl;
    }

    // 4. Fallback: Detectar según el host
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api/v1';
    }

    // 5. Para producción en Netlify
    return 'https://ido-manager-api-production.up.railway.app/api/v1';
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

  setApiBaseUrl(url: string): void {
    localStorage.setItem('API_BASE_URL', url);
    (window as any).API_BASE_URL = url;
    this.baseUrl = url;
    console.log('✅ API URL changed to:', url);
    // Recargar para que los cambios tomen efecto
    window.location.reload();
  }

  getCurrentApiUrl(): string {
    return this.baseUrl;
  }
}



