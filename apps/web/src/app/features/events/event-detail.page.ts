import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DocumentModel, EventModel, TemplateModel, TemplateType } from '../../shared/models';

@Component({
  selector: 'app-event-detail-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <section class="event-detail-view">
      <header class="page-head">
        <div>
          <p class="kicker">Detalle</p>
          <h1>{{ event?.title || 'Event detail' }}</h1>
          <p class="muted-copy">{{ event?.type }} · {{ event?.status }} · documentacion operativa en vivo.</p>
        </div>
        <div class="head-stat">
          <span>Documentos</span>
          <strong>{{ documents.length }}</strong>
        </div>
      </header>

      <section class="panel-card">
        <div class="panel-head">
          <h3>Control rápido del evento</h3>
          <span class="muted-copy">Edita datos base y estado operativo desde aquí.</span>
        </div>
        <div class="event-docs-workbench__row">
          <input [(ngModel)]="eventQuickTitle" [ngModelOptions]="{ standalone: true }" placeholder="Nombre del evento" />
          <select [(ngModel)]="eventQuickStatus" [ngModelOptions]="{ standalone: true }">
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
          <input type="date" [(ngModel)]="eventQuickDate" [ngModelOptions]="{ standalone: true }" />
          <button type="button" class="ghost-btn" (click)="saveEventQuickEdit()" [disabled]="!event">Guardar evento</button>
          <button type="button" class="ghost-btn" (click)="activateEventNow()" [disabled]="!event">Activar hoy</button>
        </div>
      </section>

      <section class="insight-grid dashboard-kpis">
        <article class="insight-card">
          <p>Templates disponibles</p>
          <strong>{{ templates.length }}</strong>
        </article>
        <article class="insight-card">
          <p>Campos gestionados</p>
          <strong>{{ totalDocumentFields }}</strong>
        </article>
        <article class="insight-card">
          <p>Cobertura del evento</p>
          <strong>{{ eventCoverageLabel }}</strong>
        </article>
      </section>

      <section class="template-create">
        <div class="panel-head">
          <h3>Crear documento desde template</h3>
          <span class="muted-copy">Genera documentos premium por bloque funcional.</span>
        </div>
        <form [formGroup]="form" (ngSubmit)="createDocument()" class="inline-form">
          <select formControlName="templateId">
            <option *ngFor="let template of templates" [value]="template.id">{{ template.name }}</option>
          </select>
          <input formControlName="name" placeholder="Nombre documento" />
          <button type="submit" [disabled]="form.invalid">Crear documento</button>
        </form>

        <div class="template-suggestion-row" *ngIf="recommendedTemplates.length">
          <button
            type="button"
            class="ghost-btn"
            *ngFor="let template of recommendedTemplates"
            (click)="quickCreateFromTemplate(template)"
          >
            + {{ template.name }}
          </button>
        </div>

        <div class="event-docs-workbench">
          <div class="event-docs-workbench__row">
            <span class="workbench-pill">Core cubierto: {{ eventCoverageLabel }}</span>
            <span class="workbench-pill">Faltan: {{ missingCoreTemplates.length }}</span>
            <button
              type="button"
              class="ghost-btn"
              (click)="createRecommendedPack()"
              [disabled]="!missingCoreTemplates.length"
            >
              Crear pack core faltante
            </button>
          </div>
          <div class="template-suggestion-row" *ngIf="missingCoreTemplates.length">
            <span class="muted-copy">Bloques core pendientes:</span>
            <button type="button" class="ghost-btn" *ngFor="let type of missingCoreTemplates">
              {{ toLabel(type) }}
            </button>
          </div>
        </div>
      </section>

      <section class="template-library" *ngIf="documents.length">
        <div class="library-toolbar">
          <input [(ngModel)]="documentSearch" [ngModelOptions]="{ standalone: true }" placeholder="Buscar documento..." />
          <select [(ngModel)]="documentTypeFilter" [ngModelOptions]="{ standalone: true }">
            <option value="ALL">Todos tipos</option>
            <option *ngFor="let type of coreTemplateTypes" [value]="type">{{ toLabel(type) }}</option>
          </select>
          <select [(ngModel)]="documentSortMode" [ngModelOptions]="{ standalone: true }">
            <option value="recent">Recientes</option>
            <option value="name">Nombre</option>
            <option value="type">Tipo</option>
          </select>
          <span class="workbench-pill">Mostrando: {{ filteredDocuments.length }}</span>
        </div>
      </section>

      <section class="template-grid" *ngIf="documents.length && filteredDocuments.length; else emptyState">
        <article class="template-card interactive-card" *ngFor="let doc of filteredDocuments; trackBy: trackById">
          <div class="event-card-head">
            <p class="type-chip">{{ toLabel(doc.template.type) }}</p>
            <span class="status-pill is-active">Live</span>
          </div>
          <h3>{{ doc.name }}</h3>
          <p>{{ doc.template.name }}</p>
          <div class="detail-row">
            <span>Campos: <strong>{{ countFields(doc.template.schemaJson) }}</strong></span>
            <span *ngIf="doc.updatedAt">Actualizado: <strong>{{ doc.updatedAt | date: 'dd/MM HH:mm' }}</strong></span>
          </div>
          <div class="actions-row">
            <a [routerLink]="['/app/documents', doc.id]" class="ghost-btn action-link">Abrir editor</a>
          </div>
        </article>
      </section>

      <ng-template #emptyState>
        <section class="empty-state">
          <h3>Sin documentos aun</h3>
          <p>Usa un template para crear el primer documento de este evento.</p>
        </section>
      </ng-template>
    </section>
  `,
})
export class EventDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  eventId = '';
  event: EventModel | null = null;
  templates: TemplateModel[] = [];
  documents: DocumentModel[] = [];
  documentSearch = '';
  documentTypeFilter: TemplateType | 'ALL' = 'ALL';
  documentSortMode: 'recent' | 'name' | 'type' = 'recent';
  eventQuickTitle = '';
  eventQuickStatus: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' = 'DRAFT';
  eventQuickDate = '';

  readonly form = this.fb.group({
    templateId: ['', Validators.required],
    name: ['', Validators.required],
  });

  get totalDocumentFields() {
    return this.documents.reduce((acc, doc) => acc + this.countFields(doc.template.schemaJson), 0);
  }

  get eventCoverageLabel() {
    if (!this.templates.length) return '0/5';
    const present = new Set(this.documents.map((doc) => doc.template.type));
    const core: TemplateType[] = ['CHECKLIST', 'TIMELINE', 'BUDGET', 'GUEST_LIST', 'VENDOR_LIST'];
    const covered = core.filter((type) => present.has(type)).length;
    return `${covered}/${core.length}`;
  }

  get recommendedTemplates() {
    const covered = new Set(this.documents.map((doc) => doc.template.id));
    return this.templates.filter((template) => !covered.has(template.id)).slice(0, 4);
  }

  get coreTemplateTypes(): TemplateType[] {
    return ['CHECKLIST', 'TIMELINE', 'BUDGET', 'GUEST_LIST', 'VENDOR_LIST'];
  }

  get missingCoreTemplates() {
    const present = new Set(this.documents.map((doc) => doc.template.type));
    return this.coreTemplateTypes.filter((type) => !present.has(type));
  }

  get filteredDocuments() {
    const q = this.documentSearch.trim().toLowerCase();
    let data = this.documents.filter((doc) => {
      const typeOk = this.documentTypeFilter === 'ALL' ? true : doc.template.type === this.documentTypeFilter;
      const searchOk = q ? `${doc.name} ${doc.template.name} ${doc.template.type}`.toLowerCase().includes(q) : true;
      return typeOk && searchOk;
    });
    if (this.documentSortMode === 'name') data = [...data].sort((a, b) => a.name.localeCompare(b.name));
    if (this.documentSortMode === 'type') data = [...data].sort((a, b) => a.template.type.localeCompare(b.template.type));
    if (this.documentSortMode === 'recent') {
      data = [...data].sort(
        (a, b) =>
          (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0),
      );
    }
    return data;
  }

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadEvent();
    this.loadTemplates();
    this.loadDocuments();
  }

  loadEvent() {
    this.http.get<EventModel>(`http://localhost:3000/api/v1/events/${this.eventId}`).subscribe((data) => {
      this.event = data;
      this.eventQuickTitle = data.title;
      this.eventQuickStatus = data.status;
      this.eventQuickDate = data.date ? data.date.slice(0, 10) : '';
    });
  }

  loadTemplates() {
    this.http.get<TemplateModel[]>('http://localhost:3000/api/v1/templates').subscribe((data) => {
      this.templates = data;
      if (data.length && !this.form.value.templateId) {
        this.form.patchValue({ templateId: data[0].id });
      }
    });
  }

  loadDocuments() {
    this.http
      .get<DocumentModel[]>(`http://localhost:3000/api/v1/events/${this.eventId}/documents`)
      .subscribe((data) => (this.documents = data));
  }

  createDocument() {
    if (this.form.invalid) return;
    this.http
      .post(`http://localhost:3000/api/v1/events/${this.eventId}/documents`, this.form.getRawValue())
      .subscribe(() => {
        this.form.patchValue({ name: '' });
        this.loadDocuments();
      });
  }

  createRecommendedPack() {
    const targets = this.templates.filter((template) => this.missingCoreTemplates.includes(template.type)).slice(0, 5);
    if (!targets.length) return;
    const requests = targets.map((template) =>
      this.http.post(`http://localhost:3000/api/v1/events/${this.eventId}/documents`, {
        templateId: template.id,
        name: `${template.name} · ${this.event?.title ?? 'Evento'}`,
      }),
    );
    if (requests.length === 1) {
      requests[0].subscribe(() => this.loadDocuments());
      return;
    }
    forkJoin(requests).subscribe(() => this.loadDocuments());
  }

  quickCreateFromTemplate(template: TemplateModel) {
    const payload = {
      templateId: template.id,
      name: `${template.name} · ${this.event?.title ?? 'Evento'}`,
    };
    this.http
      .post(`http://localhost:3000/api/v1/events/${this.eventId}/documents`, payload)
      .subscribe(() => this.loadDocuments());
  }

  saveEventQuickEdit() {
    if (!this.event) return;
    const title = this.eventQuickTitle.trim();
    if (!title) return;
    this.http
      .patch<EventModel>(`http://localhost:3000/api/v1/events/${this.eventId}`, {
        title,
        status: this.eventQuickStatus,
        date: this.eventQuickDate || null,
      })
      .subscribe((updated) => {
        this.event = updated;
        this.eventQuickTitle = updated.title;
        this.eventQuickStatus = updated.status;
        this.eventQuickDate = updated.date ? updated.date.slice(0, 10) : '';
      });
  }

  activateEventNow() {
    if (!this.event) return;
    const today = new Date().toISOString().slice(0, 10);
    this.eventQuickStatus = 'ACTIVE';
    this.eventQuickDate = today;
    this.saveEventQuickEdit();
  }

  toLabel(value: string) {
    return value.replace('_', ' ');
  }

  countFields(schemaJson: Record<string, unknown>) {
    const sections =
      (schemaJson['sections'] as Array<{ fields?: Array<unknown> }> | undefined) ?? [];
    return sections.reduce((acc, section) => acc + (section.fields?.length ?? 0), 0);
  }

  trackById(_: number, item: DocumentModel) {
    return item.id;
  }
}
