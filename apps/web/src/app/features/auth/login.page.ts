import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="auth-shell auth-pro">
      <div class="auth-canvas" aria-hidden="true">
        <div class="grid-lines"></div>
        <div class="energy-orb orb-a"></div>
        <div class="energy-orb orb-b"></div>
        <div class="floating-block block-a"></div>
        <div class="floating-block block-b"></div>
        <div class="floating-block block-c"></div>
      </div>

      <div class="auth-layout">
        <aside class="auth-panel">
          <p class="eyebrow">I Do Manager · Wedding OS</p>
          <h1>Gestion premium para wedding planners que quieren crecer con orden</h1>
          <p>
            Centraliza operaciones, contenido y decisiones en una sola plataforma visual, con flujo
            profesional para equipo interno y cliente final.
          </p>
          <ul class="feature-list">
            <li>Editor visual con vista previa en vivo</li>
            <li>Autosave y asistencia inteligente para contenido</li>
            <li>Control por rol: admin completo y cliente premium</li>
          </ul>
          <div class="signal-row">
            <span>Checklist</span>
            <span>Timeline</span>
            <span>Budget</span>
            <span>Guest Flow</span>
          </div>
          <div class="role-note-grid">
            <article>
              <p>ADMIN</p>
              <strong>Suite completa</strong>
            </article>
            <article>
              <p>CLIENT</p>
              <strong>Vista + upgrade</strong>
            </article>
          </div>
        </aside>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-card">
          <p class="form-kicker">Workspace privado</p>
          <h2>Bienvenido de nuevo</h2>
          <p class="form-copy">
            Accede a tu panel, retoma tareas y publica avances con una experiencia rapida y elegante.
          </p>
          <label>
            Email
            <input formControlName="email" placeholder="tu@email.com" type="email" />
          </label>
          <label>
            Password
            <div class="password-wrap">
              <input
                formControlName="password"
                [type]="showPassword ? 'text' : 'password'"
                placeholder="********"
              />
              <button
                type="button"
                class="toggle-pass"
                (click)="showPassword = !showPassword"
                [attr.aria-label]="showPassword ? 'Ocultar password' : 'Mostrar password'"
              >
                {{ showPassword ? 'Ocultar' : 'Mostrar' }}
              </button>
            </div>
          </label>
          <button type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Entrando...' : 'Entrar' }}
          </button>
          <p class="error" *ngIf="error">{{ error }}</p>
          <p class="foot-note">
            Nuevo en la plataforma?
            <a routerLink="/register">Crear cuenta</a>
          </p>
        </form>
      </div>
    </section>
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  loading = false;
  error = '';
  showPassword = false;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    this.authStore.login(this.form.getRawValue() as { email: string; password: string }).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/app/dashboard');
      },
      error: (err) => {
        this.loading = false;
        this.error = this.getErrorMessage(err, 'No se pudo iniciar sesion');
      },
    });
  }

  private getErrorMessage(err: unknown, fallback: string) {
    const apiMessage = (err as { error?: { message?: string | string[] } })?.error?.message;
    if (Array.isArray(apiMessage)) {
      return apiMessage.join(', ');
    }
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }
    return fallback;
  }
}
