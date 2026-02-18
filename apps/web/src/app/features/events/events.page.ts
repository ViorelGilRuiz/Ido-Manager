import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EventModel, EventStatus, EventType } from '../../shared/models';

@Component({
  selector: 'app-events-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="events-view">
      <header class="page-head">
        <div>
          <p class="kicker">Operaciones</p>
          <h1>Events</h1>
          <p class="muted-copy">Crea eventos y controla su estado operativo.</p>
        </div>
      </header>

      <section class="template-create">
        <h3>Nuevo evento</h3>
        <form [formGroup]="form" (ngSubmit)="create()" class="inline-form">
          <input formControlName="title" placeholder="Nombre del evento" />
          <select formControlName="type">
            <option *ngFor="let t of types" [value]="t">{{ toLabel(t) }}</option>
          </select>
          <button type="submit" [disabled]="form.invalid">Crear</button>
        </form>
      </section>

      <section class="toolbar-row">
        <input [(ngModel)]="search" [ngModelOptions]="{ standalone: true }" placeholder="Buscar evento..." />
        <select [(ngModel)]="statusFilter" [ngModelOptions]="{ standalone: true }">
          <option value="ALL">Todos</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </section>

      <section class="template-grid" *ngIf="filteredEvents.length; else emptyState">
        <article class="template-card interactive-card" *ngFor="let event of filteredEvents; trackBy: trackById">
          <p class="type-chip">{{ toLabel(event.type) }}</p>
          <h3>{{ event.title }}</h3>
          <div class="detail-row">
            <span>Estado: <strong>{{ event.status }}</strong></span>
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

  readonly form = this.fb.group({
    title: ['', Validators.required],
    type: ['WEDDING' as EventType, Validators.required],
  });

  get filteredEvents() {
    const q = this.search.trim().toLowerCase();
    return this.events.filter((event) => {
      const statusOk = this.statusFilter === 'ALL' ? true : event.status === this.statusFilter;
      const searchOk = q ? event.title.toLowerCase().includes(q) : true;
      return statusOk && searchOk;
    });
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

  toLabel(value: string) {
    return value.replace('_', ' ');
  }

  trackById(_: number, event: EventModel) {
    return event.id;
  }
}
