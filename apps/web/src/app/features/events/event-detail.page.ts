import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DocumentModel, EventModel, TemplateModel } from '../../shared/models';

@Component({
  selector: 'app-event-detail-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <section class="event-detail-view">
      <header class="page-head">
        <div>
          <p class="kicker">Detalle</p>
          <h1>{{ event?.title || 'Event Detail' }}</h1>
          <p class="muted-copy">{{ event?.type }} · {{ event?.status }}</p>
        </div>
      </header>

      <section class="template-create">
        <h3>Crear documento desde template</h3>
        <form [formGroup]="form" (ngSubmit)="createDocument()" class="inline-form">
          <select formControlName="templateId">
            <option *ngFor="let template of templates" [value]="template.id">{{ template.name }}</option>
          </select>
          <input formControlName="name" placeholder="Nombre documento" />
          <button type="submit" [disabled]="form.invalid">Crear documento</button>
        </form>
      </section>

      <section class="template-grid" *ngIf="documents.length; else emptyState">
        <article class="template-card interactive-card" *ngFor="let doc of documents; trackBy: trackById">
          <p class="type-chip">{{ toLabel(doc.template.type) }}</p>
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

  readonly form = this.fb.group({
    templateId: ['', Validators.required],
    name: ['', Validators.required],
  });

  ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loadEvent();
    this.loadTemplates();
    this.loadDocuments();
  }

  loadEvent() {
    this.http.get<EventModel>(`http://localhost:3000/api/v1/events/${this.eventId}`).subscribe((data) => {
      this.event = data;
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
