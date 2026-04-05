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
          <p class="brand-copy">Studio visual para plantillas, eventos y documentos.</p>
        </div>

        <nav class="nav-stack" *ngIf="authStore.user$ | async as user">
          <a
            routerLink="/app/dashboard"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="nav-link"
          >
            <span class="nav-icon">DB</span>
            <span>Dashboard</span>
          </a>
          <a
            *ngIf="user.role === 'ADMIN'"
            routerLink="/app/templates"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="nav-link"
          >
            <span class="nav-icon">TP</span>
            <span>Templates</span>
          </a>
          <a
            *ngIf="user.role === 'ADMIN'"
            routerLink="/app/free-editor"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="nav-link"
          >
            <span class="nav-icon">ED</span>
            <span>Editor Libre</span>
          </a>
          <a *ngIf="user.role === 'ADMIN'" routerLink="/app/events" routerLinkActive="is-active" class="nav-link">
            <span class="nav-icon">EV</span>
            <span>Events</span>
          </a>
          <a *ngIf="user.role === 'CLIENT'" routerLink="/app/upgrade" routerLinkActive="is-active" class="nav-link nav-link-upgrade">
            <span class="nav-icon">UP</span>
            <span>Upgrade</span>
          </a>
        </nav>

        <article class="upgrade-teaser" *ngIf="(authStore.user$ | async)?.role === 'CLIENT'">
          <p class="kicker">Plan cliente</p>
          <h3>Desbloquea todas las herramientas</h3>
          <p>Activa plan administrador para editar templates, eventos y documentos.</p>
          <a routerLink="/app/upgrade" class="ghost-btn action-link">Ver planes</a>
        </article>
      </aside>
      <main class="app-main">
        <header class="app-topbar">
          <div class="user-chip" *ngIf="authStore.user$ | async as user">
            <p class="chip-label">Sesion activa</p>
            <strong>{{ user.email }}</strong>
            <span class="chip-subtext">Wedding template workspace</span>
            <span class="role-badge" [class.is-admin]="user.role === 'ADMIN'" [class.is-client]="user.role === 'CLIENT'">
              {{ user.role === 'ADMIN' ? 'Admin access' : 'Client access' }}
            </span>
          </div>
          <div class="topbar-actions">
            <a *ngIf="(authStore.user$ | async)?.role === 'CLIENT'" routerLink="/app/upgrade" class="ghost-btn action-link">Upgrade</a>
            <button class="logout-btn" (click)="logout()">Logout</button>
          </div>
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
