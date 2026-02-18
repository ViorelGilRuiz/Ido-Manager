import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TemplateModel, TemplateType } from '../../shared/models';

type TemplateFieldType = 'text' | 'checkbox' | 'currency' | 'time' | 'number' | 'textarea' | 'date' | 'select';
type TemplateField = { key: string; label: string; type: TemplateFieldType; required?: boolean };
type TemplateSection = { title: string; description?: string; fields: TemplateField[] };
type CreatorTone = 'minimal' | 'balanced' | 'detailed';
type CreatorStep = 1 | 2 | 3;
type SortMode = 'recent' | 'name' | 'fields';
type TemplateAudience = 'planner' | 'client' | 'mixed';

type ExampleTemplate = {
  id: string;
  name: string;
  type: TemplateType;
  description: string;
  audience: TemplateAudience;
  highlights: string[];
  coverUrl: string;
  schemaJson: { version: number; sections: TemplateSection[] };
};

type PreviewDraft = {
  name: string;
  type: TemplateType;
  description: string;
  schemaJson: { version: number; sections: TemplateSection[] };
};

type BigPreview = {
  title: string;
  description: string;
  type: TemplateType;
  coverUrl: string;
  sections: TemplateSection[];
  audience: TemplateAudience;
};

@Component({
  selector: 'app-templates-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <section class="templates-view templates-canvas">
      <header class="page-head">
        <div>
          <p class="kicker">Template Studio</p>
          <h1>Diseno estilo Canva para wedding planner</h1>
          <p class="muted-copy">Plantillas visuales, preview grande y flujo completo para planner y cliente.</p>
        </div>
        <div class="head-stat">
          <span>Biblioteca</span>
          <strong>{{ templates.length }}</strong>
        </div>
      </header>

      <section class="template-create wizard-card canva-panel">
        <div class="panel-head">
          <h3>Crear template de principio a fin</h3>
          <span class="muted-copy">Paso {{ currentStep }} de 3</span>
        </div>

        <div class="preset-row">
          <button type="button" class="ghost-btn" (click)="applyPreset('planner')">Preset Wedding Planner Pro</button>
          <button type="button" class="ghost-btn" (click)="applyPreset('client')">Preset Cliente Premium</button>
          <button type="button" class="ghost-btn" (click)="applyPreset('mixed')">Preset Colaborativo</button>
        </div>

        <div class="wizard-progress">
          <button type="button" [class.is-current]="currentStep === 1" [class.is-done]="currentStep > 1" (click)="goStep(1)">1. Base</button>
          <button type="button" [class.is-current]="currentStep === 2" [class.is-done]="currentStep > 2" (click)="goStep(2)">2. Estructura</button>
          <button type="button" [class.is-current]="currentStep === 3" (click)="goStep(3)">3. Vista previa</button>
        </div>

        <form [formGroup]="creatorForm" class="creator-grid" *ngIf="currentStep === 1">
          <label>Nombre<input formControlName="name" placeholder="Ej: Wedding master control" /></label>
          <label>
            Tipo
            <select formControlName="type">
              <option *ngFor="let t of types" [value]="t">{{ toLabel(t) }}</option>
            </select>
          </label>
          <label>
            Nivel
            <select formControlName="tone">
              <option value="minimal">Minimal</option>
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
            </select>
          </label>
          <label>
            Audiencia
            <select formControlName="audience">
              <option value="planner">Wedding planner</option>
              <option value="client">Cliente final</option>
              <option value="mixed">Mixto</option>
            </select>
          </label>
          <label class="full-row">Descripcion<textarea formControlName="description" rows="2"></textarea></label>
        </form>

        <section class="builder-panel" *ngIf="currentStep === 2">
          <div class="panel-head">
            <h4>Estructura editable</h4>
            <button type="button" class="ghost-btn" (click)="addSection()">+ Seccion</button>
          </div>
          <div class="section-stack" *ngIf="draftSections.length">
            <article class="section-card" *ngFor="let section of draftSections; let si = index">
              <div class="panel-head">
                <input [(ngModel)]="section.title" [ngModelOptions]="{ standalone: true }" placeholder="Titulo seccion" />
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="moveSection(si, -1)" [disabled]="si===0">↑</button>
                  <button type="button" class="ghost-btn" (click)="moveSection(si, 1)" [disabled]="si===draftSections.length-1">↓</button>
                  <button type="button" class="ghost-btn" (click)="duplicateSection(si)">Dup</button>
                  <button type="button" class="ghost-btn" (click)="removeSection(si)">X</button>
                </div>
              </div>
              <input [(ngModel)]="section.description" [ngModelOptions]="{ standalone: true }" placeholder="Descripcion corta" />
              <div class="field-stack">
                <div class="field-row-builder" *ngFor="let field of section.fields; let fi = index">
                  <input [(ngModel)]="field.key" [ngModelOptions]="{ standalone: true }" placeholder="key" />
                  <input [(ngModel)]="field.label" [ngModelOptions]="{ standalone: true }" placeholder="label" />
                  <select [(ngModel)]="field.type" [ngModelOptions]="{ standalone: true }">
                    <option *ngFor="let ft of fieldTypes" [value]="ft">{{ ft }}</option>
                  </select>
                  <div class="tiny-actions">
                    <button type="button" class="ghost-btn" (click)="duplicateField(si, fi)">+</button>
                    <button type="button" class="ghost-btn" (click)="removeField(si, fi)">-</button>
                  </div>
                </div>
              </div>
              <button type="button" class="ghost-btn" (click)="addField(si)">+ Campo</button>
            </article>
          </div>
        </section>

        <section class="preview-builder" *ngIf="currentStep === 3 && previewDraft">
          <article class="template-card">
            <div class="cover-media cover-sm" [style.background-image]="coverForType(previewDraft.type)"></div>
            <p class="type-chip">{{ toLabel(previewDraft.type) }}</p>
            <h3>{{ previewDraft.name }}</h3>
            <p>{{ previewDraft.description || 'Sin descripcion' }}</p>
            <div class="detail-row">
              <span>Secciones: <strong>{{ previewDraft.schemaJson.sections.length }}</strong></span>
              <span>Campos: <strong>{{ countFields(previewDraft.schemaJson) }}</strong></span>
            </div>
            <div class="actions-row">
              <button type="button" class="ghost-btn" (click)="openBigPreviewFromDraft()">Ver en grande</button>
            </div>
          </article>
        </section>

        <div class="full-row actions-row wizard-actions">
          <button type="button" class="ghost-btn" *ngIf="currentStep > 1" (click)="prevStep()">Anterior</button>
          <button type="button" *ngIf="currentStep < 3" (click)="nextStep()">Continuar</button>
          <button type="button" *ngIf="currentStep === 3" (click)="createFromPreview()" [disabled]="creatingFromPreview || !previewDraft">
            {{ creatingFromPreview ? 'Creando...' : 'Crear template y editar' }}
          </button>
        </div>
      </section>

      <section class="examples-head">
        <h3>Plantillas completas para bodas</h3>
        <p>Incluyen necesidades reales para wedding planner y cliente final.</p>
      </section>

      <section class="gallery-grid">
        <article class="example-card canva-card interactive-card" *ngFor="let item of exampleTemplates; trackBy: trackByExampleId" (mousemove)="onCardPointerMove($event)" (mouseleave)="onCardPointerLeave($event)">
          <div class="cover-media" [style.background-image]="'linear-gradient(160deg, rgba(15,23,42,.32), rgba(15,118,110,.25)), url(' + item.coverUrl + ')'" ></div>
          <p class="type-chip">{{ toLabel(item.type) }} · {{ audienceLabel(item.audience) }}</p>
          <h4>{{ item.name }}</h4>
          <p>{{ item.description }}</p>
          <ul class="example-points">
            <li *ngFor="let point of item.highlights">{{ point }}</li>
          </ul>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="openBigPreviewFromExample(item)">Vista grande</button>
            <button type="button" class="ghost-btn" (click)="useExample(item)">Usar plantilla</button>
          </div>
        </article>
      </section>

      <section class="template-library" *ngIf="templates.length">
        <div class="panel-head">
          <h3>Tus templates</h3>
          <span class="muted-copy">{{ filteredTemplates.length }} visibles</span>
        </div>
        <div class="library-toolbar">
          <input [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" placeholder="Buscar por nombre o descripcion" />
          <select [(ngModel)]="typeFilter" (ngModelChange)="applyFilters()">
            <option value="ALL">Todos</option>
            <option *ngFor="let t of types" [value]="t">{{ toLabel(t) }}</option>
          </select>
          <select [(ngModel)]="sortMode" (ngModelChange)="applyFilters()">
            <option value="recent">Recientes</option>
            <option value="name">Nombre</option>
            <option value="fields">Mas campos</option>
          </select>
          <button type="button" class="ghost-btn" (click)="resetFilters()">Limpiar</button>
        </div>
      </section>

      <section class="template-grid" *ngIf="filteredTemplates.length; else emptyState">
        <article class="template-card interactive-card" *ngFor="let template of filteredTemplates; trackBy: trackById" (mousemove)="onCardPointerMove($event)" (mouseleave)="onCardPointerLeave($event)">
          <div class="cover-media cover-sm" [style.background-image]="coverForType(template.type)"></div>
          <p class="type-chip">{{ toLabel(template.type) }}</p>
          <h3>{{ template.name }}</h3>
          <p>{{ template.description || 'Template base listo para editar y extender por evento.' }}</p>
          <div class="detail-row">
            <span>Secciones: <strong>{{ countSections(template.schemaJson) }}</strong></span>
            <span>Campos: <strong>{{ countFields(template.schemaJson) }}</strong></span>
          </div>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="openBigPreviewFromTemplate(template)">Vista grande</button>
            <a [routerLink]="['/app/templates', template.id]" class="ghost-btn action-link">Editar</a>
            <button type="button" class="ghost-btn" (click)="duplicateTemplate(template)">Duplicar</button>
            <button type="button" class="ghost-btn danger-btn" (click)="deleteTemplate(template)">Eliminar</button>
          </div>
        </article>
      </section>

      <ng-template #emptyState>
        <section class="empty-state">
          <h3>Sin templates todavia</h3>
          <p>Crea uno con el wizard o usa una plantilla pro.</p>
        </section>
      </ng-template>
    </section>

    <div class="preview-modal" *ngIf="bigPreview" (click)="closeBigPreview()">
      <article class="preview-modal-card" (click)="$event.stopPropagation()">
        <button type="button" class="ghost-btn close-btn" (click)="closeBigPreview()">Cerrar</button>
        <div class="preview-hero" [style.background-image]="'linear-gradient(140deg, rgba(15,23,42,.35), rgba(14,116,144,.28)), url(' + bigPreview.coverUrl + ')'">
          <p class="type-chip">{{ toLabel(bigPreview.type) }} · {{ audienceLabel(bigPreview.audience) }}</p>
          <h2>{{ bigPreview.title }}</h2>
          <p>{{ bigPreview.description }}</p>
        </div>
        <div class="preview-modal-body">
          <article class="preview-section" *ngFor="let section of bigPreview.sections">
            <strong>{{ section.title }}</strong>
            <p *ngIf="section.description">{{ section.description }}</p>
            <ul>
              <li *ngFor="let field of section.fields">{{ field.label }} · {{ field.type }}</li>
            </ul>
          </article>
        </div>
      </article>
    </div>
  `,
})
export class TemplatesPageComponent {
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  creatingFromPreview = false;
  previewDraft: PreviewDraft | null = null;
  currentStep: CreatorStep = 1;
  bigPreview: BigPreview | null = null;

  searchTerm = '';
  typeFilter: 'ALL' | TemplateType = 'ALL';
  sortMode: SortMode = 'recent';

  types: TemplateType[] = ['CHECKLIST', 'TIMELINE', 'BUDGET', 'GUEST_LIST', 'VENDOR_LIST'];
  fieldTypes: TemplateFieldType[] = ['text', 'checkbox', 'currency', 'time', 'number', 'textarea', 'date', 'select'];
  templates: TemplateModel[] = [];
  filteredTemplates: TemplateModel[] = [];
  draftSections: TemplateSection[] = [];

  readonly creatorForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    type: ['CHECKLIST' as TemplateType, Validators.required],
    tone: ['balanced' as CreatorTone, Validators.required],
    audience: ['mixed' as TemplateAudience, Validators.required],
    description: [''],
  });

  readonly exampleTemplates: ExampleTemplate[] = [
    {
      id: 'planner-master',
      name: 'Wedding Planner Master Board',
      type: 'CHECKLIST',
      audience: 'planner',
      description: 'Operacion completa de boda: pre, dia B, post y seguimiento interno.',
      highlights: ['Roadmap por fases', 'Control de tareas con prioridad', 'Dependencias criticas'],
      coverUrl: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=70',
      schemaJson: { version: 1, sections: [
        this.section('Pre-boda', ['Kickoff con pareja', 'Moodboard y estilo', 'Reserva de venue', 'Plan B clima']),
        this.section('Dia B operativo', ['Cronograma staff', 'Check proveedores onsite', 'Kit emergencia', 'Cierre logistico']),
        this.section('Post-evento', ['Pagos finales', 'Encuesta cliente', 'Entrega de album', 'Lecciones aprendidas']),
      ] },
    },
    {
      id: 'client-portal',
      name: 'Portal Cliente Premium',
      type: 'CHECKLIST',
      audience: 'client',
      description: 'Experiencia guiada para novios: decisiones, aprobaciones y pendientes.',
      highlights: ['Tareas simplificadas', 'Fechas de decision', 'Checklist emocional y practica'],
      coverUrl: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1400&q=70',
      schemaJson: { version: 1, sections: [
        this.section('Decisiones clave', ['Estilo ceremonia', 'Menu final', 'Musica y momentos', 'Dress code invitados']),
        this.section('Documentacion', ['Contrato venue', 'Documentacion civil/religiosa', 'Seguro del evento']),
        this.section('Ultima semana', ['Confirmar asistentes', 'Pagos pendientes', 'Brief final con planner']),
      ] },
    },
    {
      id: 'timeline-pro',
      name: 'Timeline Dia B Cinematico',
      type: 'TIMELINE',
      audience: 'mixed',
      description: 'Minuto a minuto para ceremonia, cocktail, banquete, fiesta y desmontaje.',
      highlights: ['Bloques por hora', 'Responsable por hito', 'Checklist tecnico por tramo'],
      coverUrl: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1400&q=70',
      schemaJson: { version: 1, sections: [
        this.section('Morning prep', ['Maquillaje', 'Vestido', 'Foto detalles', 'Traslados']),
        this.section('Ceremonia + cocktail', ['Entrada', 'Lecturas', 'Salida', 'Recepcion invitados']),
        this.section('Banquete + fiesta', ['Entrada novios', 'Corte tarta', 'Primer baile', 'Cierre DJ']),
      ] },
    },
    {
      id: 'budget-360',
      name: 'Budget 360 Wedding',
      type: 'BUDGET',
      audience: 'mixed',
      description: 'Control financiero total: presupuesto base, contratos, pagos y desviaciones.',
      highlights: ['CAPEX por categoria', 'Estado de pago', 'Comparativa previsto vs real'],
      coverUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1400&q=70',
      schemaJson: { version: 1, sections: [
        this.section('Costes principales', ['Venue', 'Catering', 'Foto y video', 'Musica']),
        this.section('Costes experiencia', ['Decoracion', 'Flores', 'Papeleria', 'Regalos invitados']),
        this.section('Control financiero', ['Importe previsto', 'Importe real', 'Diferencia', 'Estado pago']),
      ] },
    },
    {
      id: 'guest-experience',
      name: 'Guest Experience & Seating',
      type: 'GUEST_LIST',
      audience: 'mixed',
      description: 'Gestion completa de invitados, mesas, alergias y experiencia personalizada.',
      highlights: ['RSVP segmentado', 'Asignacion de mesa', 'Alergias y observaciones'],
      coverUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=70',
      schemaJson: { version: 1, sections: [
        this.section('RSVP', ['Nombre', 'Asistencia', 'Numero acompanantes', 'Canal confirmacion']),
        this.section('Mesa y dieta', ['Mesa', 'Menu', 'Alergias', 'Restricciones']),
        this.section('Experiencia', ['Transfer', 'Hotel', 'Mensaje especial', 'Regalo personalizado']),
      ] },
    },
    {
      id: 'vendor-hub',
      name: 'Vendor Hub CRM',
      type: 'VENDOR_LIST',
      audience: 'planner',
      description: 'Panel de proveedores con contratos, contactos, SLA y estado de pago.',
      highlights: ['Ficha de proveedor', 'Checklist por proveedor', 'Riesgo y contingencia'],
      coverUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=70',
      schemaJson: { version: 1, sections: [
        this.section('Datos proveedor', ['Nombre', 'Servicio', 'Contacto', 'Canal urgente']),
        this.section('Contrato y entregables', ['Contrato firmado', 'Fecha entrega', 'Requisitos tecnicos', 'Notas']),
        this.section('Pagos y estado', ['Importe', 'Pagado', 'Pendiente', 'Incidencias']),
      ] },
    },
  ];

  ngOnInit() {
    this.load();
    this.rebuildSectionsFromForm();
    this.creatorForm.controls.type.valueChanges.subscribe(() => this.rebuildSectionsFromForm());
  }

  load() {
    this.http.get<TemplateModel[]>('http://localhost:3000/api/v1/templates').subscribe((data) => {
      this.templates = data;
      this.applyFilters();
    });
  }

  applyFilters() {
    const term = this.searchTerm.trim().toLowerCase();
    let data = [...this.templates];
    if (term) data = data.filter((item) => `${item.name} ${item.description ?? ''}`.toLowerCase().includes(term));
    if (this.typeFilter !== 'ALL') data = data.filter((item) => item.type === this.typeFilter);
    if (this.sortMode === 'name') data.sort((a, b) => a.name.localeCompare(b.name));
    if (this.sortMode === 'fields') data.sort((a, b) => this.countFields(b.schemaJson) - this.countFields(a.schemaJson));
    if (this.sortMode === 'recent') data.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    this.filteredTemplates = data;
  }

  resetFilters() {
    this.searchTerm = '';
    this.typeFilter = 'ALL';
    this.sortMode = 'recent';
    this.applyFilters();
  }

  applyPreset(audience: TemplateAudience) {
    if (audience === 'planner') {
      this.creatorForm.patchValue({ name: 'Planner Pro Board', type: 'CHECKLIST', tone: 'detailed', audience: 'planner', description: 'Control integral para wedding planner con enfoque operativo.' });
      this.draftSections = [
        this.section('Kickoff y concepto', ['Vision boda', 'Presupuesto inicial', 'Timeline macro', 'Propuesta valor']),
        this.section('Operacion', ['Plan proveedores', 'Control hitos', 'Checklist staff', 'Plan de riesgos']),
        this.section('Cierre', ['Pagos finales', 'Feedback cliente', 'Reporte final', 'Referidos']),
      ];
      return;
    }
    if (audience === 'client') {
      this.creatorForm.patchValue({ name: 'Cliente Wedding Journey', type: 'CHECKLIST', tone: 'balanced', audience: 'client', description: 'Recorrido claro para que la pareja tenga todo bajo control.' });
      this.draftSections = [
        this.section('Decisiones principales', ['Tipo ceremonia', 'Estilo boda', 'Lista invitados', 'Presupuesto objetivo']),
        this.section('Preparativos finales', ['Pruebas vestuario', 'Menu final', 'Musica seleccionada', 'Cronograma personal']),
      ];
      return;
    }
    this.creatorForm.patchValue({ name: 'Wedding Collaboration Suite', type: 'TIMELINE', tone: 'detailed', audience: 'mixed', description: 'Plantilla colaborativa para planner y cliente en un mismo sistema.' });
    this.draftSections = [
      this.section('Sprint pre-boda', ['Hitos semanales', 'Responsables', 'Dependencias', 'Fecha objetivo']),
      this.section('Dia B', ['Bloques horarios', 'Responsable bloque', 'Riesgo', 'Plan alternativo']),
      this.section('Post-boda', ['Entregables', 'Cierre financiero', 'Encuesta', 'Memoria de proyecto']),
    ];
  }

  goStep(step: CreatorStep) {
    if (step > this.currentStep && !this.validateCurrentStep()) return;
    if (step === 3) {
      this.generatePreview();
      if (!this.previewDraft) return;
    }
    this.currentStep = step;
  }

  nextStep() {
    if (!this.validateCurrentStep()) return;
    if (this.currentStep === 1) {
      this.rebuildSectionsFromForm();
      this.currentStep = 2;
      return;
    }
    this.generatePreview();
    if (!this.previewDraft) return;
    this.currentStep = 3;
  }

  prevStep() {
    if (this.currentStep > 1) this.currentStep = (this.currentStep - 1) as CreatorStep;
  }

  generatePreview() {
    if (this.creatorForm.invalid) {
      this.creatorForm.markAllAsTouched();
      return;
    }
    const value = this.creatorForm.getRawValue();
    this.previewDraft = {
      name: value.name ?? 'Nuevo template',
      type: value.type ?? 'CHECKLIST',
      description: value.description ?? '',
      schemaJson: { version: 1, sections: this.normalizeSections(this.draftSections) },
    };
  }

  createFromPreview() {
    if (!this.previewDraft) return;
    this.creatingFromPreview = true;
    this.http.post<TemplateModel>('http://localhost:3000/api/v1/templates', {
      name: this.previewDraft.name,
      type: this.previewDraft.type,
      description: this.previewDraft.description,
      schemaJson: this.previewDraft.schemaJson,
    }).subscribe({
      next: (created) => {
        this.creatingFromPreview = false;
        this.load();
        this.router.navigate(['/app/templates', created.id]);
      },
      error: () => (this.creatingFromPreview = false),
    });
  }

  useExample(example: ExampleTemplate) {
    this.http.post<TemplateModel>('http://localhost:3000/api/v1/templates', {
      name: example.name,
      type: example.type,
      description: example.description,
      schemaJson: example.schemaJson,
    }).subscribe((created) => {
      this.load();
      this.router.navigate(['/app/templates', created.id]);
    });
  }

  addSection() { this.draftSections.push({ title: 'Nueva seccion', fields: [{ key: 'campo_1', label: 'Campo', type: 'text' }] }); }
  duplicateSection(index: number) {
    const clone = structuredClone(this.draftSections[index]);
    clone.title = `${clone.title} copia`;
    this.draftSections.splice(index + 1, 0, clone);
  }
  moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= this.draftSections.length) return;
    const [item] = this.draftSections.splice(index, 1);
    this.draftSections.splice(target, 0, item);
  }
  removeSection(index: number) { this.draftSections.splice(index, 1); }
  addField(sectionIndex: number) { this.draftSections[sectionIndex].fields.push({ key: `campo_${this.draftSections[sectionIndex].fields.length + 1}`, label: 'Campo', type: 'text' }); }
  duplicateField(sectionIndex: number, fieldIndex: number) {
    const clone = structuredClone(this.draftSections[sectionIndex].fields[fieldIndex]);
    clone.key = `${clone.key}_copy`;
    this.draftSections[sectionIndex].fields.splice(fieldIndex + 1, 0, clone);
  }
  removeField(sectionIndex: number, fieldIndex: number) { this.draftSections[sectionIndex].fields.splice(fieldIndex, 1); }

  duplicateTemplate(template: TemplateModel) {
    this.http.post<TemplateModel>('http://localhost:3000/api/v1/templates', {
      name: `${template.name} (copia)`, type: template.type, description: template.description, schemaJson: template.schemaJson,
    }).subscribe(() => this.load());
  }

  deleteTemplate(template: TemplateModel) {
    if (!window.confirm(`Eliminar template "${template.name}"?`)) return;
    this.http.delete(`http://localhost:3000/api/v1/templates/${template.id}`).subscribe(() => this.load());
  }

  openBigPreviewFromExample(item: ExampleTemplate) {
    this.bigPreview = { title: item.name, description: item.description, type: item.type, coverUrl: item.coverUrl, sections: item.schemaJson.sections, audience: item.audience };
  }

  openBigPreviewFromTemplate(template: TemplateModel) {
    this.bigPreview = {
      title: template.name,
      description: template.description ?? 'Plantilla creada en tu biblioteca.',
      type: template.type,
      coverUrl: this.coverRaw(template.type),
      sections: this.getSections(template.schemaJson),
      audience: 'mixed',
    };
  }

  openBigPreviewFromDraft() {
    if (!this.previewDraft) return;
    this.bigPreview = {
      title: this.previewDraft.name,
      description: this.previewDraft.description || 'Vista previa de template en creacion.',
      type: this.previewDraft.type,
      coverUrl: this.coverRaw(this.previewDraft.type),
      sections: this.previewDraft.schemaJson.sections,
      audience: this.creatorForm.value.audience ?? 'mixed',
    };
  }

  closeBigPreview() { this.bigPreview = null; }

  audienceLabel(audience: TemplateAudience) {
    if (audience === 'planner') return 'Planner';
    if (audience === 'client') return 'Cliente';
    return 'Mixto';
  }

  coverForType(type: TemplateType) {
    return `linear-gradient(150deg, rgba(15,23,42,.36), rgba(15,118,110,.24)), url(${this.coverRaw(type)})`;
  }

  countFields(schemaJson: Record<string, unknown> | { sections: TemplateSection[] }) {
    const sections = (schemaJson['sections'] as Array<{ fields?: Array<unknown> }> | undefined) ?? [];
    return sections.reduce((acc, section) => acc + (section.fields?.length ?? 0), 0);
  }
  countSections(schemaJson: Record<string, unknown>) {
    const sections = (schemaJson['sections'] as Array<unknown> | undefined) ?? [];
    return sections.length;
  }
  getSections(schemaJson: Record<string, unknown>) { return (schemaJson['sections'] as TemplateSection[] | undefined) ?? []; }
  toLabel(type: TemplateType) { return type.replace('_', ' '); }

  onCardPointerMove(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    card.style.setProperty('--mx', `${px * 100}%`);
    card.style.setProperty('--my', `${py * 100}%`);
    card.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
    card.style.setProperty('--ry', `${(px - 0.5) * 10}deg`);
  }

  onCardPointerLeave(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement;
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '50%');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  }

  trackById(_: number, item: TemplateModel) { return item.id; }
  trackByExampleId(_: number, item: ExampleTemplate) { return item.id; }

  private validateCurrentStep() {
    if (this.currentStep === 1) {
      if (this.creatorForm.invalid) { this.creatorForm.markAllAsTouched(); return false; }
      return true;
    }
    return this.draftSections.length > 0;
  }

  private rebuildSectionsFromForm() {
    const tone = this.creatorForm.value.tone ?? 'balanced';
    const selected = this.creatorForm.value.type ?? 'CHECKLIST';
    const block: Record<TemplateType, 'checklist' | 'timeline' | 'budget' | 'guests' | 'vendors'> = {
      CHECKLIST: 'checklist', TIMELINE: 'timeline', BUDGET: 'budget', GUEST_LIST: 'guests', VENDOR_LIST: 'vendors',
    };
    this.draftSections = [{ title: this.toLabel(selected), description: 'Base editable', fields: this.buildFields(block[selected], tone) }];
  }

  private normalizeSections(sections: TemplateSection[]) {
    return sections.map((section, sectionIndex) => ({
      title: section.title?.trim() || `Seccion ${sectionIndex + 1}`,
      description: section.description?.trim() || '',
      fields: section.fields.filter((field) => field.key.trim() && field.label.trim()).map((field) => ({ ...field, key: field.key.trim(), label: field.label.trim() })),
    }));
  }

  private section(title: string, fields: string[]): TemplateSection {
    return {
      title,
      description: 'Bloque recomendado para boda',
      fields: fields.map((label, index) => ({
        key: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${index + 1}`,
        label,
        type: index % 2 === 0 ? 'text' : 'checkbox',
      })),
    };
  }

  private coverRaw(type: TemplateType) {
    if (type === 'TIMELINE') return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=70';
    if (type === 'BUDGET') return 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1400&q=70';
    if (type === 'GUEST_LIST') return 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1400&q=70';
    if (type === 'VENDOR_LIST') return 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=70';
    return 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=70';
  }

  private buildFields(block: 'checklist' | 'timeline' | 'budget' | 'guests' | 'vendors', tone: CreatorTone): TemplateField[] {
    const base: Record<typeof block, TemplateField[]> = {
      checklist: [
        { key: 'tarea', label: 'Tarea principal', type: 'checkbox' },
        { key: 'responsable', label: 'Responsable', type: 'text' },
        { key: 'fecha_objetivo', label: 'Fecha objetivo', type: 'date' },
        { key: 'notas', label: 'Notas', type: 'textarea' },
      ],
      timeline: [
        { key: 'hito', label: 'Hito', type: 'text' },
        { key: 'hora', label: 'Hora', type: 'time' },
        { key: 'duracion', label: 'Duracion', type: 'number' },
        { key: 'owner', label: 'Responsable', type: 'text' },
      ],
      budget: [
        { key: 'partida', label: 'Partida', type: 'text' },
        { key: 'estimado', label: 'Estimado', type: 'currency' },
        { key: 'real', label: 'Real', type: 'currency' },
        { key: 'pago', label: 'Estado pago', type: 'select' },
      ],
      guests: [
        { key: 'nombre', label: 'Nombre', type: 'text' },
        { key: 'mesa', label: 'Mesa', type: 'text' },
        { key: 'confirmado', label: 'Confirmado', type: 'checkbox' },
        { key: 'alergias', label: 'Alergias', type: 'text' },
      ],
      vendors: [
        { key: 'proveedor', label: 'Proveedor', type: 'text' },
        { key: 'servicio', label: 'Servicio', type: 'text' },
        { key: 'contacto', label: 'Contacto', type: 'text' },
        { key: 'pago', label: 'Estado pago', type: 'select' },
      ],
    };
    const takeCount = tone === 'minimal' ? 2 : tone === 'balanced' ? 3 : 4;
    return base[block].slice(0, takeCount);
  }
}
