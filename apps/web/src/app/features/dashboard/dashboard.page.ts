import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventModel, TemplateModel } from '../../shared/models';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="dashboard-view">
      <header class="page-head">
        <div>
          <p class="kicker">Resumen</p>
          <h1>Dashboard</h1>
          <p class="muted-copy">Visibilidad global de plantillas y eventos activos.</p>
        </div>
      </header>

      <section class="insight-grid">
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
      </section>

      <section class="dashboard-grid">
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
      </section>
    </section>
  `,
})
export class DashboardPageComponent {
  private readonly http = inject(HttpClient);

  templates: TemplateModel[] = [];
  events: EventModel[] = [];

  get activeEvents() {
    return this.events.filter((event) => event.status === 'ACTIVE').length;
  }

  get draftEvents() {
    return this.events.filter((event) => event.status === 'DRAFT').length;
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

  countFields(schemaJson: Record<string, unknown>) {
    const sections =
      (schemaJson['sections'] as Array<{ fields?: Array<unknown> }> | undefined) ?? [];
    return sections.reduce((acc, section) => acc + (section.fields?.length ?? 0), 0);
  }
}
