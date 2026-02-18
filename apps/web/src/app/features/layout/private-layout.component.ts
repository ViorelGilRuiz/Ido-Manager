import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-private-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <aside class="app-sidebar">
        <div class="brand-block">
          <p class="brand-kicker">Workspace</p>
          <h2>I Do Manager</h2>
          <p class="brand-copy">Planificacion visual para plantillas y eventos.</p>
        </div>

        <nav class="nav-stack">
          <a
            routerLink="/app/dashboard"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="nav-link"
          >
            <span class="nav-icon">▦</span>
            <span>Dashboard</span>
          </a>
          <a routerLink="/app/templates" routerLinkActive="is-active" class="nav-link">
            <span class="nav-icon">◫</span>
            <span>Templates</span>
          </a>
          <a routerLink="/app/events" routerLinkActive="is-active" class="nav-link">
            <span class="nav-icon">◷</span>
            <span>Events</span>
          </a>
        </nav>
      </aside>
      <main class="app-main">
        <header class="app-topbar">
          <div class="user-chip">
            <p class="chip-label">Sesion activa</p>
            <strong>{{ (authStore.user$ | async)?.email }}</strong>
          </div>
          <button class="logout-btn" (click)="logout()">Logout</button>
        </header>
        <section class="app-content"><router-outlet /></section>
      </main>
    </div>
  `,
})
export class PrivateLayoutComponent {
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  logout() {
    this.authStore.logout().subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: () => this.router.navigateByUrl('/login'),
    });
  }
}
