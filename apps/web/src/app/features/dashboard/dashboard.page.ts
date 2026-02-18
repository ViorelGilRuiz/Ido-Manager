import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventModel, TemplateModel, TemplateType } from '../../shared/models';

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
      </section>
    </section>
  `,
})
export class DashboardPageComponent {
  private readonly http = inject(HttpClient);

  templates: TemplateModel[] = [];
  events: EventModel[] = [];
  readonly templateTypes: TemplateType[] = ['CHECKLIST', 'TIMELINE', 'BUDGET', 'GUEST_LIST', 'VENDOR_LIST'];

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

  get pipelineScore() {
    const templateWeight = this.templates.length ? Math.min(40, this.avgTemplateFields * 3) : 0;
    const activationWeight = this.activationRate * 0.45;
    const coverageWeight =
      (this.templateTypes.filter((type) => this.templatesByType(type) > 0).length / this.templateTypes.length) * 35;
    return Math.max(10, Math.min(100, Math.round(templateWeight + activationWeight + coverageWeight)));
  }

  get focusEvents() {
    return this.events
      .filter((event) => event.status !== 'ARCHIVED')
      .sort((a, b) => (a.status === 'ACTIVE' ? -1 : 1) - (b.status === 'ACTIVE' ? -1 : 1))
      .slice(0, 4);
  }

  ngOnInit() {
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
}
