import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-upgrade-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="upgrade-view">
      <header class="page-head">
        <div>
          <p class="kicker">Premium access</p>
          <h1>Desbloquea el modo Wedding Pro</h1>
          <p class="muted-copy">
            Con el plan administrador obtienes editor completo, biblioteca premium, IA y control total de eventos.
          </p>
        </div>
        <div class="head-stat">
          <span>Estado</span>
          <strong>Client</strong>
        </div>
      </header>

      <section class="upgrade-grid">
        <article class="panel-card">
          <h3>Tu plan actual</h3>
          <p class="muted-copy">Acceso cliente: seguimiento básico y vista del espacio de trabajo.</p>
          <ul class="panel-list">
            <li><strong>Dashboard</strong><p>Resumen general del negocio</p></li>
            <li><strong>Preview</strong><p>Lectura del avance de plantillas</p></li>
            <li><strong>Cuenta</strong><p>Sesión y perfil activo</p></li>
          </ul>
        </article>

        <article class="panel-card premium-offer">
          <h3>Plan Administrador</h3>
          <p class="muted-copy">Todo lo necesario para operar bodas de punta a punta.</p>
          <ul class="panel-list">
            <li><strong>Templates Studio</strong><p>Crear, editar, duplicar, borrar y versionar plantillas</p></li>
            <li><strong>Events Control</strong><p>Pipeline operativo y automatizaciones por estado</p></li>
            <li><strong>Document Editor</strong><p>Instancias vivas con autosave y vista premium</p></li>
            <li><strong>AI Assistant</strong><p>Autocompletado inteligente y recomendaciones de negocio</p></li>
          </ul>
          <div class="actions-row">
            <button type="button">Solicitar upgrade</button>
            <a class="ghost-btn action-link" routerLink="/app/dashboard">Volver al dashboard</a>
          </div>
        </article>
      </section>
    </section>
  `,
})
export class UpgradePageComponent {}
