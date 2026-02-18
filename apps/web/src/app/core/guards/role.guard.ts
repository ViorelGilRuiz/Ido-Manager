import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthStore } from '../auth/auth.store';
import { Role } from '../../shared/models';

export const roleGuard: CanActivateFn = (route) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const expectedRoles = (route.data?.['roles'] as Role[] | undefined) ?? [];

  return authStore.user$.pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/login']);
      }
      if (!expectedRoles.length || expectedRoles.includes(user.role)) {
        return true;
      }
      return router.createUrlTree(['/app/dashboard']);
    }),
  );
};
