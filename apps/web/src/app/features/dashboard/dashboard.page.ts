import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { EventModel, EventType, TemplateModel, TemplateType } from '../../shared/models';
import { openTemplatePdfPreview } from '../../shared/utils/pdf-export';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="dashboard-view">
      <header class="page-head">
        <div>
          <p class="kicker">Business overview</p>
          <h1>Dashboard premium</h1>
          <p class="muted-copy">Control operativo del negocio: pipeline de eventos y salud de plantillas.</p>
        </div>
        <div class="head-stat">
          <span>Rendimiento</span>
          <strong>{{ pipelineScore }}/100</strong>
        </div>
      </header>
      <div class="actions-row">
        <button type="button" class="ghost-btn" (click)="exportDashboardPdf()">Exportar dashboard PDF</button>
        <a *ngIf="isAdmin" routerLink="/app/free-editor" class="ghost-btn action-link">Abrir editor libre</a>
      </div>

      <section class="panel-card client-plan-card" *ngIf="!isAdmin">
        <div class="panel-head">
          <h3>Modo cliente activo</h3>
          <a routerLink="/app/upgrade">Ver upgrade</a>
        </div>
        <p class="muted-copy">
          Actualmente tienes acceso limitado. Sube a administrador para crear, editar y automatizar templates y eventos.
        </p>
        <div class="actions-row">
          <a routerLink="/app/upgrade" class="ghost-btn action-link">Desbloquear herramientas premium</a>
        </div>
      </section>

      <section class="insight-grid dashboard-kpis">
        <article class="insight-card">
          <p>Templates</p>
          <strong>{{ templates.length }}</strong>
        </article>
        <article class="insight-card">
          <p>Events</p>
          <strong>{{ events.length }}</strong>
        </article>
        <article class="insight-card">
          <p>Activos</p>
          <strong>{{ activeEvents }}</strong>
        </article>
        <article class="insight-card">
          <p>Borradores</p>
          <strong>{{ draftEvents }}</strong>
        </article>
        <article class="insight-card">
          <p>Promedio campos/template</p>
          <strong>{{ avgTemplateFields }}</strong>
        </article>
        <article class="insight-card">
          <p>Cobertura tipos</p>
          <strong>{{ templateCoverageLabel }}</strong>
        </article>
        <article class="insight-card">
          <p>Client-ready</p>
          <strong>{{ clientReadyTemplates }}</strong>
        </article>
        <article class="insight-card">
          <p>Prox. 14 dias</p>
          <strong>{{ upcomingEvents.length }}</strong>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel-card">
          <header class="panel-head">
            <h3>Visibilidad del trabajo</h3>
            <span class="muted-copy">{{ dashboardVisibilityLabel }}</span>
          </header>
          <div class="insight-grid">
            <article class="insight-card">
              <p>Salud biblioteca</p>
              <strong>{{ libraryHealthScore }}/100</strong>
            </article>
            <article class="insight-card">
              <p>Foco semanal</p>
              <strong>{{ weeklyFocusScore }}/100</strong>
            </article>
            <article class="insight-card">
              <p>Trabajo visible</p>
              <strong>{{ visibleWorkItems }}</strong>
            </article>
          </div>
          <ul class="panel-list" *ngIf="dashboardHighlights.length; else noHighlights">
            <li *ngFor="let item of dashboardHighlights">
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </li>
          </ul>
          <ng-template #noHighlights>
            <p class="muted-copy">Todavia no hay suficiente actividad para generar highlights.</p>
          </ng-template>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="refreshDashboardData()">Actualizar datos</button>
            <button type="button" class="ghost-btn" (click)="runAiFocusMode()">IA Focus Mode</button>
          </div>
        </article>

        <article class="panel-card">
          <header class="panel-head">
            <h3>Progreso por frentes</h3>
            <span class="muted-copy">Templates · Eventos · Cliente</span>
          </header>
          <div class="coverage-list">
            <div class="coverage-row">
              <span>Biblioteca templates</span>
              <strong>{{ templateCoveragePercent }}%</strong>
            </div>
            <div class="coverage-row">
              <span>Pipeline activo</span>
              <strong>{{ activationRate }}%</strong>
            </div>
            <div class="coverage-row">
              <span>Experiencia cliente-ready</span>
              <strong>{{ clientReadyRate }}%</strong>
            </div>
            <div class="coverage-row">
              <span>Agenda con fecha</span>
              <strong>{{ datedEventsRate }}%</strong>
            </div>
          </div>
          <p class="muted-copy">{{ aiDashboardNarrative }}</p>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel-card">
          <header class="panel-head">
            <h3>Centro de decisiones</h3>
            <span class="muted-copy">Priorizacion IA para admin</span>
          </header>
          <div class="insight-grid">
            <article class="insight-card">
              <p>Entrega docs</p>
              <strong>{{ documentDeliveryScore }}/100</strong>
            </article>
            <article class="insight-card">
              <p>Backlog accionable</p>
              <strong>{{ nextBestActions.length }}</strong>
            </article>
            <article class="insight-card">
              <p>Modo trabajo</p>
              <strong>{{ aiAdminModeLabel }}</strong>
            </article>
          </div>
          <ul class="panel-list" *ngIf="nextBestActions.length; else noDecisionActions">
            <li *ngFor="let item of nextBestActions">
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </li>
          </ul>
          <ng-template #noDecisionActions>
            <p class="muted-copy">Sin acciones criticas. Puedes dedicar el sprint a pulir experiencia premium.</p>
          </ng-template>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="runAiDocumentSprint()">IA Document Sprint</button>
            <button type="button" class="ghost-btn" (click)="runAiPremiumTemplatePass()">IA Premium Templates</button>
            <button type="button" class="ghost-btn" (click)="runAiWeeklyReset()">IA Weekly Reset</button>
          </div>
        </article>

        <article class="panel-card">
          <header class="panel-head">
            <h3>Radar de entrega documental</h3>
            <span class="muted-copy">Lectura rapida de capacidad de entrega</span>
          </header>
          <div class="coverage-list">
            <div class="coverage-row">
              <span>Eventos activos con fecha</span>
              <strong>{{ documentReadyEventsCount }}/{{ activeEvents || 0 }}</strong>
            </div>
            <div class="coverage-row">
              <span>Templates premium-ready</span>
              <strong>{{ premiumTemplateCoveragePercent }}%</strong>
            </div>
            <div class="coverage-row">
              <span>Riesgo de entrega</span>
              <strong>{{ deliveryRiskLabel }}</strong>
            </div>
            <div class="coverage-row">
              <span>Capacidad semanal visible</span>
              <strong>{{ visibleWorkItems }}</strong>
            </div>
          </div>
          <p class="muted-copy">{{ aiDeliveryNarrative }}</p>
        </article>
      </section>

      <section class="dashboard-grid dashboard-premium-grid">
        <article class="panel-card">
          <header class="panel-head">
            <h3>Pipeline eventos</h3>
            <a routerLink="/app/events">Gestionar</a>
          </header>
          <div class="status-pills">
            <span class="status-pill is-draft">Draft: {{ draftEvents }}</span>
            <span class="status-pill is-active">Active: {{ activeEvents }}</span>
            <span class="status-pill is-archived">Archived: {{ archivedEvents }}</span>
          </div>
          <p class="muted-copy">Tasa de activacion: {{ activationRate }}%</p>
          <div class="actions-row">
            <a routerLink="/app/events" class="ghost-btn action-link">Ir a events</a>
          </div>
        </article>

        <article class="panel-card">
          <header class="panel-head">
            <h3>Ultimos templates</h3>
            <a routerLink="/app/templates">Ver todos</a>
          </header>
          <ul class="panel-list" *ngIf="templates.length; else noTemplates">
            <li *ngFor="let item of templates.slice(0, 5)">
              <div>
                <strong>{{ item.name }}</strong>
                <p>{{ toLabel(item.type) }} · {{ countFields(item.schemaJson) }} campos</p>
              </div>
            </li>
          </ul>
          <ng-template #noTemplates>
            <p class="muted-copy">Sin templates aun.</p>
          </ng-template>
        </article>

        <article class="panel-card">
          <header class="panel-head">
            <h3>Cobertura de biblioteca</h3>
            <a routerLink="/app/templates">Optimizar</a>
          </header>
          <div class="coverage-list">
            <div class="coverage-row" *ngFor="let type of templateTypes">
              <span>{{ toLabel(type) }}</span>
              <strong>{{ templatesByType(type) }}</strong>
            </div>
          </div>
        </article>

        <article class="panel-card">
          <header class="panel-head">
            <h3>Ultimos eventos</h3>
            <a routerLink="/app/events">Ver todos</a>
          </header>
          <ul class="panel-list" *ngIf="events.length; else noEvents">
            <li *ngFor="let event of events.slice(0, 5)">
              <div>
                <a [routerLink]="['/app/events', event.id]" class="event-link">{{ event.title }}</a>
                <p>{{ toLabel(event.type) }} · {{ event.status }}</p>
              </div>
            </li>
          </ul>
          <ng-template #noEvents>
            <p class="muted-copy">Sin eventos aun.</p>
          </ng-template>
        </article>

        <article class="panel-card">
          <header class="panel-head">
            <h3>Siguiente foco</h3>
            <a routerLink="/app/templates">Ajustar templates</a>
          </header>
          <ul class="panel-list" *ngIf="focusEvents.length; else noFocus">
            <li *ngFor="let event of focusEvents">
              <div>
                <strong>{{ event.title }}</strong>
                <p>{{ toLabel(event.type) }} · {{ event.status }}</p>
              </div>
            </li>
          </ul>
          <ng-template #noFocus>
            <p class="muted-copy">No hay eventos prioritarios ahora.</p>
          </ng-template>
        </article>

        <article class="panel-card">
          <header class="panel-head">
            <h3>Acciones rapidas</h3>
            <a routerLink="/app/templates">Gestionar</a>
          </header>
          <p class="muted-copy">Automatiza tareas frecuentes para arrancar mas rapido.</p>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="createMissingCoreTemplates()" [disabled]="!missingTemplateTypes.length || creatingCore">
              {{ creatingCore ? 'Generando...' : 'Generar core templates' }}
            </button>
            <button type="button" class="ghost-btn" (click)="createQuickEvent('WEDDING')">Crear evento boda</button>
            <button type="button" class="ghost-btn" (click)="archiveOldDrafts()" [disabled]="!oldDraftEvents.length">Archivar drafts antiguos</button>
          </div>
          <p class="muted-copy" *ngIf="missingTemplateTypes.length">
            Tipos recomendados faltantes: {{ missingTemplateTypes.join(', ') }}
          </p>
        </article>

        <article class="panel-card" *ngIf="isAdmin">
          <header class="panel-head">
            <h3>Editor libre visual</h3>
            <a routerLink="/app/free-editor">Abrir</a>
          </header>
          <p class="muted-copy">
            Lienzo manual tipo studio para editar todo libremente: mover bloques, capas, texto, imagenes, estilos, grid, reglas y exporte PDF.
          </p>
          <div class="actions-row">
            <a routerLink="/app/free-editor" class="ghost-btn action-link">Entrar al editor libre</a>
            <a routerLink="/app/templates/new" class="ghost-btn action-link">Nuevo template base</a>
          </div>
        </article>

        <article class="panel-card ai-copilot-card">
          <header class="panel-head">
            <h3>AI Copilot del dia</h3>
            <span class="muted-copy">Asistente operativo para wedding planner</span>
          </header>
          <div class="insight-grid">
            <article class="insight-card">
              <p>Carga operativa</p>
              <strong>{{ aiWorkloadLabel }}</strong>
            </article>
            <article class="insight-card">
              <p>Riesgos detectados</p>
              <strong>{{ aiRisks.length }}</strong>
            </article>
            <article class="insight-card">
              <p>Impacto negocio</p>
              <strong>{{ aiImpactScore }}/100</strong>
            </article>
          </div>
          <ul class="panel-list" *ngIf="aiRisks.length; else noAiRisk">
            <li *ngFor="let risk of aiRisks">
              <strong>{{ risk.title }}</strong>
              <p>{{ risk.detail }}</p>
            </li>
          </ul>
          <ng-template #noAiRisk>
            <p class="muted-copy">Sin riesgos criticos. Flujo estable.</p>
          </ng-template>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="runAiAutopilot()">Autopilot planner</button>
            <button type="button" class="ghost-btn" (click)="createQuickEvent('WEDDING')">Crear evento recomendado</button>
            <button type="button" class="ghost-btn" (click)="createMissingCoreTemplates()" [disabled]="creatingCore || !missingTemplateTypes.length">
              Completar biblioteca IA
            </button>
            <button type="button" class="ghost-btn" (click)="runAiGrowthSprint()">IA Growth Sprint</button>
            <button type="button" class="ghost-btn" (click)="generateAiWeeklyPlan()">IA Weekly Plan</button>
          </div>
          <p class="muted-copy" *ngIf="aiLastAction">{{ aiLastAction }}</p>
        </article>

        <article class="panel-card">
          <header class="panel-head">
            <h3>Agenda inteligente</h3>
            <a routerLink="/app/events">Abrir agenda</a>
          </header>
          <ul class="panel-list" *ngIf="upcomingEvents.length; else noUpcoming">
            <li *ngFor="let event of upcomingEvents">
              <strong>{{ event.title }}</strong>
              <p>{{ event.date | date: 'dd/MM/yyyy' }} · {{ event.status }}</p>
            </li>
          </ul>
          <ng-template #noUpcoming>
            <p class="muted-copy">No hay eventos con fecha cercana en 14 dias.</p>
          </ng-template>
        </article>

        <article class="panel-card">
          <header class="panel-head">
            <h3>Recomendaciones IA</h3>
            <span class="muted-copy">Siguiente mejor accion</span>
          </header>
          <ul class="panel-list" *ngIf="operationalRecommendations.length; else noRecommendations">
            <li *ngFor="let rec of operationalRecommendations">
              <strong>{{ rec.title }}</strong>
              <p>{{ rec.detail }}</p>
            </li>
          </ul>
          <ng-template #noRecommendations>
            <p class="muted-copy">Todo estable. Mantener seguimiento semanal.</p>
          </ng-template>
        </article>
      </section>
    </section>
  `,
})
export class DashboardPageComponent {
  private readonly http = inject(HttpClient);
  readonly authStore = inject(AuthStore);

  templates: TemplateModel[] = [];
  events: EventModel[] = [];
  creatingCore = false;
  aiLastAction = '';
  readonly templateTypes: TemplateType[] = ['CHECKLIST', 'TIMELINE', 'BUDGET', 'GUEST_LIST', 'VENDOR_LIST'];

  get isAdmin() {
    return this.authStore.isAdmin;
  }

  get activeEvents() {
    return this.events.filter((event) => event.status === 'ACTIVE').length;
  }

  get draftEvents() {
    return this.events.filter((event) => event.status === 'DRAFT').length;
  }

  get archivedEvents() {
    return this.events.filter((event) => event.status === 'ARCHIVED').length;
  }

  get activationRate() {
    if (!this.events.length) return 0;
    return Math.round((this.activeEvents / this.events.length) * 100);
  }

  get avgTemplateFields() {
    if (!this.templates.length) return 0;
    const total = this.templates.reduce((acc, template) => acc + this.countFields(template.schemaJson), 0);
    return Math.round(total / this.templates.length);
  }

  get templateCoverageLabel() {
    const covered = this.templateTypes.filter((type) => this.templatesByType(type) > 0).length;
    return `${covered}/${this.templateTypes.length}`;
  }

  get clientReadyTemplates() {
    return this.templates.filter((template) => {
      const fields = this.countFields(template.schemaJson);
      const score = this.templateQualityScore(template.schemaJson);
      return fields >= 8 && score >= 68;
    }).length;
  }

  get pipelineScore() {
    const templateWeight = this.templates.length ? Math.min(40, this.avgTemplateFields * 3) : 0;
    const activationWeight = this.activationRate * 0.45;
    const coverageWeight =
      (this.templateTypes.filter((type) => this.templatesByType(type) > 0).length / this.templateTypes.length) * 35;
    return Math.max(10, Math.min(100, Math.round(templateWeight + activationWeight + coverageWeight)));
  }

  get templateCoveragePercent() {
    return Math.round(
      (this.templateTypes.filter((type) => this.templatesByType(type) > 0).length / this.templateTypes.length) * 100,
    );
  }

  get clientReadyRate() {
    if (!this.templates.length) return 0;
    return Math.round((this.clientReadyTemplates / this.templates.length) * 100);
  }

  get datedEventsRate() {
    if (!this.events.length) return 0;
    const dated = this.events.filter((event) => !!event.date).length;
    return Math.round((dated / this.events.length) * 100);
  }

  get libraryHealthScore() {
    return Math.max(15, Math.min(100, Math.round(this.avgTemplateFields * 4 + this.templateCoveragePercent * 0.5)));
  }

  get weeklyFocusScore() {
    const score =
      this.activationRate * 0.45 +
      this.datedEventsRate * 0.25 +
      Math.min(20, this.upcomingEvents.length * 4) +
      Math.min(15, this.clientReadyTemplates * 3);
    return Math.max(10, Math.min(100, Math.round(score)));
  }

  get visibleWorkItems() {
    return this.focusEvents.length + this.upcomingEvents.length + this.operationalRecommendations.length;
  }

  get dashboardVisibilityLabel() {
    if (this.weeklyFocusScore >= 75) return 'Alta visibilidad';
    if (this.weeklyFocusScore >= 50) return 'Visibilidad media';
    return 'Mejorable';
  }

  get dashboardHighlights() {
    const highlights: Array<{ title: string; detail: string }> = [];
    if (this.upcomingEvents.length) {
      highlights.push({
        title: 'Ventana de ejecucion activa',
        detail: `${this.upcomingEvents.length} evento(s) en los proximos 14 dias con seguimiento visible.`,
      });
    }
    if (this.clientReadyRate >= 40) {
      highlights.push({
        title: 'Biblioteca usable con cliente',
        detail: `${this.clientReadyRate}% de templates están listos para flujo cliente.`,
      });
    }
    if (this.missingTemplateTypes.length) {
      highlights.push({
        title: 'Oportunidad inmediata de mejora',
        detail: `Completa tipos core faltantes: ${this.missingTemplateTypes.join(', ')}.`,
      });
    }
    if (!highlights.length && (this.templates.length || this.events.length)) {
      highlights.push({
        title: 'Base operativa creada',
        detail: 'Empieza a activar IA para completar biblioteca y mejorar visibilidad semanal.',
      });
    }
    return highlights.slice(0, 4);
  }

  get aiDashboardNarrative() {
    if (!this.events.length && !this.templates.length) {
      return 'IA: empieza creando templates core y un primer evento para activar el dashboard operativo.';
    }
    if (this.pipelineScore >= 75) {
      return 'IA: buen equilibrio entre cobertura, activacion y profundidad. Prioriza experiencia cliente y automatizacion.';
    }
    if (this.missingTemplateTypes.length) {
      return `IA: la mejora mas rentable ahora es completar biblioteca (${this.missingTemplateTypes.join(', ')}).`;
    }
    return 'IA: refuerza eventos activos y fechas de agenda para mejorar visibilidad de trabajo real.';
  }

  get focusEvents() {
    return this.events
      .filter((event) => event.status !== 'ARCHIVED')
      .sort((a, b) => (a.status === 'ACTIVE' ? -1 : 1) - (b.status === 'ACTIVE' ? -1 : 1))
      .slice(0, 4);
  }

  get missingTemplateTypes() {
    const present = new Set(this.templates.map((template) => template.type));
    return this.templateTypes.filter((type) => !present.has(type)).map((type) => this.toLabel(type));
  }

  get oldDraftEvents() {
    const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 45;
    return this.events.filter(
      (event) =>
        event.status === 'DRAFT' &&
        new Date(event.updatedAt ?? event.createdAt ?? 0).getTime() < cutoff,
    );
  }

  get aiRisks() {
    const risks: Array<{ title: string; detail: string }> = [];
    if (this.missingTemplateTypes.length) {
      risks.push({
        title: 'Cobertura de biblioteca incompleta',
        detail: `Faltan: ${this.missingTemplateTypes.join(', ')}.`,
      });
    }
    if (this.oldDraftEvents.length) {
      risks.push({
        title: 'Borradores sin movimiento',
        detail: `${this.oldDraftEvents.length} eventos llevan mas de 45 dias en draft.`,
      });
    }
    if (this.activationRate < 40 && this.events.length > 2) {
      risks.push({
        title: 'Tasa de activacion baja',
        detail: `Solo ${this.activationRate}% de eventos estan activos.`,
      });
    }
    if (this.avgTemplateFields < 8 && this.templates.length) {
      risks.push({
        title: 'Plantillas poco profundas',
        detail: 'Promedio de campos bajo para operación completa.',
      });
    }
    return risks.slice(0, 4);
  }

  get aiImpactScore() {
    const base = this.pipelineScore;
    const penalty = this.aiRisks.length * 8;
    return Math.max(20, Math.min(100, base - penalty + this.clientReadyTemplates * 2));
  }

  get aiWorkloadLabel() {
    const load = this.activeEvents + this.oldDraftEvents.length + Math.ceil(this.templates.length / 3);
    if (load >= 12) return 'Alta';
    if (load >= 7) return 'Media';
    return 'Controlada';
  }

  get documentReadyEventsCount() {
    return this.events.filter((event) => event.status === 'ACTIVE' && Boolean(event.date)).length;
  }

  get premiumTemplateCoveragePercent() {
    if (!this.templates.length) return 0;
    const premiumReady = this.templates.filter((template) => this.templateQualityScore(template.schemaJson) >= 78).length;
    return Math.round((premiumReady / this.templates.length) * 100);
  }

  get documentDeliveryScore() {
    const eventsBase = this.activeEvents ? (this.documentReadyEventsCount / this.activeEvents) * 45 : 20;
    const templateBase = this.premiumTemplateCoveragePercent * 0.35;
    const visibilityBase = this.weeklyFocusScore * 0.2;
    const penalty = this.aiRisks.length * 5;
    return Math.max(15, Math.min(100, Math.round(eventsBase + templateBase + visibilityBase - penalty)));
  }

  get aiAdminModeLabel() {
    if (this.documentDeliveryScore >= 80) return 'Escalar';
    if (this.documentDeliveryScore >= 55) return 'Optimizar';
    return 'Recuperar';
  }

  get deliveryRiskLabel() {
    if (this.documentDeliveryScore >= 75) return 'Bajo';
    if (this.documentDeliveryScore >= 50) return 'Medio';
    return 'Alto';
  }

  get nextBestActions() {
    const actions: Array<{ title: string; detail: string }> = [];
    if (this.activeEvents && this.documentReadyEventsCount < this.activeEvents) {
      actions.push({
        title: 'Completar fechas de entrega',
        detail: `${this.activeEvents - this.documentReadyEventsCount} evento(s) activos no estan listos para documentos.`,
      });
    }
    if (this.premiumTemplateCoveragePercent < 40 && this.templates.length) {
      actions.push({
        title: 'Subir nivel visual/operativo de templates',
        detail: 'Pulir templates clave para llegar a un baseline premium reutilizable.',
      });
    }
    if (this.missingTemplateTypes.length) {
      actions.push({
        title: 'Completar tipos core',
        detail: `Faltan ${this.missingTemplateTypes.join(', ')} para cubrir entregables principales.`,
      });
    }
    if (this.oldDraftEvents.length) {
      actions.push({
        title: 'Limpiar drafts antiguos',
        detail: `${this.oldDraftEvents.length} draft(s) frenan visibilidad y foco del equipo.`,
      });
    }
    if (!actions.length && (this.templates.length || this.events.length)) {
      actions.push({
        title: 'Sprint de premium polish',
        detail: 'Momento ideal para mejorar diseño PDF, experiencia cliente y plantillas top.',
      });
    }
    return actions.slice(0, 5);
  }

  get aiDeliveryNarrative() {
    if (!this.templates.length && !this.events.length) {
      return 'IA: crea base de templates y eventos para activar el radar de entrega.';
    }
    if (this.deliveryRiskLabel === 'Alto') {
      return 'IA: prioriza fechas en eventos activos y refuerzo de templates clave antes de escalar.';
    }
    if (this.deliveryRiskLabel === 'Medio') {
      return 'IA: buena base operativa. El mayor impacto ahora es subir templates premium-ready.';
    }
    return 'IA: capacidad de entrega sólida. Aprovecha para estandarizar playbooks y experiencia cliente.';
  }

  get upcomingEvents() {
    const now = new Date();
    const end = new Date();
    end.setDate(now.getDate() + 14);
    return this.events
      .filter((event) => {
        if (!event.date || event.status === 'ARCHIVED') return false;
        const date = new Date(event.date);
        return date >= now && date <= end;
      })
      .sort((a, b) => (new Date(a.date ?? '').getTime() || 0) - (new Date(b.date ?? '').getTime() || 0))
      .slice(0, 6);
  }

  get operationalRecommendations() {
    const recs: Array<{ title: string; detail: string }> = [];
    if (this.missingTemplateTypes.length) {
      recs.push({
        title: 'Completar cobertura core',
        detail: `Faltan tipos: ${this.missingTemplateTypes.join(', ')}.`,
      });
    }
    if (this.oldDraftEvents.length) {
      recs.push({
        title: 'Limpiar pipeline draft',
        detail: `Hay ${this.oldDraftEvents.length} draft(s) antiguos para activar o archivar.`,
      });
    }
    if (this.upcomingEvents.length) {
      const next = this.upcomingEvents[0];
      recs.push({
        title: 'Preparar proximo evento',
        detail: `${next.title} ocurre el ${new Date(next.date ?? '').toLocaleDateString('es-ES')}.`,
      });
    }
    if (this.clientReadyTemplates < 2) {
      recs.push({
        title: 'Mejorar experiencia cliente',
        detail: 'Sube al menos 2 templates al estandar client-ready para acelerar entregas.',
      });
    }
    return recs.slice(0, 4);
  }

  ngOnInit() {
    this.refreshDashboardData();
  }

  refreshDashboardData() {
    forkJoin({
      templates: this.http.get<TemplateModel[]>('http://localhost:3000/api/v1/templates'),
      events: this.http.get<EventModel[]>('http://localhost:3000/api/v1/events'),
    }).subscribe(({ templates, events }) => {
      this.templates = templates;
      this.events = events;
    });
  }

  toLabel(value: string) {
    return value.replace('_', ' ');
  }

  templatesByType(type: TemplateType) {
    return this.templates.filter((template) => template.type === type).length;
  }

  countFields(schemaJson: Record<string, unknown>) {
    const sections =
      (schemaJson['sections'] as Array<{ fields?: Array<unknown> }> | undefined) ?? [];
    return sections.reduce((acc, section) => acc + (section.fields?.length ?? 0), 0);
  }

  templateQualityScore(schemaJson: Record<string, unknown>) {
    const sections = (schemaJson['sections'] as Array<{ title?: string; fields?: Array<unknown> }> | undefined) ?? [];
    const names = sections.map((section) => (section.title ?? '').toLowerCase());
    const critical = ['timeline', 'cronograma', 'presupuesto', 'guest', 'invitados', 'proveedor', 'vendor'];
    const matched = critical.filter((matcher) => names.some((name) => name.includes(matcher))).length;
    const fieldCount = this.countFields(schemaJson);
    return Math.max(20, Math.min(100, sections.length * 10 + fieldCount * 2 + matched * 6));
  }

  createQuickEvent(type: EventType) {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    const payload = {
      title: type === 'WEDDING' ? 'Nuevo evento wedding premium' : 'Nuevo evento',
      type,
      date: date.toISOString().slice(0, 10),
    };
    this.http.post('http://localhost:3000/api/v1/events', payload).subscribe(() => this.ngOnInit());
  }

  archiveOldDrafts() {
    if (!this.oldDraftEvents.length) return;
    const requests = this.oldDraftEvents.map((event) =>
      this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, { status: 'ARCHIVED' }),
    );
    forkJoin(requests).subscribe(() => this.ngOnInit());
  }

  createMissingCoreTemplates() {
    const present = new Set(this.templates.map((template) => template.type));
    const missing = this.templateTypes.filter((type) => !present.has(type));
    if (!missing.length || this.creatingCore) return;

    const setup: Record<
      TemplateType,
      {
        name: string;
        description: string;
        sections: Array<{ title: string; fields: Array<{ key: string; label: string; type: string }> }>;
      }
    > = {
      CHECKLIST: {
        name: 'Checklist Wedding Core',
        description: 'Tareas clave por fases para wedding planner.',
        sections: [
          {
            title: 'Pre-boda',
            fields: [
              { key: 'tarea', label: 'Tarea', type: 'checkbox' },
              { key: 'responsable', label: 'Responsable', type: 'text' },
            ],
          },
        ],
      },
      TIMELINE: {
        name: 'Timeline Dia B',
        description: 'Flujo horario de ceremonia y fiesta.',
        sections: [
          {
            title: 'Dia B',
            fields: [
              { key: 'hora', label: 'Hora', type: 'time' },
              { key: 'hito', label: 'Hito', type: 'text' },
            ],
          },
        ],
      },
      BUDGET: {
        name: 'Budget Wedding',
        description: 'Control previsto vs real.',
        sections: [
          {
            title: 'Finanzas',
            fields: [
              { key: 'partida', label: 'Partida', type: 'text' },
              { key: 'importe', label: 'Importe', type: 'currency' },
            ],
          },
        ],
      },
      GUEST_LIST: {
        name: 'Guest List Core',
        description: 'RSVP y seating de invitados.',
        sections: [
          {
            title: 'Invitados',
            fields: [
              { key: 'nombre', label: 'Nombre', type: 'text' },
              { key: 'confirmado', label: 'Confirmado', type: 'checkbox' },
            ],
          },
        ],
      },
      VENDOR_LIST: {
        name: 'Vendor List Core',
        description: 'Control de proveedores y pagos.',
        sections: [
          {
            title: 'Proveedores',
            fields: [
              { key: 'proveedor', label: 'Proveedor', type: 'text' },
              { key: 'estado_pago', label: 'Estado pago', type: 'select' },
            ],
          },
        ],
      },
    };

    this.creatingCore = true;
    const requests = missing.map((type) =>
      this.http.post('http://localhost:3000/api/v1/templates', {
        name: setup[type].name,
        type,
        description: setup[type].description,
        schemaJson: { version: 1, sections: setup[type].sections },
      }),
    );
    forkJoin(requests).subscribe({
      next: () => {
        this.creatingCore = false;
        this.aiLastAction = 'AI: biblioteca completada con templates core.';
        this.ngOnInit();
      },
      error: () => {
        this.creatingCore = false;
      },
    });
  }

  runAiAutopilot() {
    const actions: Array<() => void> = [];
    if (this.missingTemplateTypes.length) actions.push(() => this.createMissingCoreTemplates());
    if (this.oldDraftEvents.length) actions.push(() => this.archiveOldDrafts());
    if (!this.activeEvents) actions.push(() => this.createQuickEvent('WEDDING'));

    if (!actions.length) {
      this.aiLastAction = 'AI: no hay acciones criticas. Todo en estado saludable.';
      return;
    }
    actions[0]();
    this.aiLastAction = `AI: ejecutando ${actions.length} recomendacion(es) para optimizar tu dia.`;
  }

  runAiGrowthSprint() {
    const actions: Array<() => void> = [];
    if (this.missingTemplateTypes.length) actions.push(() => this.createMissingCoreTemplates());
    if (this.oldDraftEvents.length) actions.push(() => this.archiveOldDrafts());
    if (this.activeEvents < 2) actions.push(() => this.createQuickEvent('WEDDING'));
    if (!actions.length) {
      this.aiLastAction = 'IA Growth Sprint: sistema estable, sin acciones urgentes.';
      return;
    }
    actions.slice(0, 2).forEach((action) => action());
    this.aiLastAction = `IA Growth Sprint: ejecutadas ${Math.min(actions.length, 2)} automatizaciones clave.`;
  }

  generateAiWeeklyPlan() {
    const lines: string[] = [];
    if (this.missingTemplateTypes.length) lines.push(`Lunes: completar biblioteca (${this.missingTemplateTypes.join(', ')})`);
    if (this.oldDraftEvents.length) lines.push(`Martes: activar o archivar ${this.oldDraftEvents.length} draft(s) antiguos`);
    lines.push(`Miercoles: revisar ${Math.max(1, this.focusEvents.length)} eventos prioritarios`);
    lines.push('Jueves: cerrar pagos y contratos de proveedores');
    lines.push('Viernes: preparar brief del Dia B y checklist de contingencia');
    this.aiLastAction = `Plan semanal IA:\n${lines.join(' | ')}`;
  }

  runAiFocusMode() {
    const focus =
      this.operationalRecommendations[0]?.detail ||
      (this.upcomingEvents[0]
        ? `Preparar ${this.upcomingEvents[0].title} y revisar documentos clave.`
        : 'Completar biblioteca core y activar 1 evento para arrancar pipeline.');
    this.aiLastAction = `IA Focus Mode: ${focus}`;
  }

  runAiDocumentSprint() {
    if (this.oldDraftEvents.length) {
      this.archiveOldDrafts();
    } else if (this.activeEvents && this.documentReadyEventsCount < this.activeEvents) {
      this.aiLastAction = 'IA Document Sprint: faltan fechas en eventos activos. Revisa Events para completar agenda.';
    } else {
      this.aiLastAction = 'IA Document Sprint: pipeline listo. Siguiente paso, pulir templates premium y exportes.';
    }
  }

  runAiPremiumTemplatePass() {
    if (this.missingTemplateTypes.length) {
      this.createMissingCoreTemplates();
      return;
    }
    this.aiLastAction =
      this.premiumTemplateCoveragePercent >= 60
        ? 'IA Premium Templates: buena base. Pulir copy, visual y PDF de tus templates top.'
        : 'IA Premium Templates: prioriza 2-3 templates clave para subir cobertura premium-ready.';
  }

  runAiWeeklyReset() {
    this.refreshDashboardData();
    this.aiLastAction = `IA Weekly Reset: dashboard refrescado. Prioridad actual: ${this.nextBestActions[0]?.title ?? 'sin bloqueos criticos'}.`;
  }

  exportDashboardPdf() {
    openTemplatePdfPreview({
      title: 'Dashboard Wedding Planner',
      subtitle: 'Resumen operativo de negocio y salud de biblioteca.',
      theme: 'dashboard',
      meta: [
        { label: 'Templates', value: this.templates.length },
        { label: 'Eventos', value: this.events.length },
        { label: 'Pipeline', value: `${this.pipelineScore}/100` },
        { label: 'Activacion', value: `${this.activationRate}%` },
      ],
      sections: [
        {
          title: 'Cobertura de templates',
          fields: this.templateTypes.map((type) => ({
            label: `${this.toLabel(type)} (${this.templatesByType(type)})`,
            type: 'metric',
          })),
        },
        {
          title: 'Eventos prioritarios',
          fields: this.focusEvents.map((event) => ({
            label: `${event.title} · ${event.status}`,
            type: this.toLabel(event.type),
          })),
        },
      ],
    });
  }
}


