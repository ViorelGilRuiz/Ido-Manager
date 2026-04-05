import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { Role } from '../../shared/models';

@Component({
  selector: 'app-register-page',
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
          <p class="eyebrow">I Do Manager · Access setup</p>
          <h1>Crea tu acceso y define el nivel del workspace</h1>
          <p>
            Elige entre modo cliente o modo administrador. Puedes empezar como cliente y subir a plan
            completo cuando quieras operar plantillas, eventos y automatizaciones en serio.
          </p>
          <div class="role-note-grid">
            <article>
              <p>CLIENT</p>
              <strong>Acceso base + upgrade</strong>
            </article>
            <article>
              <p>ADMIN</p>
              <strong>Editor total de negocio</strong>
            </article>
          </div>
        </aside>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-card">
          <p class="form-kicker">Nuevo acceso</p>
          <h2>Crear cuenta</h2>
          <p class="form-copy">Configura tu cuenta con un flujo claro y entra en segundos al panel.</p>

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

          <label>
            Rol
            <select formControlName="role">
              <option value="CLIENT">CLIENT (base)</option>
              <option value="ADMIN">ADMIN (completo)</option>
            </select>
          </label>

          <label *ngIf="form.value.role === 'ADMIN'">
            Nombre del negocio
            <input formControlName="businessName" placeholder="Ej: Viorel Wedding Studio" type="text" />
          </label>

          <p class="plan-hint" *ngIf="form.value.role === 'CLIENT'">
            Plan cliente: vista de panel y experiencia guiada. Para editar templates/eventos necesitas upgrade.
          </p>
          <p class="plan-hint" *ngIf="form.value.role === 'ADMIN'">
            Plan administrador: acceso total a templates, eventos, documentos y automatizaciones.
          </p>

          <button type="submit" [disabled]="form.invalid || loading">
            {{ loading ? 'Creando...' : 'Crear cuenta' }}
          </button>
          <p class="error" *ngIf="error">{{ error }}</p>
          <p class="foot-note">
            Ya tienes cuenta?
            <a routerLink="/login">Entrar</a>
          </p>
        </form>
      </div>
    </section>
  `,
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  loading = false;
  error = '';
  showPassword = false;

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['CLIENT' as Role, Validators.required],
    businessName: [''],
  });

  constructor() {
    this.syncBusinessRules(this.form.controls.role.value ?? 'CLIENT');
    this.form.controls.role.valueChanges.subscribe((role) => {
      this.syncBusinessRules(role ?? 'CLIENT');
    });
  }

  onSubmit() {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const payload: { email: string; password: string; role: Role; businessName?: string } = {
      email: raw.email ?? '',
      password: raw.password ?? '',
      role: raw.role ?? 'ADMIN',
    };

    if (payload.role === 'ADMIN') {
      payload.businessName = raw.businessName?.trim() ?? '';
    }

    this.loading = true;
    this.error = '';
    this.authStore.register(payload).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/app/dashboard');
      },
      error: (err) => {
        this.loading = false;
        this.error = this.getErrorMessage(err, 'No se pudo crear la cuenta');
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

  private syncBusinessRules(role: Role) {
    const control = this.form.controls.businessName;
    if (role === 'ADMIN') {
      control.addValidators([Validators.required, Validators.minLength(2)]);
    } else {
      control.clearValidators();
      control.setValue('', { emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }
}
