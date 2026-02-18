import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { TemplateModel, TemplateType } from '../../shared/models';

type TemplateField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
};

type TemplateSection = {
  title: string;
  description?: string;
  fields: TemplateField[];
};

type PreviewMode = 'schema' | 'filled';
type TemplatePhase = 'PRE_BODA' | 'DIA_B' | 'POST_BODA';
type FeaturedTemplate = {
  id: string;
  name: string;
  type: TemplateType;
  description: string;
  cover: string;
  sections: TemplateSection[];
};

type ValidationIssue = {
  type: 'error' | 'warning';
  message: string;
};

type PreviewPersona = 'planner' | 'client';

@Component({
  selector: 'app-template-editor-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="template-editor-view template-editor-pro editor-v2" *ngIf="loaded; else loadingTpl">
      <header class="editor-topbar-v2">
        <div class="editor-title-block">
          <p class="kicker">Editor</p>
          <h1>Diseno de template</h1>
          <p class="muted-copy">Workbench profesional: edicion, validacion y preview en vivo.</p>
        </div>

        <section class="kpi-inline">
          <article class="insight-card mini">
            <p>Secciones</p>
            <strong>{{ sections.length }}</strong>
          </article>
          <article class="insight-card mini">
            <p>Campos</p>
            <strong>{{ totalFields }}</strong>
          </article>
          <article class="insight-card mini">
            <p>Req</p>
            <strong>{{ requiredFields }}</strong>
          </article>
        </section>

        <div class="editor-head-actions">
          <div class="segmented-control">
            <button type="button" class="ghost-btn" [class.is-active]="previewDevice === 'desktop'" (click)="previewDevice = 'desktop'">Desktop</button>
            <button type="button" class="ghost-btn" [class.is-active]="previewDevice === 'mobile'" (click)="previewDevice = 'mobile'">Mobile</button>
          </div>
          <div class="segmented-control">
            <button type="button" class="ghost-btn" [class.is-active]="previewMode === 'schema'" (click)="previewMode = 'schema'">Schema</button>
            <button type="button" class="ghost-btn" [class.is-active]="previewMode === 'filled'" (click)="previewMode = 'filled'">Filled</button>
          </div>
          <button type="button" class="ghost-btn" (click)="undo()" [disabled]="!canUndo">Undo</button>
          <button type="button" class="ghost-btn" (click)="redo()" [disabled]="!canRedo">Redo</button>
          <button type="button" (click)="save()" [disabled]="saving">{{ saving ? 'Guardando...' : 'Guardar' }}</button>
          <a routerLink="/app/templates" class="ghost-btn action-link">Volver</a>
          <div class="head-stat editor-status" [class.warn]="hasPendingChanges">
            <span>{{ hasPendingChanges ? 'Pendiente' : 'Estado' }}</span>
            <strong>{{ hasPendingChanges ? 'Sin guardar' : 'Al dia' }}</strong>
          </div>
        </div>
      </header>

      <section class="editor-workbench">
        <article class="panel-card editor-meta-card scroll-panel">
          <h3>Metadatos</h3>
          <div class="meta-form">
            <label>Nombre<input [(ngModel)]="draftName" (ngModelChange)="onDraftChange()" /></label>
            <label>
              Tipo
              <select [(ngModel)]="draftType" (ngModelChange)="onDraftChange()">
                <option *ngFor="let t of types" [value]="t">{{ toLabel(t) }}</option>
              </select>
            </label>
            <label>Descripcion<textarea [(ngModel)]="draftDescription" rows="3" (ngModelChange)="onDraftChange()"></textarea></label>
          </div>
          <div class="meta-inline-grid">
            <label>
              Fase
              <select [(ngModel)]="templatePhase" (ngModelChange)="onDraftChange()">
                <option value="PRE_BODA">Pre-boda</option>
                <option value="DIA_B">Dia B</option>
                <option value="POST_BODA">Post-boda</option>
              </select>
            </label>
            <label>
              Tiempo estimado (min)
              <input type="number" min="15" step="15" [(ngModel)]="estimatedMinutes" (ngModelChange)="onDraftChange()" />
            </label>
          </div>
          <label class="meta-tags">
            Tags (coma separada)
            <input [(ngModel)]="tagsInput" (ngModelChange)="onDraftChange()" placeholder="boda, premium, checklist" />
          </label>
          <div class="meta-toggle-grid">
            <label class="small-check"><input type="checkbox" [(ngModel)]="enableBudgetAlerts" (ngModelChange)="onDraftChange()" /> Alertas presupuesto</label>
            <label class="small-check"><input type="checkbox" [(ngModel)]="enableGuestCare" (ngModelChange)="onDraftChange()" /> Control experiencia invitado</label>
            <label class="small-check"><input type="checkbox" [(ngModel)]="enableVendorOps" (ngModelChange)="onDraftChange()" /> Seguimiento proveedores</label>
          </div>
          <div class="meta-actions">
            <button type="button" class="ghost-btn" (click)="saveAsCopy()">Guardar como copia</button>
            <button type="button" class="ghost-btn" (click)="addBundle('plannerCore')">Bundle planner core</button>
            <button type="button" class="ghost-btn" (click)="addBundle('dayB')">Bundle dia B</button>
            <button type="button" class="ghost-btn" (click)="addBundle('clientJourney')">Bundle cliente</button>
          </div>
          <section class="quality-panel">
            <div class="panel-head">
              <h4>Validacion inteligente</h4>
              <strong>{{ completenessScore }}/100</strong>
            </div>
            <ul *ngIf="validationIssues.length; else okValidation">
              <li *ngFor="let issue of validationIssues" [class.warn]="issue.type === 'warning'">
                {{ issue.message }}
              </li>
            </ul>
            <ng-template #okValidation>
              <p class="muted-copy">Estructura limpia. Lista para usar por planner y cliente.</p>
            </ng-template>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="normalizeFieldKeys()">Normalizar keys</button>
              <button type="button" class="ghost-btn" (click)="removeEmptyFields()">Limpiar vacios</button>
            </div>
          </section>
        </article>

        <article class="panel-card editor-structure-card scroll-panel">
          <div class="panel-head">
            <h3>Estructura</h3>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="expandAllSections()">Expandir</button>
              <button type="button" class="ghost-btn" (click)="collapseAllSections()">Colapsar</button>
              <button type="button" class="ghost-btn" (click)="addSection()">+ Seccion</button>
            </div>
          </div>
          <div class="planner-toolkit">
            <p class="muted-copy">Bloques wedding pro</p>
            <div class="block-chip-grid">
              <button type="button" class="ghost-btn" *ngFor="let block of weddingBlockCatalog" (click)="addWeddingBlock(block)">
                + {{ block }}
              </button>
            </div>
          </div>

          <section class="section-stack" *ngIf="sections.length; else noSections">
            <article class="section-card" *ngFor="let section of sections; let si = index">
              <div class="panel-head">
                <div class="section-head-main">
                  <input [(ngModel)]="section.title" (ngModelChange)="onDraftChange()" placeholder="Titulo" />
                  <span class="section-field-count">{{ section.fields.length }} campos</span>
                </div>
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="toggleSection(si)">{{ isSectionCollapsed(si) ? 'Abrir' : 'Ocultar' }}</button>
                  <button type="button" class="ghost-btn" (click)="moveSection(si, -1)" [disabled]="si===0">↑</button>
                  <button type="button" class="ghost-btn" (click)="moveSection(si, 1)" [disabled]="si===sections.length-1">↓</button>
                  <button type="button" class="ghost-btn" (click)="duplicateSection(si)">Dup</button>
                  <button type="button" class="ghost-btn" (click)="removeSection(si)">X</button>
                </div>
              </div>
              <input class="section-description-input" [(ngModel)]="section.description" (ngModelChange)="onDraftChange()" placeholder="Descripcion corta de la seccion" />

              <div class="field-stack" *ngIf="!isSectionCollapsed(si)">
                <div class="field-row-builder" *ngFor="let field of section.fields; let fi = index">
                  <input [(ngModel)]="field.key" (ngModelChange)="onDraftChange()" placeholder="key" />
                  <input [(ngModel)]="field.label" (ngModelChange)="onDraftChange()" placeholder="label" />
                  <select [(ngModel)]="field.type" (ngModelChange)="onDraftChange()">
                    <option *ngFor="let ft of fieldTypes" [value]="ft">{{ ft }}</option>
                  </select>
                  <label class="small-check">
                    <input type="checkbox" [(ngModel)]="field.required" (ngModelChange)="onDraftChange()" />
                    req
                  </label>
                  <div class="tiny-actions">
                    <button type="button" class="ghost-btn" (click)="moveField(si, fi, -1)" [disabled]="fi===0">↑</button>
                    <button type="button" class="ghost-btn" (click)="moveField(si, fi, 1)" [disabled]="fi===section.fields.length-1">↓</button>
                    <button type="button" class="ghost-btn" (click)="duplicateField(si, fi)">+</button>
                    <button type="button" class="ghost-btn" (click)="removeField(si, fi)">-</button>
                  </div>
                </div>
              </div>

              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="addField(si)">+ Campo</button>
                <button type="button" class="ghost-btn" (click)="addFieldByType(si, 'checkbox')">+ Checkbox</button>
                <button type="button" class="ghost-btn" (click)="addFieldByType(si, 'date')">+ Date</button>
                <button type="button" class="ghost-btn" (click)="addFieldByType(si, 'currency')">+ Currency</button>
                <button type="button" class="ghost-btn" (click)="addOperationalPack(si)">+ Pack ops</button>
              </div>
            </article>
          </section>

          <ng-template #noSections>
            <p class="muted-copy">Aun no hay secciones.</p>
          </ng-template>
        </article>

        <article class="panel-card editor-preview-card scroll-panel">
          <div class="panel-head">
            <h3>Preview en vivo</h3>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="openPreviewCanvas()">Vista grande</button>
              <span class="live-pill" [class.is-on]="previewPulse">{{ previewPulse ? 'Actualizando' : 'Live' }}</span>
            </div>
          </div>
          <input class="preview-search" [(ngModel)]="previewQuery" placeholder="Filtrar secciones o campos en preview..." />
          <p class="muted-copy" *ngIf="missingCoreBlocks.length">Bloques recomendados faltantes: {{ missingCoreBlocks.join(', ') }}</p>
          <label class="preview-progress-control">
            Simular avance operativo {{ previewCompletion }}%
            <input type="range" min="0" max="100" step="5" [(ngModel)]="previewCompletion" />
          </label>
          <div class="segmented-control">
            <button type="button" class="ghost-btn" [class.is-active]="previewPersona === 'planner'" (click)="previewPersona = 'planner'">
              Vista planner
            </button>
            <button type="button" class="ghost-btn" [class.is-active]="previewPersona === 'client'" (click)="previewPersona = 'client'">
              Vista cliente
            </button>
          </div>
          <div class="preview-health-row">
            <span>Campos obligatorios: <strong>{{ requiredFields }}</strong></span>
            <span>Preparacion negocio: <strong>{{ businessReadinessLabel }}</strong></span>
            <span>Perfil: <strong>{{ previewPersona === 'planner' ? 'Planner' : 'Cliente' }}</strong></span>
          </div>
          <div
            class="preview-viewport mirror-3d"
            [class.is-mobile]="previewDevice === 'mobile'"
            [class.is-live]="previewPulse"
            (mousemove)="onMirrorMove($event)"
            (mouseleave)="onMirrorLeave($event)"
          >
            <div class="preview-stack preview-stack-rich" *ngIf="filteredPreviewSections.length; else emptyPreviewFiltered">
              <article class="preview-section preview-card" *ngFor="let section of filteredPreviewSections; let i = index" [style.animation-delay.ms]="40 * i">
              <div class="preview-section-head">
                <strong>{{ section.title || 'Seccion sin titulo' }}</strong>
                <span>{{ section.fields.length }} campos</span>
              </div>
              <p *ngIf="section.description">{{ section.description }}</p>
                <div class="preview-field-list">
                <div class="preview-field-row" *ngFor="let field of section.fields; let fi = index">
                  <label>{{ field.label || 'Campo' }}</label>
                  <ng-container [ngSwitch]="previewMode">
                    <div *ngSwitchCase="'schema'" class="preview-field-sim" [ngClass]="'is-' + field.type">
                      <span *ngIf="field.type === 'checkbox'" class="preview-checkmark"></span>
                      <span *ngIf="field.type !== 'checkbox'">{{ field.type }}</span>
                    </div>
                    <div *ngSwitchDefault class="preview-field-live" [ngSwitch]="field.type">
                      <label *ngSwitchCase="'checkbox'" class="preview-checkbox-live">
                        <input type="checkbox" [checked]="isFieldMarkedComplete(i, fi)" />
                        <span>Completado</span>
                      </label>
                      <input *ngSwitchCase="'date'" type="date" [value]="sampleDateValue(i, fi)" />
                      <input *ngSwitchCase="'time'" type="time" [value]="sampleTimeValue(i, fi)" />
                      <input *ngSwitchCase="'number'" type="number" [value]="sampleNumberValue(i, fi)" />
                      <input *ngSwitchCase="'currency'" type="text" [value]="sampleCurrencyValue(i, fi)" />
                      <select *ngSwitchCase="'select'">
                        <option>{{ previewPersona === 'planner' ? 'Pendiente' : 'Por revisar' }}</option>
                        <option selected>{{ previewPersona === 'planner' ? 'Aprobado' : 'Confirmado' }}</option>
                      </select>
                      <textarea *ngSwitchCase="'textarea'" rows="2">{{ sampleTextValue(i, fi, true) }}</textarea>
                      <input *ngSwitchDefault type="text" [value]="sampleTextValue(i, fi)" />
                    </div>
                  </ng-container>
                </div>
                </div>
              </article>
            </div>
            <ng-template #emptyPreviewFiltered>
              <section class="empty-state compact-empty">
                <h3>Sin resultados</h3>
                <p>Ajusta el filtro o edita la estructura.</p>
              </section>
            </ng-template>
          </div>
        </article>
      </section>
    </section>

    <div class="canvas-preview-modal" *ngIf="showPreviewCanvas" (click)="closePreviewCanvas()">
      <section class="canvas-preview-shell" (click)="$event.stopPropagation()">
        <header class="canvas-preview-head">
          <div>
            <p class="kicker">Preview Studio</p>
            <h2>{{ draftName }}</h2>
            <p class="muted-copy">{{ draftDescription || 'Vista premium de tu plantilla.' }}</p>
          </div>
          <div class="tiny-actions">
            <button type="button" class="ghost-btn" (click)="showCatalogView = !showCatalogView">
              {{ showCatalogView ? 'Volver a preview' : 'Ver mas plantillas' }}
            </button>
            <button type="button" class="ghost-btn" (click)="closePreviewCanvas()">Cerrar</button>
          </div>
        </header>

        <section class="canvas-stage" *ngIf="!showCatalogView; else catalogTpl">
          <article class="canvas-main-card">
            <div class="canvas-hero" [style.background-image]="canvasCover">
              <span class="type-chip">{{ toLabel(draftType) }}</span>
              <strong>{{ sections.length }} secciones</strong>
            </div>
            <div class="canvas-body">
              <article class="canvas-section-card" *ngFor="let section of filteredPreviewSections">
                <header>
                  <h4>{{ section.title }}</h4>
                  <span>{{ section.fields.length }} campos</span>
                </header>
                <p *ngIf="section.description">{{ section.description }}</p>
                <div class="canvas-field-grid">
                  <label *ngFor="let field of section.fields">{{ field.label }}</label>
                </div>
              </article>
            </div>
          </article>
          <aside class="canvas-side-panel">
            <h4>Atajos</h4>
            <button type="button" class="ghost-btn" (click)="previewMode = previewMode === 'schema' ? 'filled' : 'schema'">
              Modo: {{ previewMode === 'schema' ? 'Schema' : 'Filled' }}
            </button>
            <button type="button" class="ghost-btn" (click)="collapseAllSections()">Colapsar todo</button>
            <button type="button" class="ghost-btn" (click)="expandAllSections()">Expandir todo</button>
            <button type="button" class="ghost-btn" (click)="save()">Guardar cambios</button>
          </aside>
        </section>

        <ng-template #catalogTpl>
          <section class="canvas-catalog">
            <article class="canvas-catalog-card interactive-card" *ngFor="let item of featuredTemplates">
              <div class="catalog-cover" [style.background-image]="'linear-gradient(160deg, rgba(15,23,42,.35), rgba(14,116,144,.2)), url(' + item.cover + ')'"></div>
              <h4>{{ item.name }}</h4>
              <p>{{ item.description }}</p>
              <div class="detail-row">
                <span>Tipo <strong>{{ toLabel(item.type) }}</strong></span>
                <span>Bloques <strong>{{ item.sections.length }}</strong></span>
              </div>
              <button type="button" class="ghost-btn" (click)="useFeaturedTemplate(item)">Abrir en editor</button>
            </article>
          </section>
        </ng-template>
      </section>
    </div>

    <ng-template #loadingTpl>
      <section class="empty-state"><h3>Cargando editor...</h3></section>
    </ng-template>
  `,
})
export class TemplateEditorPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  private readonly draftChanges$ = new Subject<void>();
  private readonly subscriptions = new Subscription();
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;
  private collapsedSections = new Set<number>();
  private history: TemplateSection[][] = [];
  private future: TemplateSection[][] = [];

  loaded = false;
  saving = false;
  statusText = '';
  hasPendingChanges = false;
  templateId = '';
  previewDevice: 'desktop' | 'mobile' = 'desktop';
  previewMode: PreviewMode = 'schema';
  previewPulse = false;
  previewQuery = '';
  previewCompletion = 45;
  previewPersona: PreviewPersona = 'planner';
  showPreviewCanvas = false;
  showCatalogView = false;
  canvasCover =
    'linear-gradient(150deg, rgba(15,23,42,.35), rgba(15,118,110,.25)), url(https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=70)';

  types: TemplateType[] = ['CHECKLIST', 'TIMELINE', 'BUDGET', 'GUEST_LIST', 'VENDOR_LIST'];
  fieldTypes = ['text', 'checkbox', 'currency', 'time', 'number', 'textarea', 'date', 'select'];
  weddingBlockCatalog = [
    'Legal y contratos',
    'Ceremonia',
    'Venue y montaje',
    'Catering y menu',
    'Foto y video',
    'Invitados y seating',
    'Proveedores',
    'Presupuesto',
    'Transporte',
  ];

  draftName = '';
  draftType: TemplateType = 'CHECKLIST';
  draftDescription = '';
  templatePhase: TemplatePhase = 'PRE_BODA';
  estimatedMinutes = 120;
  tagsInput = '';
  enableBudgetAlerts = true;
  enableGuestCare = true;
  enableVendorOps = true;
  sections: TemplateSection[] = [];
  featuredTemplates: FeaturedTemplate[] = [
    {
      id: 'ft-planner-core',
      name: 'Planner Core Suite',
      type: 'CHECKLIST',
      description: 'Operacion completa para pre-boda, dia B y cierre.',
      cover:
        'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1400&q=70',
      sections: [
        this.makeSection('Plan maestro', ['Kickoff con pareja', 'Roadmap mensual', 'Checklist operativo']),
        this.makeSection('Control proveedores', ['Contacto principal', 'Estado de servicio', 'Pagos']),
      ],
    },
    {
      id: 'ft-timeline-premium',
      name: 'Timeline Premium Dia B',
      type: 'TIMELINE',
      description: 'Secuencia hora a hora con responsables y contingencias.',
      cover:
        'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=70',
      sections: [
        this.makeSection('Pre ceremonia', ['Maquillaje', 'Fotos previas', 'Traslado']),
        this.makeSection('Ceremonia y banquete', ['Entrada', 'Cocktail', 'Primer baile']),
      ],
    },
    {
      id: 'ft-budget-control',
      name: 'Budget Control Board',
      type: 'BUDGET',
      description: 'Panel financiero para previsto, real y desviaciones.',
      cover:
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1400&q=70',
      sections: [
        this.makeSection('Costes base', ['Espacio', 'Catering', 'Foto y video']),
        this.makeSection('Seguimiento', ['Pagos pendientes', 'Desviacion', 'Notas']),
      ],
    },
  ];

  get totalFields() {
    return this.sections.reduce((acc, section) => acc + section.fields.length, 0);
  }

  get requiredFields() {
    return this.sections.reduce(
      (acc, section) => acc + section.fields.filter((field) => Boolean(field.required)).length,
      0,
    );
  }

  get missingCoreBlocks() {
    const keys = this.sections.map((section) => section.title.toLowerCase());
    const core = ['timeline', 'presupuesto', 'invitados', 'proveedor'];
    return core.filter((item) => !keys.some((value) => value.includes(item)));
  }

  get businessReadinessLabel() {
    const issueCount = this.validationIssues.length;
    const score = Math.max(0, Math.min(100, this.previewCompletion - issueCount * 6 + this.requiredFields));
    if (score >= 80) return 'Alta';
    if (score >= 55) return 'Media';
    return 'Baja';
  }

  get validationIssues(): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const seenKeys = new Set<string>();

    this.sections.forEach((section, sectionIndex) => {
      if (!section.title.trim()) {
        issues.push({ type: 'error', message: `Seccion ${sectionIndex + 1} sin titulo.` });
      }
      if (!section.fields.length) {
        issues.push({ type: 'warning', message: `"${section.title || 'Seccion sin titulo'}" no tiene campos.` });
      }
      section.fields.forEach((field, fieldIndex) => {
        if (!field.key.trim()) {
          issues.push({
            type: 'error',
            message: `Campo ${fieldIndex + 1} en "${section.title || 'seccion'}" sin key.`,
          });
        }
        if (!field.label.trim()) {
          issues.push({
            type: 'warning',
            message: `Campo ${fieldIndex + 1} en "${section.title || 'seccion'}" sin label visible.`,
          });
        }
        const normalizedKey = field.key.trim().toLowerCase();
        if (!normalizedKey) return;
        if (seenKeys.has(normalizedKey)) {
          issues.push({
            type: 'error',
            message: `Key duplicada detectada: "${field.key}".`,
          });
        }
        seenKeys.add(normalizedKey);
      });
    });

    if (this.missingCoreBlocks.length) {
      issues.push({
        type: 'warning',
        message: `Faltan bloques base recomendados: ${this.missingCoreBlocks.join(', ')}.`,
      });
    }

    return issues.slice(0, 8);
  }

  get completenessScore() {
    const issues = this.validationIssues;
    const penalties = issues.reduce((acc, issue) => acc + (issue.type === 'error' ? 12 : 6), 0);
    return Math.max(35, Math.min(100, 100 - penalties));
  }

  get filteredPreviewSections() {
    const term = this.previewQuery.trim().toLowerCase();
    if (!term) return this.sections;
    return this.sections
      .map((section) => ({
        ...section,
        fields: section.fields.filter((field) =>
          `${field.label} ${field.key} ${field.type}`.toLowerCase().includes(term),
        ),
      }))
      .filter(
        (section) =>
          section.title.toLowerCase().includes(term) ||
          section.description?.toLowerCase().includes(term) ||
          section.fields.length > 0,
      );
  }

  get canUndo() {
    return this.history.length > 0;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  ngOnInit() {
    this.subscriptions.add(this.draftChanges$.pipe(debounceTime(900)).subscribe(() => this.save()));

    this.templateId = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<TemplateModel>(`http://localhost:3000/api/v1/templates/${this.templateId}`).subscribe({
      next: (template) => {
        this.draftName = template.name;
        this.draftType = template.type;
        this.draftDescription = template.description ?? '';
        this.sections = this.readSections(template.schemaJson);
        this.readSettings(template.schemaJson);
        this.loaded = true;
      },
      error: () => {
        this.statusText = 'No se pudo cargar el template';
        this.loaded = true;
      },
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
  }

  @HostListener('wheel', ['$event'])
  preventZoomOnCtrlWheel(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  }

  onDraftChange() {
    if (!this.loaded) return;
    this.hasPendingChanges = true;
    this.statusText = 'Editando...';
    this.previewPulse = true;
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
    this.pulseTimer = setTimeout(() => {
      this.previewPulse = false;
    }, 380);
    this.draftChanges$.next();
  }

  pushHistorySnapshot() {
    this.history.push(structuredClone(this.sections));
    if (this.history.length > 50) this.history.shift();
    this.future = [];
  }

  save() {
    if (!this.loaded || this.saving) return;

    this.saving = true;
    this.statusText = '';

    const payload = {
      name: this.draftName,
      type: this.draftType,
      description: this.draftDescription,
      schemaJson: {
        version: 1,
        sections: this.sections,
        settings: {
          phase: this.templatePhase,
          estimatedMinutes: this.estimatedMinutes,
          tags: this.tagsInput
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          options: {
            budgetAlerts: this.enableBudgetAlerts,
            guestCare: this.enableGuestCare,
            vendorOps: this.enableVendorOps,
          },
        },
      },
    };

    this.http.patch(`http://localhost:3000/api/v1/templates/${this.templateId}`, payload).subscribe({
      next: () => {
        this.saving = false;
        this.hasPendingChanges = false;
        this.statusText = 'Guardado';
      },
      error: () => {
        this.saving = false;
        this.statusText = 'Error al guardar';
      },
    });
  }

  saveAsCopy() {
    const payload = {
      name: `${this.draftName} (copia)`,
      type: this.draftType,
      description: this.draftDescription,
      schemaJson: {
        version: 1,
        sections: this.sections,
      },
    };
    this.http.post<TemplateModel>('http://localhost:3000/api/v1/templates', payload).subscribe({
      next: () => {
        this.statusText = 'Copia creada';
      },
      error: () => {
        this.statusText = 'No se pudo crear copia';
      },
    });
  }

  addBundle(bundle: 'plannerCore' | 'dayB' | 'clientJourney') {
    this.pushHistorySnapshot();
    const base =
      bundle === 'plannerCore'
        ? [
            this.makeSection('Contratos y legal', ['Contrato espacio evento', 'Seguro RC', 'Permisos']),
            this.makeSection('Control proveedores', ['Contacto principal', 'Estado servicio', 'Pago pendiente']),
          ]
        : bundle === 'dayB'
          ? [
              this.makeSection('Timeline Dia B', ['Hora ceremonia', 'Entrada novios', 'Corte tarta']),
              this.makeSection('Plan contingencia', ['Lluvia', 'Fallo tecnico', 'Canal crisis']),
            ]
          : [
              this.makeSection('Journey cliente', ['Decision menu', 'Lista invitados final', 'Aprobacion decoracion']),
              this.makeSection('Post-evento', ['Encuesta satisfaccion', 'Entrega album', 'Recomendaciones']),
            ];

    this.sections.push(...base);
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  addSection() {
    this.pushHistorySnapshot();
    this.sections.push({
      title: 'Bloque operativo',
      description: 'Acciones clave para wedding planner',
      fields: [{ key: 'responsable_operativo', label: 'Responsable operativo', type: 'text', required: true }],
    });
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  addWeddingBlock(blockName: string) {
    this.pushHistorySnapshot();
    const rows = this.defaultRowsForBlock(blockName);
    this.sections.push({
      title: blockName,
      description: 'Bloque generado desde toolkit wedding',
      fields: rows,
    });
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  duplicateSection(index: number) {
    this.pushHistorySnapshot();
    const clone = structuredClone(this.sections[index]);
    clone.title = `${clone.title} copia`;
    this.sections.splice(index + 1, 0, clone);
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  moveSection(index: number, direction: -1 | 1) {
    this.pushHistorySnapshot();
    const target = index + direction;
    if (target < 0 || target >= this.sections.length) return;
    const [item] = this.sections.splice(index, 1);
    this.sections.splice(target, 0, item);
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  removeSection(index: number) {
    this.pushHistorySnapshot();
    this.sections.splice(index, 1);
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  addField(sectionIndex: number) {
    this.pushHistorySnapshot();
    this.sections[sectionIndex].fields.push({
      key: `responsable_${this.sections[sectionIndex].fields.length + 1}`,
      label: 'Responsable',
      type: 'text',
      required: false,
    });
    this.onDraftChange();
  }

  duplicateField(sectionIndex: number, fieldIndex: number) {
    this.pushHistorySnapshot();
    const clone = structuredClone(this.sections[sectionIndex].fields[fieldIndex]);
    clone.key = `${clone.key}_copy`;
    this.sections[sectionIndex].fields.splice(fieldIndex + 1, 0, clone);
    this.onDraftChange();
  }

  moveField(sectionIndex: number, fieldIndex: number, direction: -1 | 1) {
    this.pushHistorySnapshot();
    const fields = this.sections[sectionIndex].fields;
    const target = fieldIndex + direction;
    if (target < 0 || target >= fields.length) return;
    const [item] = fields.splice(fieldIndex, 1);
    fields.splice(target, 0, item);
    this.onDraftChange();
  }

  removeField(sectionIndex: number, fieldIndex: number) {
    this.pushHistorySnapshot();
    this.sections[sectionIndex].fields.splice(fieldIndex, 1);
    this.onDraftChange();
  }

  addFieldByType(sectionIndex: number, type: string) {
    this.pushHistorySnapshot();
    this.sections[sectionIndex].fields.push({
      key: `${type}_${this.sections[sectionIndex].fields.length + 1}`,
      label:
        type === 'date'
          ? 'Fecha objetivo'
          : type === 'currency'
            ? 'Importe estimado'
            : type === 'checkbox'
              ? 'Tarea completada'
              : `Dato ${type}`,
      type,
      required: false,
    });
    this.onDraftChange();
  }

  addOperationalPack(sectionIndex: number) {
    this.pushHistorySnapshot();
    const suffix = sectionIndex + 1;
    const pack: TemplateField[] = [
      { key: `responsable_${suffix}`, label: 'Responsable', type: 'text', required: true },
      { key: `fecha_limite_${suffix}`, label: 'Fecha limite', type: 'date', required: false },
      { key: `prioridad_${suffix}`, label: 'Prioridad', type: 'select', required: false },
      { key: `estado_${suffix}`, label: 'Estado', type: 'select', required: true },
    ];
    this.sections[sectionIndex].fields.push(...pack);
    this.onDraftChange();
  }

  isFieldMarkedComplete(sectionIndex: number, fieldIndex: number) {
    const ratio = this.previewCompletion / 100;
    const fingerprint = ((sectionIndex + 1) * (fieldIndex + 3)) % 10;
    return fingerprint / 10 < ratio;
  }

  sampleDateValue(sectionIndex: number, fieldIndex: number) {
    const day = String(8 + ((sectionIndex + fieldIndex) % 18)).padStart(2, '0');
    return `2026-09-${day}`;
  }

  sampleTimeValue(sectionIndex: number, fieldIndex: number) {
    const hour = String(9 + ((sectionIndex + fieldIndex) % 10)).padStart(2, '0');
    const minute = (sectionIndex + fieldIndex) % 2 === 0 ? '00' : '30';
    return `${hour}:${minute}`;
  }

  sampleNumberValue(sectionIndex: number, fieldIndex: number) {
    return (sectionIndex + 1) * (fieldIndex + 1);
  }

  sampleCurrencyValue(sectionIndex: number, fieldIndex: number) {
    const value = 450 + (sectionIndex + 1) * 180 + fieldIndex * 65;
    return this.previewPersona === 'planner' ? `€ ${value}.00` : `Presupuesto ${value} EUR`;
  }

  sampleTextValue(sectionIndex: number, fieldIndex: number, long = false) {
    if (this.previewPersona === 'planner') {
      return long
        ? `Nota operativa #${sectionIndex + 1}.${fieldIndex + 1}: confirmar con proveedor y validar timing.`
        : `Responsable ${sectionIndex + 1}.${fieldIndex + 1}`;
    }
    return long
      ? `Comentario cliente #${sectionIndex + 1}.${fieldIndex + 1}: aprobado para continuar.`
      : `Decision cliente ${sectionIndex + 1}.${fieldIndex + 1}`;
  }

  normalizeFieldKeys() {
    this.pushHistorySnapshot();
    const taken = new Set<string>();
    this.sections = this.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field, index) => {
        const base = this.slugify(field.key || field.label || `campo_${index + 1}`);
        let candidate = base;
        let suffix = 2;
        while (taken.has(candidate)) {
          candidate = `${base}_${suffix}`;
          suffix += 1;
        }
        taken.add(candidate);
        return { ...field, key: candidate };
      }),
    }));
    this.onDraftChange();
  }

  removeEmptyFields() {
    this.pushHistorySnapshot();
    this.sections = this.sections
      .map((section) => ({
        ...section,
        fields: section.fields.filter((field) => field.key.trim() || field.label.trim()),
      }))
      .filter((section) => section.title.trim() || section.fields.length);
    if (!this.sections.length) {
      this.sections = [this.makeSection('Seccion principal', ['Responsable principal'])];
    }
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  collapseAllSections() {
    this.collapsedSections = new Set(this.sections.map((_, index) => index));
  }

  expandAllSections() {
    this.collapsedSections.clear();
  }

  toggleSection(index: number) {
    if (this.collapsedSections.has(index)) {
      this.collapsedSections.delete(index);
      return;
    }
    this.collapsedSections.add(index);
  }

  isSectionCollapsed(index: number) {
    return this.collapsedSections.has(index);
  }

  undo() {
    if (!this.history.length) return;
    this.future.push(structuredClone(this.sections));
    this.sections = this.history.pop() ?? this.sections;
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  redo() {
    if (!this.future.length) return;
    this.history.push(structuredClone(this.sections));
    this.sections = this.future.pop() ?? this.sections;
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  onMirrorMove(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    card.style.setProperty('--mx', `${px * 100}%`);
    card.style.setProperty('--my', `${py * 100}%`);
    card.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
    card.style.setProperty('--ry', `${(px - 0.5) * 11}deg`);
  }

  onMirrorLeave(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement;
    card.style.setProperty('--mx', '50%');
    card.style.setProperty('--my', '50%');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  }

  toLabel(value: string) {
    return value.replace('_', ' ');
  }

  openPreviewCanvas() {
    this.showPreviewCanvas = true;
    this.showCatalogView = false;
  }

  closePreviewCanvas() {
    this.showPreviewCanvas = false;
    this.showCatalogView = false;
  }

  useFeaturedTemplate(item: FeaturedTemplate) {
    this.pushHistorySnapshot();
    this.draftName = item.name;
    this.draftType = item.type;
    this.draftDescription = item.description;
    this.sections = structuredClone(item.sections);
    this.canvasCover = `linear-gradient(150deg, rgba(15,23,42,.35), rgba(15,118,110,.25)), url(${item.cover})`;
    this.collapsedSections.clear();
    this.showCatalogView = false;
    this.onDraftChange();
  }

  private readSettings(schemaJson: Record<string, unknown>) {
    const settings = (schemaJson['settings'] as Record<string, unknown> | undefined) ?? {};
    const options = (settings['options'] as Record<string, unknown> | undefined) ?? {};
    this.templatePhase = (settings['phase'] as TemplatePhase | undefined) ?? 'PRE_BODA';
    this.estimatedMinutes = Number(settings['estimatedMinutes'] ?? 120);
    this.tagsInput = Array.isArray(settings['tags']) ? (settings['tags'] as string[]).join(', ') : '';
    this.enableBudgetAlerts = Boolean(options['budgetAlerts'] ?? true);
    this.enableGuestCare = Boolean(options['guestCare'] ?? true);
    this.enableVendorOps = Boolean(options['vendorOps'] ?? true);
  }

  private makeSection(title: string, fields: string[]): TemplateSection {
    return {
      title,
      description: 'Bloque premium sugerido',
      fields: fields.map((label, index) => ({
        key: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${index + 1}`,
        label,
        type: index % 2 === 0 ? 'text' : 'checkbox',
        required: false,
      })),
    };
  }

  private slugify(value: string) {
    const cleaned = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return cleaned || 'campo';
  }

  private defaultRowsForBlock(blockName: string): TemplateField[] {
    const normalized = blockName.toLowerCase();
    if (normalized.includes('legal')) {
      return [
        { key: 'contrato_firmado', label: 'Contrato firmado', type: 'checkbox', required: true },
        { key: 'fecha_vencimiento', label: 'Fecha vencimiento', type: 'date', required: true },
        { key: 'responsable_legal', label: 'Responsable legal', type: 'text', required: false },
      ];
    }
    if (normalized.includes('ceremonia')) {
      return [
        { key: 'hora_entrada_novios', label: 'Hora entrada novios', type: 'time', required: true },
        { key: 'oficiante_confirmado', label: 'Oficiante confirmado', type: 'checkbox', required: true },
        { key: 'guion_ceremonia', label: 'Guion ceremonia', type: 'textarea', required: false },
      ];
    }
    if (normalized.includes('catering')) {
      return [
        { key: 'menu_aprobado', label: 'Menu aprobado', type: 'checkbox', required: true },
        { key: 'alergias_registradas', label: 'Alergias registradas', type: 'checkbox', required: true },
        { key: 'coste_catering', label: 'Coste catering', type: 'currency', required: false },
      ];
    }
    if (normalized.includes('foto') || normalized.includes('video')) {
      return [
        { key: 'shot_list_ok', label: 'Shot list validada', type: 'checkbox', required: true },
        { key: 'hora_sesion', label: 'Hora sesion pareja', type: 'time', required: false },
        { key: 'entrega_material', label: 'Fecha entrega material', type: 'date', required: false },
      ];
    }
    if (normalized.includes('invitados')) {
      return [
        { key: 'rsvp_confirmados', label: 'RSVP confirmados', type: 'number', required: true },
        { key: 'mesas_asignadas', label: 'Mesas asignadas', type: 'checkbox', required: true },
        { key: 'observaciones_dieta', label: 'Observaciones dieta', type: 'textarea', required: false },
      ];
    }
    if (normalized.includes('presupuesto')) {
      return [
        { key: 'importe_previsto', label: 'Importe previsto', type: 'currency', required: true },
        { key: 'importe_real', label: 'Importe real', type: 'currency', required: true },
        { key: 'desviacion', label: 'Desviacion', type: 'currency', required: false },
      ];
    }
    if (normalized.includes('proveedor')) {
      return [
        { key: 'proveedor_principal', label: 'Proveedor principal', type: 'text', required: true },
        { key: 'estado_servicio', label: 'Estado servicio', type: 'select', required: true },
        { key: 'pago_pendiente', label: 'Pago pendiente', type: 'currency', required: false },
      ];
    }
    if (normalized.includes('transporte')) {
      return [
        { key: 'transfer_confirmado', label: 'Transfer confirmado', type: 'checkbox', required: true },
        { key: 'hora_recogida', label: 'Hora recogida', type: 'time', required: false },
        { key: 'coordinador_logistica', label: 'Coordinador logistica', type: 'text', required: false },
      ];
    }
    return [
      { key: 'responsable', label: 'Responsable', type: 'text', required: true },
      { key: 'fecha_objetivo', label: 'Fecha objetivo', type: 'date', required: false },
      { key: 'estado', label: 'Estado', type: 'select', required: false },
    ];
  }

  private readSections(schemaJson: Record<string, unknown>) {
    const raw = (schemaJson['sections'] as TemplateSection[] | undefined) ?? [];
    if (!raw.length) {
      return [
        {
          title: 'Seccion principal',
          fields: [{ key: 'responsable_principal', label: 'Responsable principal', type: 'text' }],
        },
      ];
    }
    return raw.map((section) => ({
      title: section.title,
      description: section.description ?? '',
      fields: (section.fields ?? []).map((field) => ({
        key: field.key,
        label: field.label,
        type: field.type,
        required: Boolean(field.required),
      })),
    }));
  }
}
