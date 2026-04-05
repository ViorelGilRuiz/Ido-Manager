import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { ApiService } from '../api.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const apiService = inject(ApiService);
  const token = authStore.accessToken;

  let requestUrl = req.url;
  // Remapear URLs localhost a la URL real de API
  const localApiPrefix = 'http://localhost:3000/api/v1';
  const prodApiPrefix = apiService.getBaseApiUrl();
  
  if (requestUrl.startsWith(localApiPrefix)) {
    requestUrl = requestUrl.replace(localApiPrefix, prodApiPrefix);
    req = req.clone({ url: requestUrl });
  }

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (Object.keys(headers).length > 0) {
    req = req.clone({ setHeaders: headers });
  }

  return next(req);
};
