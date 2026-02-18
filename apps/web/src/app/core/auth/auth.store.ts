import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { AuthResponse, CurrentUser, Role } from '../../shared/models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/api/v1/auth';

  private readonly accessTokenSubject = new BehaviorSubject<string | null>(null);
  private readonly userSubject = new BehaviorSubject<CurrentUser | null>(null);

  readonly user$ = this.userSubject.asObservable();
  readonly isAuthenticated$ = this.user$.pipe(map((user) => !!user));

  get accessToken(): string | null {
    return this.accessTokenSubject.value;
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
      .post<AuthResponse>(`${this.baseUrl}/register`, payload, {
        withCredentials: true,
      })
      .pipe(tap((session) => this.setSession(session)));
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/login`, payload, {
        withCredentials: true,
      })
      .pipe(tap((session) => this.setSession(session)));
  }

  refresh(): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/refresh`, {}, { withCredentials: true })
      .pipe(tap((session) => this.setSession(session)));
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${this.baseUrl}/logout`, {}, { withCredentials: true })
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
