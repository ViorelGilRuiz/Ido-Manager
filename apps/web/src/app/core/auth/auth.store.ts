import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { AuthResponse, CurrentUser, Role } from '../../shared/models';
import { ApiService } from '../api.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);
  private readonly apiService = inject(ApiService);

  private readonly accessTokenSubject = new BehaviorSubject<string | null>(null);
  private readonly userSubject = new BehaviorSubject<CurrentUser | null>(null);

  readonly user$ = this.userSubject.asObservable();
  readonly isAuthenticated$ = this.user$.pipe(map((user) => !!user));
  readonly isAdmin$ = this.user$.pipe(map((user) => user?.role === 'ADMIN'));
  readonly isClient$ = this.user$.pipe(map((user) => user?.role === 'CLIENT'));

  get accessToken(): string | null {
    return this.accessTokenSubject.value;
  }

  get user(): CurrentUser | null {
    return this.userSubject.value;
  }

  get isAdmin() {
    return this.userSubject.value?.role === 'ADMIN';
  }

  bootstrap(): Observable<boolean> {
    const cachedUser = localStorage.getItem('ido_user');
    if (cachedUser) {
      this.userSubject.next(JSON.parse(cachedUser) as CurrentUser);
    }

    return this.refresh().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  register(payload: {
    email: string;
    password: string;
    role: Role;
    businessName?: string;
  }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(this.apiService.getAuthUrl('/register'), payload, {
        withCredentials: true,
      })
      .pipe(tap((session) => this.setSession(session)));
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(this.apiService.getAuthUrl('/login'), payload, {
        withCredentials: true,
      })
      .pipe(tap((session) => this.setSession(session)));
  }

  refresh(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(this.apiService.getAuthUrl('/refresh'), {}, { withCredentials: true })
      .pipe(tap((session) => this.setSession(session)));
  }

  logout(): Observable<unknown> {
    return this.http
      .post(this.apiService.getAuthUrl('/logout'), {}, { withCredentials: true })
      .pipe(tap(() => this.clearSession()));
  }

  private setSession(session: AuthResponse) {
    this.accessTokenSubject.next(session.accessToken);
    this.userSubject.next(session.user);
    localStorage.setItem('ido_user', JSON.stringify(session.user));
  }

  clearSession() {
    this.accessTokenSubject.next(null);
    this.userSubject.next(null);
    localStorage.removeItem('ido_user');
  }
}
