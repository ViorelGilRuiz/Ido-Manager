import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { EventModel, EventStatus, EventType } from '../../shared/models';
import { openTemplatePdfPreview } from '../../shared/utils/pdf-export';

type EventSortMode = 'recent' | 'title' | 'status' | 'date';
type EventViewMode = 'cards' | 'board' | 'timeline';

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
      <div class="actions-row">
        <button type="button" class="ghost-btn" (click)="exportEventsPdf()">Exportar eventos PDF</button>
      </div>

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
        <article class="insight-card">
          <p>Con fecha definida</p>
          <strong>{{ datedCount }}</strong>
        </article>
        <article class="insight-card">
          <p>Visibilidad agenda</p>
          <strong>{{ scheduleVisibilityScore }}/100</strong>
        </article>
        <article class="insight-card">
          <p>Listos para docs</p>
          <strong>{{ documentReadyEvents }}</strong>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel-card">
          <div class="panel-head">
            <h3>Resumen operativo IA</h3>
            <span class="muted-copy">{{ aiEventWorkloadLabel }}</span>
          </div>
          <div class="coverage-list">
            <div class="coverage-row">
              <span>Eventos con fecha</span>
              <strong>{{ datedCount }}/{{ events.length || 0 }}</strong>
            </div>
            <div class="coverage-row">
              <span>Draft sin fecha</span>
              <strong>{{ draftUndatedCount }}</strong>
            </div>
            <div class="coverage-row">
              <span>Activos proximos (30 dias)</span>
              <strong>{{ next30DaysActiveCount }}</strong>
            </div>
            <div class="coverage-row">
              <span>Ready para documentos</span>
              <strong>{{ documentReadyRate }}%</strong>
            </div>
          </div>
          <p class="muted-copy">{{ aiEventsNarrative }}</p>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="aiPrepareWeekBoard()">IA preparar semana</button>
            <button type="button" class="ghost-btn" (click)="aiBulkMarkUpcomingActive()" [disabled]="!upcomingDrafts.length">
              IA activar proximos draft ({{ upcomingDrafts.length }})
            </button>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <h3>Vista de progreso</h3>
            <span class="muted-copy">Seguimiento para planner</span>
          </div>
          <ul class="panel-list" *ngIf="eventProgressHighlights.length; else noEventProgress">
            <li *ngFor="let item of eventProgressHighlights">
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </li>
          </ul>
          <ng-template #noEventProgress>
            <p class="muted-copy">Crea eventos para empezar a ver recomendaciones de progreso.</p>
          </ng-template>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel-card">
          <div class="panel-head">
            <h3>Delivery board</h3>
            <span class="muted-copy">Preparacion para documentos y ejecucion</span>
          </div>
          <div class="insight-grid">
            <article class="insight-card">
              <p>Delivery score</p>
              <strong>{{ deliveryBoardScore }}/100</strong>
            </article>
            <article class="insight-card">
              <p>Eventos urgentes</p>
              <strong>{{ urgentEventsCount }}</strong>
            </article>
            <article class="insight-card">
              <p>Bloqueos</p>
              <strong>{{ eventOpsBacklog.length }}</strong>
            </article>
          </div>
          <ul class="panel-list" *ngIf="eventOpsBacklog.length; else noEventOpsBacklog">
            <li *ngFor="let item of eventOpsBacklog">
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </li>
          </ul>
          <ng-template #noEventOpsBacklog>
            <p class="muted-copy">Sin bloqueos fuertes. Buen momento para preparar documentación premium por evento.</p>
          </ng-template>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="aiPrepareDocRun()">IA preparar docs</button>
            <button type="button" class="ghost-btn" (click)="aiPrepareWeekBoard()">IA preparar semana</button>
            <button type="button" class="ghost-btn" (click)="aiResolveDateConflicts()">IA resolver conflictos</button>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <h3>Radar de ejecucion semanal</h3>
            <span class="muted-copy">{{ executionModeLabel }}</span>
          </div>
          <div class="coverage-list">
            <div class="coverage-row">
              <span>Activos proximos (30 dias)</span>
              <strong>{{ next30DaysActiveCount }}</strong>
            </div>
            <div class="coverage-row">
              <span>Drafts proximos</span>
              <strong>{{ upcomingDrafts.length }}</strong>
            </div>
            <div class="coverage-row">
              <span>Conflictos fecha</span>
              <strong>{{ sameDayConflictCount }}</strong>
            </div>
            <div class="coverage-row">
              <span>Ready docs</span>
              <strong>{{ documentReadyRate }}%</strong>
            </div>
          </div>
          <p class="muted-copy">{{ aiExecutionNarrative }}</p>
        </article>
      </section>

      <section class="panel-card ai-copilot-card">
        <div class="panel-head">
          <h3>IA Events Assistant</h3>
          <span class="muted-copy">Sugerencias y automatizaciones para wedding planner</span>
        </div>
        <p class="muted-copy">{{ aiEventHint }}</p>
        <div class="actions-row">
          <button type="button" class="ghost-btn" (click)="applyAiEventDraft()">IA generar evento pro</button>
          <button type="button" class="ghost-btn" (click)="aiAutoPlanDates()">IA autoplanificar fechas</button>
          <button type="button" class="ghost-btn" (click)="aiPolishAllEvents()">IA pulir eventos</button>
          <button type="button" class="ghost-btn" (click)="aiResolveDateConflicts()">IA resolver conflictos</button>
          <button type="button" class="ghost-btn" (click)="aiBoostDocumentVisibility()">IA visibilidad docs</button>
        </div>
      </section>

      <section class="panel-card">
        <div class="panel-head">
          <h3>Agenda y conflictos</h3>
          <span class="muted-copy">{{ nextEventLabel }}</span>
        </div>
        <div class="insight-grid">
          <article class="insight-card">
            <p>Proximo evento</p>
            <strong>{{ nextEventCountdown }}</strong>
          </article>
          <article class="insight-card">
            <p>Conflictos de fecha</p>
            <strong>{{ sameDayConflictCount }}</strong>
          </article>
          <article class="insight-card">
            <p>Sin fecha</p>
            <strong>{{ undatedCount }}</strong>
          </article>
        </div>
        <ul class="panel-list" *ngIf="sameDayConflicts.length; else noDateConflicts">
          <li *ngFor="let item of sameDayConflicts">
            <strong>{{ item.date }}</strong>
            <p>{{ item.titles.join(' · ') }}</p>
          </li>
        </ul>
        <ng-template #noDateConflicts>
          <p class="muted-copy">No hay conflictos de agenda por fecha.</p>
        </ng-template>
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
          <input type="date" formControlName="date" />
          <button type="submit" [disabled]="form.invalid">Crear</button>
        </form>
        <div class="actions-row">
          <button type="button" class="ghost-btn" (click)="createPresetEvent('civil')">Preset boda civil</button>
          <button type="button" class="ghost-btn" (click)="createPresetEvent('religiosa')">Preset boda religiosa</button>
          <button type="button" class="ghost-btn" (click)="createPresetEvent('destino')">Preset boda destino</button>
          <button type="button" class="ghost-btn" (click)="createSeriesFromForm()">Crear serie x3</button>
        </div>
      </section>

      <section class="template-library">
        <div class="panel-head">
          <h3>Workspace de eventos</h3>
          <span class="muted-copy">Filtra, selecciona y opera en lote desde una sola vista.</span>
        </div>
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
            <option value="date">Fecha</option>
          </select>
          <button type="button" class="ghost-btn" (click)="activateDraftsBulk()" [disabled]="!draftCount">
            Activar borradores ({{ draftCount }})
          </button>
          <button type="button" class="ghost-btn" (click)="quickFilter('ACTIVE')">Solo activos</button>
          <button type="button" class="ghost-btn" (click)="quickFilter('DRAFT')">Solo borradores</button>
          <button type="button" class="ghost-btn" (click)="resetFilters()">Limpiar</button>
        </div>

        <div class="events-workbench">
          <div class="events-workbench__row">
            <div class="segmented-tools">
              <button type="button" class="ghost-btn" [class.is-active]="viewMode === 'cards'" (click)="setViewMode('cards')">
                Cards
              </button>
              <button type="button" class="ghost-btn" [class.is-active]="viewMode === 'board'" (click)="setViewMode('board')">
                Board
              </button>
              <button
                type="button"
                class="ghost-btn"
                [class.is-active]="viewMode === 'timeline'"
                (click)="setViewMode('timeline')"
              >
                Timeline
              </button>
            </div>

            <div class="segmented-tools">
              <button type="button" class="ghost-btn" (click)="toggleSelectAllFiltered()">
                {{ allFilteredSelected ? 'Quitar selección visible' : 'Seleccionar visibles' }}
              </button>
              <button type="button" class="ghost-btn" (click)="clearSelection()" [disabled]="!selectedCount">Limpiar selección</button>
              <span class="workbench-pill">Seleccionados: {{ selectedCount }}</span>
            </div>
          </div>

          <div class="events-workbench__row events-workbench__row--bulk">
            <button type="button" class="ghost-btn" (click)="bulkSetStatus('ACTIVE')" [disabled]="!selectedCount">Activar lote</button>
            <button type="button" class="ghost-btn" (click)="bulkSetStatus('ARCHIVED')" [disabled]="!selectedCount">Archivar lote</button>
            <button type="button" class="ghost-btn" (click)="bulkDuplicateSelected()" [disabled]="!selectedCount">Duplicar lote</button>
            <button type="button" class="ghost-btn" (click)="bulkAssignDatesToSelected()" [disabled]="!selectedCount">Asignar fechas IA</button>
            <label class="workbench-input">
              <span>Mover fechas</span>
              <input type="number" min="1" [(ngModel)]="bulkShiftDays" [ngModelOptions]="{ standalone: true }" />
            </label>
            <button type="button" class="ghost-btn" (click)="bulkShiftSelectedDates('backward')" [disabled]="!selectedCount">
              -días
            </button>
            <button type="button" class="ghost-btn" (click)="bulkShiftSelectedDates('forward')" [disabled]="!selectedCount">
              +días
            </button>
            <button type="button" class="ghost-btn danger-btn" (click)="bulkDeleteSelected()" [disabled]="!selectedCount">
              Eliminar lote
            </button>
          </div>

          <div class="events-workbench__row events-workbench__row--planner">
            <label class="workbench-input">
              <span>Horizonte timeline</span>
              <input type="number" min="7" max="180" [(ngModel)]="plannerHorizonDays" [ngModelOptions]="{ standalone: true }" />
            </label>
            <span class="workbench-pill">Filtrados: {{ filteredEvents.length }}</span>
            <span class="workbench-pill">Con fecha: {{ filteredDatedCount }}</span>
            <span class="workbench-pill">Urgentes: {{ filteredUrgentCount }}</span>
          </div>
        </div>
      </section>

      <section class="template-grid" *ngIf="filteredEvents.length && viewMode === 'cards'; else alternativeOrEmpty">
        <article class="template-card interactive-card" *ngFor="let event of filteredEvents; trackBy: trackById">
          <div class="event-card-head">
            <div class="event-card-head__left">
              <label class="event-check">
                <input type="checkbox" [checked]="isSelected(event)" (change)="toggleEventSelection(event)" />
                <span></span>
              </label>
              <p class="type-chip">{{ toLabel(event.type) }}</p>
            </div>
            <span class="status-pill" [ngClass]="statusClass(event.status)">{{ event.status }}</span>
          </div>
          <h3>{{ event.title }}</h3>
          <p class="muted-copy">Evento operativo listo para documentos y seguimiento.</p>
          <div class="detail-row">
            <span>Prioridad: <strong>{{ event.status === 'ACTIVE' ? 'Alta' : 'Media' }}</strong></span>
            <span *ngIf="event.date">Fecha: <strong>{{ event.date | date: 'dd/MM/yyyy' }}</strong></span>
          </div>
          <div class="detail-row" *ngIf="event.date">
            <span>Días: <strong>{{ daysUntil(event) === 0 ? 'Hoy' : (daysUntil(event) ?? '-') }}</strong></span>
            <span class="timeline-pill" [ngClass]="'tone-' + timelineTone(event)">Agenda</span>
          </div>

          <div class="event-inline-editor" *ngIf="isEditing(event)">
            <div class="event-inline-editor__grid">
              <input [(ngModel)]="quickEdit.title" [ngModelOptions]="{ standalone: true }" placeholder="Título del evento" />
              <select [(ngModel)]="quickEdit.type" [ngModelOptions]="{ standalone: true }">
                <option *ngFor="let t of types" [value]="t">{{ toLabel(t) }}</option>
              </select>
              <select [(ngModel)]="quickEdit.status" [ngModelOptions]="{ standalone: true }">
                <option *ngFor="let s of statuses.slice(1)" [value]="s">{{ s }}</option>
              </select>
              <input type="date" [(ngModel)]="quickEdit.date" [ngModelOptions]="{ standalone: true }" />
            </div>
            <div class="actions-row">
              <button type="button" class="ghost-btn" (click)="saveInlineEdit(event)">Guardar edición</button>
              <button type="button" class="ghost-btn" (click)="cancelInlineEdit()">Cancelar</button>
            </div>
          </div>

          <div class="event-quick-toolbar">
            <button type="button" class="ghost-btn" (click)="startInlineEdit(event)">{{ isEditing(event) ? 'Editando...' : 'Edición rápida' }}</button>
            <button type="button" class="ghost-btn" (click)="quickEventStatusCycle(event)">Ciclo estado</button>
            <button type="button" class="ghost-btn" (click)="toggleEventSelection(event)">
              {{ isSelected(event) ? 'Quitar selección' : 'Seleccionar' }}
            </button>
          </div>

          <div class="actions-row">
            <a [routerLink]="['/app/events', event.id]" class="ghost-btn action-link">Abrir</a>
            <button type="button" class="ghost-btn" (click)="startInlineEdit(event)">Renombrar</button>
            <button type="button" class="ghost-btn" (click)="setEventDate(event)">Fecha</button>
            <button type="button" class="ghost-btn" (click)="setStatus(event, 'ACTIVE')">Activar</button>
            <button type="button" class="ghost-btn" (click)="goLiveToday(event)">Go Live hoy</button>
            <button type="button" class="ghost-btn" (click)="setStatus(event, 'ARCHIVED')">Archivar</button>
            <button type="button" class="ghost-btn" (click)="duplicateEvent(event)">Duplicar</button>
            <button type="button" class="ghost-btn danger-btn" (click)="deleteEvent(event)">Eliminar</button>
          </div>
        </article>
      </section>

      <ng-template #alternativeOrEmpty>
        <ng-container *ngIf="filteredEvents.length; else emptyState">
          <section class="events-board" *ngIf="viewMode === 'board'">
            <article class="events-board__col">
              <header>
                <h3>DRAFT</h3>
                <span>{{ filteredDraftEvents.length }}</span>
              </header>
              <div class="events-board__list">
                <article class="events-board__card" *ngFor="let event of filteredDraftEvents" (click)="toggleEventSelection(event)">
                  <div class="events-board__card-head">
                    <span class="type-chip">{{ toLabel(event.type) }}</span>
                    <label class="event-check">
                      <input type="checkbox" [checked]="isSelected(event)" (click)="$event.stopPropagation()" (change)="toggleEventSelection(event)" />
                      <span></span>
                    </label>
                  </div>
                  <strong>{{ event.title }}</strong>
                  <p>{{ event.date ? (event.date | date: 'dd/MM/yyyy') : 'Sin fecha' }}</p>
                  <div class="actions-row">
                    <button type="button" class="ghost-btn" (click)="$event.stopPropagation(); startInlineEdit(event)">Editar</button>
                    <button type="button" class="ghost-btn" (click)="$event.stopPropagation(); setStatus(event, 'ACTIVE')">Activar</button>
                    <button type="button" class="ghost-btn" (click)="$event.stopPropagation(); setEventDate(event)">Fecha</button>
                  </div>
                </article>
              </div>
            </article>

            <article class="events-board__col">
              <header>
                <h3>ACTIVE</h3>
                <span>{{ filteredActiveEvents.length }}</span>
              </header>
              <div class="events-board__list">
                <article class="events-board__card" *ngFor="let event of filteredActiveEvents" (click)="toggleEventSelection(event)">
                  <div class="events-board__card-head">
                    <span class="type-chip">{{ toLabel(event.type) }}</span>
                    <label class="event-check">
                      <input type="checkbox" [checked]="isSelected(event)" (click)="$event.stopPropagation()" (change)="toggleEventSelection(event)" />
                      <span></span>
                    </label>
                  </div>
                  <strong>{{ event.title }}</strong>
                  <p>{{ event.date ? (event.date | date: 'dd/MM/yyyy') : 'Sin fecha' }}</p>
                  <div class="actions-row">
                    <button type="button" class="ghost-btn" (click)="$event.stopPropagation(); quickEventStatusCycle(event)">Ciclo</button>
                    <a [routerLink]="['/app/events', event.id]" class="ghost-btn action-link" (click)="$event.stopPropagation()">Abrir</a>
                    <button type="button" class="ghost-btn" (click)="$event.stopPropagation(); setStatus(event, 'ARCHIVED')">Archivar</button>
                  </div>
                </article>
              </div>
            </article>

            <article class="events-board__col">
              <header>
                <h3>ARCHIVED</h3>
                <span>{{ filteredArchivedEvents.length }}</span>
              </header>
              <div class="events-board__list">
                <article class="events-board__card" *ngFor="let event of filteredArchivedEvents" (click)="toggleEventSelection(event)">
                  <div class="events-board__card-head">
                    <span class="type-chip">{{ toLabel(event.type) }}</span>
                    <label class="event-check">
                      <input type="checkbox" [checked]="isSelected(event)" (click)="$event.stopPropagation()" (change)="toggleEventSelection(event)" />
                      <span></span>
                    </label>
                  </div>
                  <strong>{{ event.title }}</strong>
                  <p>{{ event.date ? (event.date | date: 'dd/MM/yyyy') : 'Sin fecha' }}</p>
                  <div class="actions-row">
                    <button type="button" class="ghost-btn" (click)="$event.stopPropagation(); startInlineEdit(event)">Editar</button>
                    <button type="button" class="ghost-btn" (click)="$event.stopPropagation(); duplicateEvent(event)">Duplicar</button>
                    <button type="button" class="ghost-btn" (click)="$event.stopPropagation(); setStatus(event, 'ACTIVE')">Reactivar</button>
                  </div>
                </article>
              </div>
            </article>
          </section>

          <section class="events-timeline" *ngIf="viewMode === 'timeline'">
            <div class="events-timeline__empty" *ngIf="!plannerTimelineEvents.length">
              <h3>Sin eventos en timeline</h3>
              <p>Añade fechas o amplía el horizonte para ver la planificación.</p>
            </div>

            <article class="events-timeline__row" *ngFor="let item of plannerTimelineEvents">
              <div class="events-timeline__date">
                <span>{{ item.event.date | date: 'dd/MM' }}</span>
                <small>{{ item.event.date | date: 'yyyy' }}</small>
              </div>
              <div class="events-timeline__line" [ngClass]="'tone-' + timelineTone(item.event)"></div>
              <div class="events-timeline__card" [class.is-selected]="isSelected(item.event)">
                <div class="event-card-head">
                  <div class="event-card-head__left">
                    <label class="event-check">
                      <input type="checkbox" [checked]="isSelected(item.event)" (change)="toggleEventSelection(item.event)" />
                      <span></span>
                    </label>
                    <p class="type-chip">{{ toLabel(item.event.type) }}</p>
                  </div>
                  <span class="status-pill" [ngClass]="statusClass(item.event.status)">{{ item.event.status }}</span>
                </div>
                <h3>{{ item.event.title }}</h3>
                <p class="muted-copy">{{ countdownLabel(item.event) }}</p>
                <div class="actions-row">
                  <a [routerLink]="['/app/events', item.event.id]" class="ghost-btn action-link">Abrir</a>
                  <button type="button" class="ghost-btn" (click)="setEventDate(item.event)">Fecha</button>
                  <button type="button" class="ghost-btn" (click)="goLiveToday(item.event)">Go Live hoy</button>
                </div>
              </div>
            </article>
          </section>
        </ng-container>
      </ng-template>

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
  readonly statuses: Array<EventStatus | 'ALL'> = ['ALL', 'DRAFT', 'ACTIVE', 'ARCHIVED'];

  search = '';
  statusFilter: EventStatus | 'ALL' = 'ALL';
  typeFilter: EventType | 'ALL' = 'ALL';
  sortMode: EventSortMode = 'recent';
  viewMode: EventViewMode = 'cards';
  selectedEventIds = new Set<string>();
  bulkShiftDays = 7;
  plannerHorizonDays = 45;
  editingEventId: string | null = null;
  quickEdit = {
    title: '',
    type: 'WEDDING' as EventType,
    status: 'DRAFT' as EventStatus,
    date: '',
  };
  aiEventHint = 'IA lista para generar eventos premium con copy y fechas optimizadas.';

  readonly form = this.fb.group({
    title: ['', Validators.required],
    type: ['WEDDING' as EventType, Validators.required],
    date: [''],
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

  get datedCount() {
    return this.events.filter((event) => Boolean(event.date)).length;
  }

  get undatedCount() {
    return this.events.filter((event) => !event.date).length;
  }

  get draftUndatedCount() {
    return this.events.filter((event) => event.status === 'DRAFT' && !event.date).length;
  }

  get eventsScore() {
    if (!this.events.length) return 0;
    const activeWeight = (this.activeCount / this.events.length) * 55;
    const draftWeight = Math.min(25, this.draftCount * 4);
    const archivedWeight = Math.max(0, 20 - this.archivedCount * 2);
    return Math.max(10, Math.min(100, Math.round(activeWeight + draftWeight + archivedWeight)));
  }

  get next30DaysActiveCount() {
    const now = Date.now();
    const end = now + 1000 * 60 * 60 * 24 * 30;
    return this.events.filter((event) => {
      if (event.status !== 'ACTIVE' || !event.date) return false;
      const time = new Date(event.date).getTime();
      return time >= now && time <= end;
    }).length;
  }

  get scheduleVisibilityScore() {
    if (!this.events.length) return 0;
    const datedWeight = (this.datedCount / this.events.length) * 55;
    const conflictPenalty = this.sameDayConflictCount * 8;
    const nextWeight = Math.min(20, this.next30DaysActiveCount * 5);
    return Math.max(10, Math.min(100, Math.round(datedWeight + nextWeight + 25 - conflictPenalty)));
  }

  get documentReadyEvents() {
    return this.events.filter((event) => event.status === 'ACTIVE' && !!event.date).length;
  }

  get documentReadyRate() {
    if (!this.events.length) return 0;
    return Math.round((this.documentReadyEvents / this.events.length) * 100);
  }

  get upcomingDrafts() {
    const now = Date.now();
    const end = now + 1000 * 60 * 60 * 24 * 45;
    return this.events.filter((event) => {
      if (event.status !== 'DRAFT' || !event.date) return false;
      const time = new Date(event.date).getTime();
      return time >= now && time <= end;
    });
  }

  get aiEventWorkloadLabel() {
    const load = this.activeCount + this.sameDayConflictCount + Math.ceil(this.events.length / 3);
    if (load >= 12) return 'Carga alta';
    if (load >= 6) return 'Carga media';
    return 'Carga controlada';
  }

  get aiEventsNarrative() {
    if (!this.events.length) return 'IA: crea 1-2 eventos y asigna fechas para activar la vista de agenda y progreso.';
    if (this.sameDayConflictCount) {
      return `IA: prioridad inmediata resolver ${this.sameDayConflictCount} conflicto(s) de fecha para evitar solapes operativos.`;
    }
    if (this.draftUndatedCount) {
      return `IA: hay ${this.draftUndatedCount} draft(s) sin fecha; asigna fecha para mejorar visibilidad y preparación de documentos.`;
    }
    if (this.documentReadyRate >= 60) {
      return 'IA: buena base de eventos listos para documentos. Próximo paso: estandarizar templates por tipo.';
    }
    return 'IA: activa más eventos con fecha para mejorar planificación y seguimiento semanal.';
  }

  get eventProgressHighlights() {
    const items: Array<{ title: string; detail: string }> = [];
    if (this.nextEvent?.title) {
      items.push({
        title: 'Proximo hito del pipeline',
        detail: `${this.nextEvent.title} · ${this.nextEventCountdown}. Recomendado revisar documentos y proveedores.`,
      });
    }
    if (this.upcomingDrafts.length) {
      items.push({
        title: 'Drafts cerca de ejecución',
        detail: `${this.upcomingDrafts.length} draft(s) tienen fecha próxima y conviene activar.`,
      });
    }
    if (this.documentReadyEvents) {
      items.push({
        title: 'Eventos listos para documentos',
        detail: `${this.documentReadyEvents} evento(s) activos con fecha pueden avanzar a Document Studio.`,
      });
    }
    if (!items.length && this.events.length) {
      items.push({
        title: 'Pipeline inicial creado',
        detail: 'Añade fechas y activa eventos para obtener recomendaciones más avanzadas.',
      });
    }
    return items.slice(0, 4);
  }

  get urgentEventsCount() {
    const now = Date.now();
    const limit = now + 1000 * 60 * 60 * 24 * 10;
    return this.events.filter((event) => {
      if (!event.date || event.status === 'ARCHIVED') return false;
      const time = new Date(event.date).getTime();
      return time >= now && time <= limit;
    }).length;
  }

  get deliveryBoardScore() {
    if (!this.events.length) return 0;
    const base =
      this.documentReadyRate * 0.45 +
      this.scheduleVisibilityScore * 0.35 +
      Math.max(0, 100 - this.draftUndatedCount * 12 - this.sameDayConflictCount * 14) * 0.2;
    return Math.max(10, Math.min(100, Math.round(base)));
  }

  get eventOpsBacklog() {
    const items: Array<{ title: string; detail: string }> = [];
    if (this.draftUndatedCount) {
      items.push({
        title: 'Drafts sin fecha',
        detail: `${this.draftUndatedCount} draft(s) sin fecha reducen visibilidad y preparacion documental.`,
      });
    }
    if (this.sameDayConflictCount) {
      items.push({
        title: 'Conflictos de agenda',
        detail: `${this.sameDayConflictCount} fecha(s) tienen solape de eventos.`,
      });
    }
    if (this.upcomingDrafts.length) {
      items.push({
        title: 'Drafts proximos sin activar',
        detail: `${this.upcomingDrafts.length} evento(s) con fecha cercana siguen en draft.`,
      });
    }
    if (this.documentReadyRate < 50 && this.events.length) {
      items.push({
        title: 'Baja disponibilidad documental',
        detail: 'Sube la tasa de eventos activos con fecha para generar documentos con menos friccion.',
      });
    }
    return items.slice(0, 5);
  }

  get executionModeLabel() {
    if (this.deliveryBoardScore >= 80) return 'Modo escalar';
    if (this.deliveryBoardScore >= 55) return 'Modo estabilizar';
    return 'Modo recuperacion';
  }

  get aiExecutionNarrative() {
    if (!this.events.length) {
      return 'IA: crea eventos y asigna fechas para activar el radar de ejecucion.';
    }
    if (this.eventOpsBacklog.length) {
      return `IA: prioridad actual: ${this.eventOpsBacklog[0].title.toLowerCase()}.`;
    }
    if (this.urgentEventsCount) {
      return 'IA: pipeline limpio. Recomendado preparar documentos y checklist de proveedores para eventos urgentes.';
    }
    return 'IA: estado estable. Puedes dedicar tiempo a mejorar templates y PDFs de cara a cliente.';
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
    if (this.sortMode === 'date') {
      data = [...data].sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    }

    return data;
  }

  get selectedCount() {
    return this.selectedEventIds.size;
  }

  get allFilteredSelected() {
    return !!this.filteredEvents.length && this.filteredEvents.every((event) => this.selectedEventIds.has(event.id));
  }

  get selectedEvents() {
    const ids = this.selectedEventIds;
    return this.events.filter((event) => ids.has(event.id));
  }

  get filteredDraftEvents() {
    return this.filteredEvents.filter((event) => event.status === 'DRAFT');
  }

  get filteredActiveEvents() {
    return this.filteredEvents.filter((event) => event.status === 'ACTIVE');
  }

  get filteredArchivedEvents() {
    return this.filteredEvents.filter((event) => event.status === 'ARCHIVED');
  }

  get filteredDatedCount() {
    return this.filteredEvents.filter((event) => !!event.date).length;
  }

  get filteredUrgentCount() {
    return this.filteredEvents.filter((event) => {
      const days = this.daysUntil(event);
      return days !== null && days >= 0 && days <= 10;
    }).length;
  }

  get plannerTimelineEvents() {
    const now = Date.now();
    const end = now + this.plannerHorizonDays * 24 * 60 * 60 * 1000;
    return this.filteredEvents
      .filter((event) => !!event.date)
      .map((event) => ({ event, time: new Date(event.date ?? '').getTime() }))
      .filter(({ time }) => Number.isFinite(time) && time >= now - 24 * 60 * 60 * 1000 && time <= end)
      .sort((a, b) => a.time - b.time);
  }

  get datedEvents() {
    return this.events
      .filter((event) => !!event.date)
      .sort((a, b) => (new Date(a.date ?? '').getTime() || 0) - (new Date(b.date ?? '').getTime() || 0));
  }

  get nextEvent() {
    const now = new Date();
    return this.datedEvents.find((event) => new Date(event.date ?? '') >= now);
  }

  get nextEventLabel() {
    if (!this.nextEvent?.date) return 'Sin evento proximo con fecha definida';
    return `${this.nextEvent.title} · ${new Date(this.nextEvent.date).toLocaleDateString('es-ES')}`;
  }

  get nextEventCountdown() {
    if (!this.nextEvent?.date) return 'Pendiente';
    const now = new Date();
    const date = new Date(this.nextEvent.date);
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Hoy';
    return `Faltan ${diff} dia(s)`;
  }

  get sameDayConflicts() {
    const map = new Map<string, string[]>();
    for (const event of this.events) {
      if (!event.date) continue;
      const key = event.date.slice(0, 10);
      const current = map.get(key) ?? [];
      current.push(event.title);
      map.set(key, current);
    }
    return [...map.entries()]
      .filter(([, titles]) => titles.length > 1)
      .map(([date, titles]) => ({ date, titles }))
      .slice(0, 5);
  }

  get sameDayConflictCount() {
    return this.sameDayConflicts.length;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.http.get<EventModel[]>('http://localhost:3000/api/v1/events').subscribe((data) => {
      this.events = data;
      this.pruneSelection();
    });
  }

  create() {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.http
      .post('http://localhost:3000/api/v1/events', {
        title: value.title,
        type: value.type,
        date: value.date || null,
      })
      .subscribe(() => {
      this.form.reset({ title: '', type: 'WEDDING', date: '' });
      this.load();
    });
  }

  setStatus(event: EventModel, status: EventStatus) {
    if (event.status === status) return;
    this.http
      .patch(`http://localhost:3000/api/v1/events/${event.id}`, { status })
      .subscribe(() => this.load());
  }

  goLiveToday(event: EventModel) {
    const today = new Date().toISOString().slice(0, 10);
    this.http
      .patch(`http://localhost:3000/api/v1/events/${event.id}`, { status: 'ACTIVE' as EventStatus, date: today })
      .subscribe(() => this.load());
  }

  quickFilter(status: EventStatus) {
    this.statusFilter = status;
  }

  setViewMode(mode: EventViewMode) {
    this.viewMode = mode;
  }

  isSelected(event: EventModel) {
    return this.selectedEventIds.has(event.id);
  }

  toggleEventSelection(event: EventModel) {
    if (this.selectedEventIds.has(event.id)) this.selectedEventIds.delete(event.id);
    else this.selectedEventIds.add(event.id);
    this.selectedEventIds = new Set(this.selectedEventIds);
  }

  startInlineEdit(event: EventModel) {
    this.editingEventId = event.id;
    this.quickEdit = {
      title: event.title,
      type: event.type,
      status: event.status,
      date: event.date ? event.date.slice(0, 10) : '',
    };
  }

  cancelInlineEdit() {
    this.editingEventId = null;
  }

  isEditing(event: EventModel) {
    return this.editingEventId === event.id;
  }

  saveInlineEdit(event: EventModel) {
    const title = this.quickEdit.title.trim();
    if (!title) {
      this.aiEventHint = 'El título del evento no puede estar vacío.';
      return;
    }
    this.http
      .patch(`http://localhost:3000/api/v1/events/${event.id}`, {
        title,
        type: this.quickEdit.type,
        status: this.quickEdit.status,
        date: this.quickEdit.date || null,
      })
      .subscribe(() => {
        this.editingEventId = null;
        this.aiEventHint = `Evento "${title}" actualizado.`;
        this.load();
      });
  }

  quickEventStatusCycle(event: EventModel) {
    const next: EventStatus =
      event.status === 'DRAFT' ? 'ACTIVE' : event.status === 'ACTIVE' ? 'ARCHIVED' : 'DRAFT';
    this.setStatus(event, next);
  }

  toggleSelectAllFiltered() {
    if (this.allFilteredSelected) {
      this.filteredEvents.forEach((event) => this.selectedEventIds.delete(event.id));
    } else {
      this.filteredEvents.forEach((event) => this.selectedEventIds.add(event.id));
    }
    this.selectedEventIds = new Set(this.selectedEventIds);
  }

  clearSelection() {
    this.selectedEventIds = new Set<string>();
  }

  private pruneSelection() {
    const valid = new Set(this.events.map((event) => event.id));
    const next = new Set<string>();
    this.selectedEventIds.forEach((id) => {
      if (valid.has(id)) next.add(id);
    });
    this.selectedEventIds = next;
  }

  activateDraftsBulk() {
    const drafts = this.events.filter((event) => event.status === 'DRAFT');
    if (!drafts.length) return;
    const requests = drafts.map((event) =>
      this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, { status: 'ACTIVE' as EventStatus }),
    );
    forkJoin(requests).subscribe(() => this.load());
  }

  renameEvent(event: EventModel) {
    const nextTitle = window.prompt('Nuevo nombre del evento', event.title)?.trim();
    if (!nextTitle || nextTitle === event.title) return;
    this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, { title: nextTitle }).subscribe(() => this.load());
  }

  setEventDate(event: EventModel) {
    const current = event.date ? event.date.slice(0, 10) : '';
    const next = window.prompt('Fecha del evento (YYYY-MM-DD)', current)?.trim();
    if (next === undefined || next === null) return;
    this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, { date: next || null }).subscribe(() => this.load());
  }

  duplicateEvent(event: EventModel) {
    this.http
      .post('http://localhost:3000/api/v1/events', {
        title: `${event.title} (copia)`,
        type: event.type,
        date: event.date ?? null,
      })
      .subscribe(() => this.load());
  }

  deleteEvent(event: EventModel) {
    if (!window.confirm(`Eliminar evento "${event.title}"?`)) return;
    this.http.delete(`http://localhost:3000/api/v1/events/${event.id}`).subscribe(() => this.load());
  }

  bulkSetStatus(status: EventStatus) {
    const selected = this.selectedEvents.filter((event) => event.status !== status);
    if (!selected.length) {
      this.aiEventHint = 'Selecciona eventos para aplicar estado en lote.';
      return;
    }
    forkJoin(
      selected.map((event) => this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, { status })),
    ).subscribe(() => {
      this.aiEventHint = `Lote: ${selected.length} evento(s) actualizado(s) a ${status}.`;
      this.clearSelection();
      this.load();
    });
  }

  bulkDeleteSelected() {
    const selected = this.selectedEvents;
    if (!selected.length) {
      this.aiEventHint = 'Selecciona eventos para eliminarlos en lote.';
      return;
    }
    if (!window.confirm(`Eliminar ${selected.length} evento(s) seleccionados?`)) return;
    forkJoin(selected.map((event) => this.http.delete(`http://localhost:3000/api/v1/events/${event.id}`))).subscribe(() => {
      this.aiEventHint = `Lote: ${selected.length} evento(s) eliminados.`;
      this.clearSelection();
      this.load();
    });
  }

  bulkDuplicateSelected() {
    const selected = this.selectedEvents;
    if (!selected.length) {
      this.aiEventHint = 'Selecciona eventos para duplicar.';
      return;
    }
    forkJoin(
      selected.map((event) =>
        this.http.post('http://localhost:3000/api/v1/events', {
          title: `${event.title} (copia)`,
          type: event.type,
          date: event.date ?? null,
        }),
      ),
    ).subscribe(() => {
      this.aiEventHint = `Lote: ${selected.length} evento(s) duplicados.`;
      this.load();
    });
  }

  bulkShiftSelectedDates(direction: 'forward' | 'backward') {
    const selected = this.selectedEvents.filter((event) => !!event.date);
    if (!selected.length) {
      this.aiEventHint = 'Selecciona eventos con fecha para moverlos en agenda.';
      return;
    }
    const delta = Math.max(1, Math.round(this.bulkShiftDays)) * (direction === 'forward' ? 1 : -1);
    forkJoin(
      selected.map((event) => {
        const date = new Date(event.date ?? '');
        date.setDate(date.getDate() + delta);
        return this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, { date: date.toISOString().slice(0, 10) });
      }),
    ).subscribe(() => {
      this.aiEventHint = `Lote: ${selected.length} fecha(s) movidas ${Math.abs(delta)} dia(s).`;
      this.load();
    });
  }

  bulkAssignDatesToSelected() {
    const selected = this.selectedEvents.filter((event) => !event.date);
    if (!selected.length) {
      this.aiEventHint = 'Selecciona eventos sin fecha para planificarlos.';
      return;
    }
    forkJoin(
      selected.map((event, index) => {
        const date = new Date();
        date.setDate(date.getDate() + 14 + index * 5);
        return this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, { date: date.toISOString().slice(0, 10) });
      }),
    ).subscribe(() => {
      this.aiEventHint = `IA planner: ${selected.length} evento(s) seleccionados recibieron fecha sugerida.`;
      this.load();
    });
  }

  createSeriesFromForm() {
    const value = this.form.getRawValue();
    if (!value.title?.trim()) {
      this.aiEventHint = 'Escribe un nombre base para crear una serie.';
      return;
    }
    const baseDate = value.date ? new Date(value.date) : new Date();
    const requests = Array.from({ length: 3 }).map((_, index) => {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + index * 7);
      return this.http.post('http://localhost:3000/api/v1/events', {
        title: `${value.title} · fase ${index + 1}`,
        type: value.type ?? 'WEDDING',
        date: date.toISOString().slice(0, 10),
      });
    });
    forkJoin(requests).subscribe(() => {
      this.aiEventHint = 'Serie operativa creada (3 eventos encadenados).';
      this.load();
    });
  }

  daysUntil(event: EventModel) {
    if (!event.date) return null;
    const today = new Date();
    const target = new Date(event.date);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  timelineTone(event: EventModel) {
    const days = this.daysUntil(event);
    if (days === null) return 'muted';
    if (days <= 0) return 'danger';
    if (days <= 10) return 'warn';
    if (days <= 30) return 'ok';
    return 'cool';
  }

  countdownLabel(event: EventModel) {
    const days = this.daysUntil(event);
    if (days === null) return 'Sin fecha';
    if (days === 0) return 'Hoy';
    if (days > 0) return `En ${days} día(s)`;
    return `Vencido hace ${Math.abs(days)} día(s)`;
  }

  createPresetEvent(mode: 'civil' | 'religiosa' | 'destino') {
    const now = new Date();
    const future = new Date(now.getFullYear(), now.getMonth() + 4, now.getDate());
    const isoDate = future.toISOString().slice(0, 10);
    const preset = {
      civil: { title: 'Boda civil premium', type: 'WEDDING' as EventType },
      religiosa: { title: 'Boda religiosa tradicional', type: 'WEDDING' as EventType },
      destino: { title: 'Boda destino experience', type: 'WEDDING' as EventType },
    }[mode];
    this.http
      .post('http://localhost:3000/api/v1/events', {
        title: preset.title,
        type: preset.type,
        date: isoDate,
      })
      .subscribe(() => this.load());
  }

  applyAiEventDraft() {
    const date = new Date();
    date.setMonth(date.getMonth() + 5);
    const titleBase =
      this.typeFilter === 'ALL'
        ? 'Boda premium experiencia 360'
        : this.typeFilter === 'WEDDING'
          ? 'Boda premium experiencia 360'
          : this.typeFilter === 'EVENT'
            ? 'Evento corporativo premium'
            : 'Evento especial custom';

    this.form.patchValue({
      title: `${titleBase} ${date.getFullYear()}`,
      type: this.typeFilter === 'ALL' ? 'WEDDING' : this.typeFilter,
      date: date.toISOString().slice(0, 10),
    });
    this.aiEventHint = 'IA: borrador generado. Revisa y pulsa Crear.';
  }

  aiAutoPlanDates() {
    const withoutDate = this.events.filter((event) => !event.date);
    if (!withoutDate.length) {
      this.aiEventHint = 'IA: todos los eventos ya tienen fecha.';
      return;
    }
    const requests = withoutDate.map((event, index) => {
      const date = new Date();
      date.setDate(date.getDate() + 21 + index * 7);
      return this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, { date: date.toISOString().slice(0, 10) });
    });
    forkJoin(requests).subscribe(() => {
      this.aiEventHint = `IA: ${withoutDate.length} evento(s) planificados con fecha sugerida.`;
      this.load();
    });
  }

  aiPolishAllEvents() {
    if (!this.events.length) {
      this.aiEventHint = 'IA: no hay eventos para mejorar.';
      return;
    }
    const requests = this.events.map((event) => {
      const cleanTitle = event.title.toLowerCase().includes('premium')
        ? event.title
        : `${event.title} · premium workflow`;
      const nextStatus: EventStatus = event.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';
      return this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, {
        title: cleanTitle,
        status: nextStatus,
      });
    });
    forkJoin(requests).subscribe(() => {
      this.aiEventHint = 'IA: eventos pulidos con naming profesional y estado optimizado.';
      this.load();
    });
  }

  aiResolveDateConflicts() {
    if (!this.sameDayConflicts.length) {
      this.aiEventHint = 'IA: no hay conflictos de fecha que resolver.';
      return;
    }
    const dateToEvents = new Map<string, EventModel[]>();
    for (const event of this.events) {
      if (!event.date) continue;
      const key = event.date.slice(0, 10);
      const bucket = dateToEvents.get(key) ?? [];
      bucket.push(event);
      dateToEvents.set(key, bucket);
    }
    const requests = [...dateToEvents.entries()].flatMap(([, grouped]) =>
      grouped.slice(1).map((event, index) => {
        const date = new Date(event.date ?? '');
        date.setDate(date.getDate() + (index + 1) * 2);
        return this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, {
          date: date.toISOString().slice(0, 10),
        });
      }),
    );
    if (!requests.length) return;
    forkJoin(requests).subscribe(() => {
      this.aiEventHint = 'IA: conflictos movidos a fechas cercanas sin solape.';
      this.load();
    });
  }

  aiPrepareWeekBoard() {
    const tasks: string[] = [];
    if (this.sameDayConflictCount) tasks.push(`resolver ${this.sameDayConflictCount} conflicto(s)`);
    if (this.draftUndatedCount) tasks.push(`asignar fecha a ${this.draftUndatedCount} draft(s)`);
    if (this.upcomingDrafts.length) tasks.push(`activar ${this.upcomingDrafts.length} draft(s) proximos`);
    if (!tasks.length) tasks.push('revisar eventos activos y preparar documentos de la semana');
    this.aiEventHint = `IA Week Board: ${tasks.join(' · ')}.`;
  }

  aiPrepareDocRun() {
    if (!this.events.length) {
      this.aiEventHint = 'IA Docs Run: crea al menos un evento para empezar.';
      return;
    }
    if (this.draftUndatedCount) {
      this.aiEventHint = `IA Docs Run: primero asigna fecha a ${this.draftUndatedCount} draft(s) para desbloquear documentos.`;
      return;
    }
    if (this.sameDayConflictCount) {
      this.aiEventHint = `IA Docs Run: resuelve ${this.sameDayConflictCount} conflicto(s) antes de exportar docs en lote.`;
      return;
    }
    this.aiEventHint = `IA Docs Run: ${this.documentReadyEvents} evento(s) listos para documentos. Revisa Templates para escoger el mejor pack.`;
  }

  aiBulkMarkUpcomingActive() {
    if (!this.upcomingDrafts.length) {
      this.aiEventHint = 'IA: no hay drafts próximos para activar.';
      return;
    }
    const requests = this.upcomingDrafts.map((event) =>
      this.http.patch(`http://localhost:3000/api/v1/events/${event.id}`, { status: 'ACTIVE' as EventStatus }),
    );
    forkJoin(requests).subscribe(() => {
      this.aiEventHint = `IA: ${this.upcomingDrafts.length} draft(s) próximos activados.`;
      this.load();
    });
  }

  aiBoostDocumentVisibility() {
    if (!this.events.length) {
      this.aiEventHint = 'IA: no hay eventos para mejorar visibilidad documental.';
      return;
    }
    const issues: string[] = [];
    if (this.draftUndatedCount) issues.push(`faltan fechas en ${this.draftUndatedCount} draft(s)`);
    if (this.sameDayConflictCount) issues.push(`hay ${this.sameDayConflictCount} conflicto(s)`);
    if (!issues.length) {
      this.aiEventHint = 'IA: vista de eventos limpia. Puedes pasar a documentos y seguimiento operativo.';
      return;
    }
    this.aiEventHint = `IA Visibilidad Docs: ${issues.join(' · ')}. Recomendado usar autoplanificar y resolver conflictos.`;
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

  exportEventsPdf() {
    openTemplatePdfPreview({
      title: 'Events Control Center',
      subtitle: 'Pipeline de eventos y estado operativo.',
      theme: 'events',
      meta: [
        { label: 'Total', value: this.events.length },
        { label: 'Activos', value: this.activeCount },
        { label: 'Draft', value: this.draftCount },
        { label: 'Pipeline', value: `${this.eventsScore}/100` },
      ],
      sections: this.filteredEvents.map((event) => ({
        title: event.title,
        description: `Tipo ${this.toLabel(event.type)} · Estado ${event.status}`,
        fields: [
          { label: 'Fecha', type: event.date ? event.date.slice(0, 10) : 'Sin fecha' },
          { label: 'Prioridad', type: event.status === 'ACTIVE' ? 'Alta' : 'Media' },
        ],
      })),
    });
  }
}
