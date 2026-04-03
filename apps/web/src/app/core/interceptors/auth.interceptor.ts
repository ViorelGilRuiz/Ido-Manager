import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { appConfig } from '../app-config';

const LOCAL_API_PREFIX = 'http://localhost:3000/api/v1';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authStore = inject(AuthStore);
  const token = authStore.accessToken;

  let requestUrl = req.url;
  if (requestUrl.startsWith(LOCAL_API_PREFIX)) {
    requestUrl = requestUrl.replace(LOCAL_API_PREFIX, appConfig.apiBaseUrl);
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
