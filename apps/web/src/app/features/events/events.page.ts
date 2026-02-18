import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventModel, EventStatus, EventType } from '../../shared/models';

type EventSortMode = 'recent' | 'title' | 'status';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="events-view">
      <header class="page-head">
        <div>
          <p class="kicker">Operaciones</p>
          <h1>Events control center</h1>
          <p class="muted-copy">Pipeline operativo para activar eventos y preparar documentos por fase.</p>
        </div>
        <div class="head-stat">
          <span>Pipeline</span>
          <strong>{{ eventsScore }}/100</strong>
        </div>
      </header>

      <section class="insight-grid dashboard-kpis">
        <article class="insight-card">
          <p>Total eventos</p>
          <strong>{{ events.length }}</strong>
        </article>
        <article class="insight-card">
          <p>Activos</p>
          <strong>{{ activeCount }}</strong>
        </article>
        <article class="insight-card">
          <p>Borradores</p>
          <strong>{{ draftCount }}</strong>
        </article>
        <article class="insight-card">
          <p>Archivados</p>
          <strong>{{ archivedCount }}</strong>
        </article>
      </section>

      <section class="template-create">
        <div class="panel-head">
          <h3>Nuevo evento</h3>
          <span class="muted-copy">Crea rapido y empieza a generar documentos desde templates.</span>
        </div>
        <form [formGroup]="form" (ngSubmit)="create()" class="inline-form">
          <input formControlName="title" placeholder="Nombre del evento" />
          <select formControlName="type">
            <option *ngFor="let t of types" [value]="t">{{ toLabel(t) }}</option>
          </select>
          <button type="submit" [disabled]="form.invalid">Crear</button>
        </form>
      </section>

      <section class="template-library">
        <div class="library-toolbar">
          <input [(ngModel)]="search" [ngModelOptions]="{ standalone: true }" placeholder="Buscar evento..." />
          <select [(ngModel)]="statusFilter" [ngModelOptions]="{ standalone: true }">
            <option value="ALL">Todos estados</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <select [(ngModel)]="typeFilter" [ngModelOptions]="{ standalone: true }">
            <option value="ALL">Todos tipos</option>
            <option *ngFor="let t of types" [value]="t">{{ toLabel(t) }}</option>
          </select>
          <select [(ngModel)]="sortMode" [ngModelOptions]="{ standalone: true }">
            <option value="recent">Recientes</option>
            <option value="title">Nombre</option>
            <option value="status">Estado</option>
          </select>
          <button type="button" class="ghost-btn" (click)="quickFilter('ACTIVE')">Solo activos</button>
          <button type="button" class="ghost-btn" (click)="resetFilters()">Limpiar</button>
        </div>
      </section>

      <section class="template-grid" *ngIf="filteredEvents.length; else emptyState">
        <article class="template-card interactive-card" *ngFor="let event of filteredEvents; trackBy: trackById">
          <div class="event-card-head">
            <p class="type-chip">{{ toLabel(event.type) }}</p>
            <span class="status-pill" [ngClass]="statusClass(event.status)">{{ event.status }}</span>
          </div>
          <h3>{{ event.title }}</h3>
          <p class="muted-copy">Evento operativo listo para documentos y seguimiento.</p>
          <div class="detail-row">
            <span>Prioridad: <strong>{{ event.status === 'ACTIVE' ? 'Alta' : 'Media' }}</strong></span>
            <span *ngIf="event.date">Fecha: <strong>{{ event.date | date: 'dd/MM/yyyy' }}</strong></span>
          </div>

          <div class="actions-row">
            <a [routerLink]="['/app/events', event.id]" class="ghost-btn action-link">Abrir</a>
            <button type="button" class="ghost-btn" (click)="setStatus(event, 'ACTIVE')">Activar</button>
            <button type="button" class="ghost-btn" (click)="setStatus(event, 'ARCHIVED')">Archivar</button>
          </div>
        </article>
      </section>

      <ng-template #emptyState>
        <section class="empty-state">
          <h3>Sin eventos en este filtro</h3>
          <p>Prueba otro estado o crea un nuevo evento.</p>
        </section>
      </ng-template>
    </section>
  `,
})
export class EventsPageComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  events: EventModel[] = [];
  types: EventType[] = ['WEDDING', 'EVENT', 'OTHER'];

  search = '';
  statusFilter: EventStatus | 'ALL' = 'ALL';
  typeFilter: EventType | 'ALL' = 'ALL';
  sortMode: EventSortMode = 'recent';

  readonly form = this.fb.group({
    title: ['', Validators.required],
    type: ['WEDDING' as EventType, Validators.required],
  });

  get activeCount() {
    return this.events.filter((event) => event.status === 'ACTIVE').length;
  }

  get draftCount() {
    return this.events.filter((event) => event.status === 'DRAFT').length;
  }

  get archivedCount() {
    return this.events.filter((event) => event.status === 'ARCHIVED').length;
  }

  get eventsScore() {
    if (!this.events.length) return 0;
    const activeWeight = (this.activeCount / this.events.length) * 55;
    const draftWeight = Math.min(25, this.draftCount * 4);
    const archivedWeight = Math.max(0, 20 - this.archivedCount * 2);
    return Math.max(10, Math.min(100, Math.round(activeWeight + draftWeight + archivedWeight)));
  }

  get filteredEvents() {
    const q = this.search.trim().toLowerCase();
    let data = this.events.filter((event) => {
      const statusOk = this.statusFilter === 'ALL' ? true : event.status === this.statusFilter;
      const typeOk = this.typeFilter === 'ALL' ? true : event.type === this.typeFilter;
      const searchOk = q ? `${event.title} ${event.type}`.toLowerCase().includes(q) : true;
      return statusOk && searchOk && typeOk;
    });

    if (this.sortMode === 'title') data = [...data].sort((a, b) => a.title.localeCompare(b.title));
    if (this.sortMode === 'status') data = [...data].sort((a, b) => a.status.localeCompare(b.status));
    if (this.sortMode === 'recent') {
      data = [...data].sort(
        (a, b) =>
          (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0),
      );
    }

    return data;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.http.get<EventModel[]>('http://localhost:3000/api/v1/events').subscribe((data) => {
      this.events = data;
    });
  }

  create() {
    if (this.form.invalid) return;
    this.http.post('http://localhost:3000/api/v1/events', this.form.getRawValue()).subscribe(() => {
      this.form.reset({ title: '', type: 'WEDDING' });
      this.load();
    });
  }

  setStatus(event: EventModel, status: EventStatus) {
    if (event.status === status) return;
    this.http
      .patch(`http://localhost:3000/api/v1/events/${event.id}`, { status })
      .subscribe(() => this.load());
  }

  quickFilter(status: EventStatus) {
    this.statusFilter = status;
  }

  resetFilters() {
    this.search = '';
    this.statusFilter = 'ALL';
    this.typeFilter = 'ALL';
    this.sortMode = 'recent';
  }

  statusClass(status: EventStatus) {
    if (status === 'ACTIVE') return 'is-active';
    if (status === 'ARCHIVED') return 'is-archived';
    return 'is-draft';
  }

  toLabel(value: string) {
    return value.replace('_', ' ');
  }

  trackById(_: number, event: EventModel) {
    return event.id;
  }
}
