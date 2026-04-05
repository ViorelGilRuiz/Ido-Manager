import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom, forkJoin } from 'rxjs';
import { TemplateModel, TemplateType } from '../../shared/models';
import { PdfTheme, openTemplatePdfPreview } from '../../shared/utils/pdf-export';

type TemplateFieldType = 'text' | 'checkbox' | 'currency' | 'time' | 'number' | 'textarea' | 'date' | 'select';
type TemplateField = { key: string; label: string; type: TemplateFieldType; required?: boolean };
type TemplateSection = { title: string; description?: string; fields: TemplateField[] };
type CreatorTone = 'minimal' | 'balanced' | 'detailed';
type CreatorStep = 1 | 2 | 3;
type SortMode = 'recent' | 'name' | 'fields' | 'quality';
type TemplateAudience = 'planner' | 'client' | 'mixed';
type WeddingBlockId =
  | 'legal'
  | 'venue'
  | 'ceremony'
  | 'catering'
  | 'photo_video'
  | 'music_show'
  | 'guest_experience'
  | 'vendors_ops'
  | 'budget_control'
  | 'transport_logistics';

type QualityReport = {
  score: number;
  missingCritical: string[];
};

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

type CompareItem = {
  id: string;
  name: string;
  type: TemplateType;
  sections: number;
  fields: number;
  score: number;
  missingCritical: string[];
};

type AutoStyle = 'operativo' | 'premium' | 'emocional';
type WeddingProfile = 'classic' | 'luxury' | 'destination' | 'intimate';
type PremiumTheme = 'editorial' | 'minimal' | 'cinematic';

@Component({
  selector: 'app-templates-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  template: `
    <section class="templates-view templates-canvas">
      <header class="page-head">
        <div>
          <p class="kicker">Template Studio</p>
          <h1>Diseno wedding planner</h1>
          <p class="muted-copy">Plantillas visuales, preview grande y flujo completo para planner y cliente.</p>
        </div>
        <div class="head-stat">
          <span>Biblioteca</span>
          <strong>{{ templates.length }}</strong>
        </div>
      </header>

      <section class="panel-card business-board">
        <div class="panel-head">
          <h3>Business cockpit</h3>
          <span class="muted-copy">Salud funcional de tu biblioteca wedding</span>
        </div>
        <div class="insight-grid">
          <article class="insight-card">
            <p>Calidad media</p>
            <strong>{{ avgQualityScore }}/100</strong>
          </article>
          <article class="insight-card">
            <p>Favoritas</p>
            <strong>{{ favorites.size }}</strong>
          </article>
          <article class="insight-card">
            <p>Cobertura core</p>
            <strong>{{ coreCoverageLabel }}</strong>
          </article>
        </div>
        <p class="muted-copy" *ngIf="missingTemplateTypes.length">
          Faltan plantillas base: {{ missingTemplateTypes.join(', ') }}
        </p>
        <p class="muted-copy" *ngIf="coreActionText">{{ coreActionText }}</p>
        <div class="actions-row">
          <button
            type="button"
            class="ghost-btn"
            (click)="createMissingCoreTemplates()"
            [disabled]="bulkCreating"
          >
            {{ bulkCreating ? 'Generando...' : 'Crear o reforzar plantillas core automaticamente' }}
          </button>
          <button type="button" class="ghost-btn" (click)="runAiPortfolioOptimizer()">IA Portfolio Optimizer</button>
        </div>
      </section>

      <section class="dashboard-grid">
        <article class="panel-card">
          <div class="panel-head">
            <h3>Visibilidad de biblioteca</h3>
            <span class="muted-copy">{{ templateVisibilityLabel }}</span>
          </div>
          <div class="insight-grid">
            <article class="insight-card">
              <p>Premium-ready</p>
              <strong>{{ premiumReadyTemplates }}</strong>
            </article>
            <article class="insight-card">
              <p>Requieren mejora</p>
              <strong>{{ templatesNeedingAttention }}</strong>
            </article>
            <article class="insight-card">
              <p>Visibilidad docs</p>
              <strong>{{ templateDocsReadinessScore }}/100</strong>
            </article>
          </div>
          <div class="coverage-list">
            <div class="coverage-row">
              <span>Client-ready</span>
              <strong>{{ clientReadyCoveragePercent }}%</strong>
            </div>
            <div class="coverage-row">
              <span>Calidad media</span>
              <strong>{{ avgQualityScore }}/100</strong>
            </div>
            <div class="coverage-row">
              <span>Cobertura tipos</span>
              <strong>{{ coreCoverageLabel }}</strong>
            </div>
          </div>
          <p class="muted-copy">{{ aiLibraryNarrative }}</p>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="runAiCatalogPolishPass()">IA Catalog Polish</button>
            <button type="button" class="ghost-btn" (click)="applyHighImpactLibraryView()">Vista alto impacto</button>
            <button type="button" class="ghost-btn" (click)="openTopTemplateEditor()" [disabled]="!templates.length">Abrir mejor template</button>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <h3>Progreso del trabajo</h3>
            <span class="muted-copy">Creacion · Curacion · Conversion cliente</span>
          </div>
          <ul class="panel-list" *ngIf="templateProgressHighlights.length; else noTemplateProgress">
            <li *ngFor="let item of templateProgressHighlights">
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </li>
          </ul>
          <ng-template #noTemplateProgress>
            <p class="muted-copy">Empieza creando una plantilla para activar métricas de progreso.</p>
          </ng-template>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel-card">
          <div class="panel-head">
            <h3>Productividad premium</h3>
            <span class="muted-copy">Curacion, conversion y lanzamiento de templates</span>
          </div>
          <div class="insight-grid">
            <article class="insight-card">
              <p>Launch score</p>
              <strong>{{ templateLaunchScore }}/100</strong>
            </article>
            <article class="insight-card">
              <p>Top candidates</p>
              <strong>{{ topTemplateCandidates.length }}</strong>
            </article>
            <article class="insight-card">
              <p>Backlog IA</p>
              <strong>{{ templateOpsBacklog.length }}</strong>
            </article>
          </div>
          <ul class="panel-list" *ngIf="templateOpsBacklog.length; else noTemplateOpsBacklog">
            <li *ngFor="let item of templateOpsBacklog">
              <strong>{{ item.title }}</strong>
              <p>{{ item.detail }}</p>
            </li>
          </ul>
          <ng-template #noTemplateOpsBacklog>
            <p class="muted-copy">Sin bloqueos de catálogo. Buen momento para lanzar nuevos packs premium.</p>
          </ng-template>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="runAiPremiumLaunchPack()">IA Premium Launch Pack</button>
            <button type="button" class="ghost-btn" (click)="applyTemplateWorkbenchView()">Vista workbench</button>
            <button type="button" class="ghost-btn" (click)="runAiPortfolioOptimizer()">IA Portfolio Optimizer</button>
          </div>
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <h3>Radar de conversion cliente</h3>
            <span class="muted-copy">{{ templatePortfolioModeLabel }}</span>
          </div>
          <div class="coverage-list">
            <div class="coverage-row">
              <span>Client-ready</span>
              <strong>{{ clientReadyCoveragePercent }}%</strong>
            </div>
            <div class="coverage-row">
              <span>Premium-ready</span>
              <strong>{{ premiumReadyTemplates }}/{{ templates.length || 0 }}</strong>
            </div>
            <div class="coverage-row">
              <span>Docs readiness</span>
              <strong>{{ templateDocsReadinessScore }}/100</strong>
            </div>
            <div class="coverage-row">
              <span>Calidad media</span>
              <strong>{{ avgQualityScore }}/100</strong>
            </div>
          </div>
          <p class="muted-copy">{{ aiTemplatePortfolioNarrative }}</p>
          <ul class="panel-list" *ngIf="topTemplateCandidates.length">
            <li *ngFor="let item of topTemplateCandidates">
              <strong>{{ item.name }}</strong>
              <p>{{ toLabel(item.type) }} · {{ item.score }}/100 · {{ item.fields }} campos</p>
            </li>
          </ul>
        </article>
      </section>

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
          <label>
            Perfil de boda
            <select [(ngModel)]="weddingProfile" [ngModelOptions]="{ standalone: true }">
              <option value="classic">Classic</option>
              <option value="luxury">Luxury</option>
              <option value="destination">Destination</option>
              <option value="intimate">Intimate</option>
            </select>
          </label>
          <label>
            Tema visual
            <select [(ngModel)]="premiumTheme" [ngModelOptions]="{ standalone: true }">
              <option value="editorial">Editorial</option>
              <option value="minimal">Minimal</option>
              <option value="cinematic">Cinematic</option>
            </select>
          </label>
        </form>

        <section class="panel-card auto-generator-panel" *ngIf="currentStep === 1">
          <div class="panel-head">
            <h4>Generador automatico de plantilla</h4>
            <span class="muted-copy">Describe la boda y te propongo estructura lista para editar.</span>
          </div>
          <div class="creator-grid">
            <label class="full-row">
              Brief del cliente
              <textarea
                [(ngModel)]="autoBrief"
                [ngModelOptions]="{ standalone: true }"
                rows="3"
                placeholder="Ej: boda de 160 invitados en finca, ceremonia civil, enfoque elegante con control financiero..."
              ></textarea>
            </label>
            <label>
              Estilo
              <select [(ngModel)]="autoStyle" [ngModelOptions]="{ standalone: true }">
                <option value="operativo">Operativo</option>
                <option value="premium">Premium</option>
                <option value="emocional">Emocional</option>
              </select>
            </label>
            <label>
              Invitados estimados
              <input type="number" min="20" max="500" step="10" [(ngModel)]="autoGuestCount" [ngModelOptions]="{ standalone: true }" />
            </label>
            <label>
              Presupuesto estimado (EUR)
              <input type="number" min="1000" step="500" [(ngModel)]="autoBudget" [ngModelOptions]="{ standalone: true }" />
            </label>
          </div>
          <div class="actions-row">
            <button type="button" class="ghost-btn" (click)="generateFromBrief()">Generar estructura automaticamente</button>
            <button type="button" class="ghost-btn" (click)="fillPremiumBrief()">Autorellenar brief premium</button>
          </div>
        </section>

        <section class="builder-panel" *ngIf="currentStep === 2">
          <div class="panel-head">
            <h4>Estructura editable</h4>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="addSection()">+ Seccion</button>
              <button type="button" class="ghost-btn" (click)="autoFillDraftFields()">Autorrellenar</button>
              <button type="button" class="ghost-btn" (click)="autoFillBySelectedType()">Rellenar por tipo</button>
              <button type="button" class="ghost-btn" (click)="addWedding360Pack()">Wedding 360</button>
              <button type="button" class="ghost-btn" (click)="addClientExperiencePack()">Pack cliente premium</button>
              <button type="button" class="ghost-btn" (click)="professionalizeDraftContent()">Pulir textos boda</button>
              <button type="button" class="ghost-btn" (click)="addSuggestedBlocks()">Sugerir bloques</button>
              <button type="button" class="ghost-btn" (click)="optimizeDraftOneClick()">One-click pro</button>
              <button type="button" class="ghost-btn" (click)="autoCompletePremiumTemplate()">Autocompletar premium</button>
            </div>
          </div>
          <div class="quick-shortcuts">
            <p>Atajos pro</p>
            <div class="quick-shortcuts-row">
              <button type="button" class="ghost-btn" (click)="addDayBExecutionPack()">Pack ejecucion Dia B</button>
              <button type="button" class="ghost-btn" (click)="addBudgetMilestonesPack()">Pack hitos de pago</button>
              <button type="button" class="ghost-btn" (click)="addGuestMaster360Pack()">Guest master 360</button>
              <button type="button" class="ghost-btn" (click)="normalizeDraftKeys()">Normalizar keys</button>
              <button type="button" class="ghost-btn" (click)="applyAudienceLens()">Ajustar por audiencia</button>
            </div>
            <span>Ctrl+Alt+P: one-click pro · Ctrl+Alt+D: pack Dia B · Ctrl+Alt+G: autocompletar premium · Esc: cerrar preview</span>
          </div>
          <section class="quick-ai-panel">
            <div class="panel-head">
              <h5>AI Assistant rapido</h5>
              <strong>{{ draftAiScore }}/100</strong>
            </div>
            <ul *ngIf="draftAiRecommendations.length; else aiDraftOk">
              <li *ngFor="let item of draftAiRecommendations">{{ item }}</li>
            </ul>
            <ng-template #aiDraftOk>
              <p class="muted-copy">IA: plantilla equilibrada para producción.</p>
            </ng-template>
            <div class="quick-shortcuts-row">
              <button type="button" class="ghost-btn" (click)="runAiQuickAssist()">IA Full Assist rapido</button>
              <button type="button" class="ghost-btn" (click)="aiAutoGenerateGuestJourney()">IA Guest Journey</button>
              <button type="button" class="ghost-btn" (click)="autoCompleteDraftCriticalBlocks()">IA Completar criticos</button>
              <button type="button" class="ghost-btn" (click)="runAiRiskAudit()">IA Risk Audit</button>
              <button type="button" class="ghost-btn" (click)="runAiRevenuePack()">IA Revenue Pack</button>
            </div>
          </section>
          <div class="planner-toolkit">
            <p class="muted-copy">Bloques pro para wedding planner</p>
            <div class="block-chip-grid">
              <button
                type="button"
                class="ghost-btn"
                *ngFor="let block of weddingBlockCatalog"
                (click)="addWeddingBlock(block.id)"
              >
                + {{ block.label }}
              </button>
            </div>
          </div>
          <div class="section-stack" *ngIf="draftSections.length">
            <article class="section-card" *ngFor="let section of draftSections; let si = index">
              <div class="panel-head">
                <input [(ngModel)]="section.title" [ngModelOptions]="{ standalone: true }" placeholder="Titulo seccion" />
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="smartFillSection(si)">Smart</button>
                  <button type="button" class="ghost-btn" (click)="professionalizeSection(si)">Pro</button>
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
              <span>Calidad: <strong>{{ evaluateTemplateQuality(previewDraft.schemaJson.sections).score }}/100</strong></span>
            </div>
            <p class="meta-line" *ngIf="evaluateTemplateQuality(previewDraft.schemaJson.sections).missingCritical.length">
              Faltan bloques clave: {{ evaluateTemplateQuality(previewDraft.schemaJson.sections).missingCritical.join(', ') }}
            </p>
            <div class="actions-row">
              <button type="button" class="ghost-btn" (click)="openBigPreviewFromDraft()">Ver en grande</button>
              <button type="button" class="ghost-btn" (click)="autoCompleteDraftCriticalBlocks()" [disabled]="!draftMissingCritical.length">
                Autocompletar bloques clave
              </button>
              <button type="button" class="ghost-btn" (click)="applyClientPolishToDraft()">Pulir para cliente</button>
              <button type="button" class="ghost-btn" (click)="exportDraftJson()" [disabled]="!previewDraft">Exportar JSON</button>
              <button type="button" class="ghost-btn" (click)="exportDraftPdf()" [disabled]="!previewDraft">Preview PDF</button>
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

      <section class="template-library template-market-shell" *ngIf="templates.length">
        <div class="market-hero">
          <div class="market-hero-copy">
            <p class="market-kicker">Marketplace visual</p>
            <h3>Plantillas: Bodas</h3>
            <p class="muted-copy">
              Explora tu biblioteca como galeria visual: filtra, compara, previsualiza y abre el editor libre para personalizar todo a mano.
            </p>
            <div class="market-chip-row">
              <button
                type="button"
                class="market-chip"
                [class.is-active]="sortMode === 'recent'"
                (click)="sortMode = 'recent'; applyFilters()"
              >
                Recientes
              </button>
              <button
                type="button"
                class="market-chip"
                [class.is-active]="sortMode === 'quality'"
                (click)="sortMode = 'quality'; applyFilters()"
              >
                Populares / Calidad
              </button>
              <button
                type="button"
                class="market-chip"
                [class.is-active]="showClientReadyOnly"
                (click)="toggleClientReadyOnly()"
              >
                Client-ready
              </button>
              <button
                type="button"
                class="market-chip"
                [class.is-active]="showFavoritesOnly"
                (click)="toggleFavoritesOnly()"
              >
                Favoritas
              </button>
            </div>
          </div>
          <div class="market-hero-side">
            <div class="market-meta">
              <span>Biblioteca total</span>
              <strong>{{ templates.length }}</strong>
            </div>
            <div class="market-meta">
              <span>Visibles</span>
              <strong>{{ filteredTemplates.length }}</strong>
            </div>
            <div class="market-meta">
              <span>Comparador</span>
              <strong>{{ compareSelection.size }}/3</strong>
            </div>
            <div class="actions-row">
              <a routerLink="/app/free-editor" class="ghost-btn action-link">Editor libre</a>
              <button type="button" class="ghost-btn" (click)="openCompareModal()" [disabled]="compareSelection.size < 2">
                Comparar ({{ compareSelection.size }})
              </button>
            </div>
          </div>
        </div>

        <div class="market-filters">
          <div class="market-type-tabs">
            <button type="button" class="market-type-tab" [class.is-active]="typeFilter === 'ALL'" (click)="typeFilter = 'ALL'; applyFilters()">
              Todas
            </button>
            <button
              type="button"
              class="market-type-tab"
              *ngFor="let t of types"
              [class.is-active]="typeFilter === t"
              (click)="typeFilter = t; applyFilters()"
            >
              {{ toLabel(t) }}
            </button>
          </div>

          <div class="library-toolbar market-toolbar-grid">
            <input [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" placeholder="Buscar por nombre o descripcion" />
            <select [(ngModel)]="sortMode" (ngModelChange)="applyFilters()">
              <option value="recent">Recientes</option>
              <option value="name">Nombre</option>
              <option value="fields">Mas campos</option>
              <option value="quality">Mejor calidad</option>
            </select>
            <label class="quality-filter">
              Calidad min
              <input type="range" min="0" max="100" step="10" [(ngModel)]="qualityFilter" (ngModelChange)="applyFilters()" />
              <span>{{ qualityFilter }}</span>
            </label>
            <button type="button" class="ghost-btn" (click)="toggleFavoritesOnly()" [class.is-active]="showFavoritesOnly">
              {{ showFavoritesOnly ? 'Solo favoritas' : 'Ver favoritas' }}
            </button>
            <button type="button" class="ghost-btn" (click)="toggleClientReadyOnly()" [class.is-active]="showClientReadyOnly">
              {{ showClientReadyOnly ? 'Solo client-ready' : 'Client-ready' }}
            </button>
            <button type="button" class="ghost-btn" (click)="resetFilters()">Limpiar</button>
          </div>
        </div>
      </section>

      <section class="template-grid" *ngIf="filteredTemplates.length; else emptyState">
        <article class="template-card interactive-card market-card" *ngFor="let template of filteredTemplates; trackBy: trackById" (mousemove)="onCardPointerMove($event)" (mouseleave)="onCardPointerLeave($event)">
          <div class="cover-media market-card-cover" [style.background-image]="coverForType(template.type)">
            <div class="market-card-overlay">
              <p class="type-chip">{{ toLabel(template.type) }}</p>
              <div class="market-pill-row">
                <span class="market-pill">{{ countSections(template.schemaJson) }} secciones</span>
                <span class="market-pill">{{ countFields(template.schemaJson) }} campos</span>
                <span class="market-pill" [class.is-good]="isClientReadyTemplate(template)">
                  {{ isClientReadyTemplate(template) ? 'Client-ready' : 'Revisar' }}
                </span>
              </div>
            </div>
          </div>
          <div class="market-card-body">
            <div class="market-card-title-row">
              <div>
                <h3>{{ template.name }}</h3>
                <p>{{ template.description || 'Template base listo para editar y extender por evento.' }}</p>
              </div>
              <div class="market-score">
                <span>Score</span>
                <strong>{{ evaluateTemplateQuality(getSections(template.schemaJson)).score }}</strong>
              </div>
            </div>

            <div class="detail-row metric-badges">
              <span class="metric-badge">Calidad <strong>{{ evaluateTemplateQuality(getSections(template.schemaJson)).score }}/100</strong></span>
              <span class="metric-badge">Secciones <strong>{{ countSections(template.schemaJson) }}</strong></span>
              <span class="metric-badge">Campos <strong>{{ countFields(template.schemaJson) }}</strong></span>
              <span class="metric-badge">Cliente <strong>{{ isClientReadyTemplate(template) ? 'Ready' : 'Revisar' }}</strong></span>
            </div>

            <p class="meta-line" *ngIf="evaluateTemplateQuality(getSections(template.schemaJson)).missingCritical.length">
              Falta: {{ evaluateTemplateQuality(getSections(template.schemaJson)).missingCritical.join(', ') }}
            </p>

            <div class="actions-row card-actions-primary">
              <a [routerLink]="['/app/templates', template.id]" class="ghost-btn action-link">Editar</a>
              <button type="button" class="ghost-btn" (click)="openBigPreviewFromTemplate(template)">Vista grande</button>
              <button type="button" class="ghost-btn" (click)="toggleFavorite(template.id)" [class.is-active]="isFavorite(template.id)">
                {{ isFavorite(template.id) ? 'Favorita' : 'Favorita +' }}
              </button>
              <button type="button" class="ghost-btn" (click)="toggleCompare(template)" [class.is-active]="isCompared(template.id)">
                {{ isCompared(template.id) ? 'En comparador' : 'Comparar' }}
              </button>
              <button type="button" class="ghost-btn" (click)="createClientVersion(template)">Version cliente</button>
            </div>

            <div class="actions-row card-actions-secondary">
              <button type="button" class="ghost-btn" (click)="renameTemplate(template)">Renombrar</button>
              <button type="button" class="ghost-btn" (click)="loadTemplateIntoBuilder(template)">Cargar en creador</button>
              <button type="button" class="ghost-btn" (click)="exportTemplateJson(template)">Exportar</button>
              <button type="button" class="ghost-btn" (click)="exportTemplatePdf(template)">PDF</button>
              <button type="button" class="ghost-btn" (click)="aiEnhanceTemplate(template)">IA mejorar</button>
              <button type="button" class="ghost-btn" (click)="duplicateTemplate(template)">Duplicar</button>
              <button type="button" class="ghost-btn danger-btn" (click)="deleteTemplate(template)">Eliminar</button>
            </div>
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

    <div class="preview-modal preview-modal-premium" *ngIf="bigPreview" (click)="closeBigPreview()">
      <article class="preview-modal-card" (click)="$event.stopPropagation()">
        <button type="button" class="ghost-btn close-btn" (click)="closeBigPreview()">Cerrar</button>
        <div class="tiny-actions">
          <button type="button" class="ghost-btn" [class.is-active]="bigPreviewMode === 'showcase'" (click)="bigPreviewMode = 'showcase'">Showcase</button>
          <button type="button" class="ghost-btn" [class.is-active]="bigPreviewMode === 'board'" (click)="bigPreviewMode = 'board'">Board</button>
          <button type="button" class="ghost-btn" [class.is-active]="bigPreviewFx === 'executive'" (click)="toggleBigPreviewFx()">
            {{ bigPreviewFx === 'executive' ? 'Executive ON' : 'Executive OFF' }}
          </button>
          <button type="button" class="ghost-btn" [class.is-active]="bigPreviewFilter === 'all'" (click)="bigPreviewFilter = 'all'">Todo</button>
          <button type="button" class="ghost-btn" [class.is-active]="bigPreviewFilter === 'guest'" (click)="bigPreviewFilter = 'guest'">Invitados</button>
          <button type="button" class="ghost-btn" [class.is-active]="bigPreviewFilter === 'budget'" (click)="bigPreviewFilter = 'budget'">Presupuesto</button>
          <button type="button" class="ghost-btn" [class.is-active]="bigPreviewFilter === 'ops'" (click)="bigPreviewFilter = 'ops'">Operacion</button>
          <button type="button" class="ghost-btn" (click)="exportBigPreviewPdf()">Exportar PDF</button>
        </div>
        <div
          class="preview-hero"
          [class.is-executive]="bigPreviewFx === 'executive'"
          [style.background-image]="'linear-gradient(140deg, rgba(15,23,42,.35), rgba(14,116,144,.28)), url(' + bigPreview.coverUrl + ')'"
          (mousemove)="onBigPreviewMove($event)"
          (mouseleave)="onBigPreviewLeave($event)"
        >
          <p class="type-chip">{{ toLabel(bigPreview.type) }} · {{ audienceLabel(bigPreview.audience) }}</p>
          <h2>{{ bigPreview.title }}</h2>
          <p>{{ bigPreview.description }}</p>
          <div class="preview-hero-status">
            <span>Score premium</span>
            <strong>{{ evaluateTemplateQuality(bigPreview.sections).score }}/100</strong>
          </div>
        </div>
        <div class="preview-story-row">
          <article>
            <span>Secciones</span>
            <strong>{{ bigPreview.sections.length }}</strong>
          </article>
          <article>
            <span>Campos</span>
            <strong>{{ countFields({ sections: bigPreview.sections }) }}</strong>
          </article>
          <article>
            <span>Impacto cliente</span>
            <strong>{{ bigPreview.audience === 'client' ? 'Muy alto' : 'Alto' }}</strong>
          </article>
          <article>
            <span>Bloques criticos</span>
            <strong>{{ evaluateTemplateQuality(bigPreview.sections).missingCritical.length }}</strong>
          </article>
        </div>
        <div class="preview-timeline">
          <span class="line"></span>
          <article><strong>Brief</strong><small>Definicion y objetivos</small></article>
          <article><strong>Pre-boda</strong><small>Gestion operativa</small></article>
          <article><strong>Dia B</strong><small>Ejecucion en directo</small></article>
          <article><strong>Post</strong><small>Cierre y feedback</small></article>
        </div>
        <div class="preview-modal-body" [class.preview-mode-board]="bigPreviewMode === 'board'">
          <article class="preview-section" *ngFor="let section of filteredBigPreviewSections">
            <strong>{{ section.title }}</strong>
            <p *ngIf="section.description">{{ section.description }}</p>
            <ul>
              <li *ngFor="let field of section.fields">{{ field.label }} · {{ field.type }}</li>
            </ul>
          </article>
        </div>
      </article>
    </div>

    <div class="preview-modal" *ngIf="showCompareModal" (click)="closeCompareModal()">
      <article class="preview-modal-card compare-modal-card" (click)="$event.stopPropagation()">
        <button type="button" class="ghost-btn close-btn" (click)="closeCompareModal()">Cerrar</button>
        <div class="preview-hero compare-hero">
          <p class="type-chip">Compare Studio</p>
          <h2>Comparador de plantillas</h2>
          <p>Analiza estructura, cobertura y calidad para elegir la mejor base.</p>
        </div>
        <div class="compare-grid">
          <article class="compare-col" *ngFor="let item of comparedTemplates">
            <h3>{{ item.name }}</h3>
            <p class="muted-copy">{{ toLabel(item.type) }}</p>
            <div class="detail-row">
              <span>Secciones: <strong>{{ item.sections }}</strong></span>
              <span>Campos: <strong>{{ item.fields }}</strong></span>
              <span>Score: <strong>{{ item.score }}/100</strong></span>
            </div>
            <p class="meta-line" *ngIf="item.missingCritical.length">Falta: {{ item.missingCritical.join(', ') }}</p>
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
  private readonly favoritesStorageKey = 'ido_manager_template_favorites_v1';
  private readonly maxCompare = 3;

  creatingFromPreview = false;
  bulkCreating = false;
  coreActionText = '';
  previewDraft: PreviewDraft | null = null;
  currentStep: CreatorStep = 1;
  bigPreview: BigPreview | null = null;
  bigPreviewMode: 'showcase' | 'board' = 'showcase';
  bigPreviewFx: 'standard' | 'executive' = 'standard';
  bigPreviewFilter: 'all' | 'guest' | 'budget' | 'ops' = 'all';
  showCompareModal = false;

  searchTerm = '';
  typeFilter: 'ALL' | TemplateType = 'ALL';
  sortMode: SortMode = 'recent';
  qualityFilter = 0;
  showFavoritesOnly = false;
  showClientReadyOnly = false;
  autoBrief = '';
  autoStyle: AutoStyle = 'operativo';
  weddingProfile: WeddingProfile = 'classic';
  premiumTheme: PremiumTheme = 'editorial';
  autoGuestCount = 120;
  autoBudget = 30000;

  types: TemplateType[] = ['CHECKLIST', 'TIMELINE', 'BUDGET', 'GUEST_LIST', 'VENDOR_LIST'];
  fieldTypes: TemplateFieldType[] = ['text', 'checkbox', 'currency', 'time', 'number', 'textarea', 'date', 'select'];
  templates: TemplateModel[] = [];
  filteredTemplates: TemplateModel[] = [];
  favorites = new Set<string>();
  compareSelection = new Set<string>();
  draftSections: TemplateSection[] = [];
  readonly weddingBlockCatalog: Array<{ id: WeddingBlockId; label: string }> = [
    { id: 'legal', label: 'Legal y contratos' },
    { id: 'venue', label: 'Venue y montaje' },
    { id: 'ceremony', label: 'Ceremonia' },
    { id: 'catering', label: 'Catering y menu' },
    { id: 'photo_video', label: 'Foto y video' },
    { id: 'music_show', label: 'Musica y show' },
    { id: 'guest_experience', label: 'Experiencia invitado' },
    { id: 'vendors_ops', label: 'Control proveedores' },
    { id: 'budget_control', label: 'Control presupuesto' },
    { id: 'transport_logistics', label: 'Transporte y logistica' },
  ];

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
        this.section('Pre-boda', ['Kickoff con pareja', 'Moodboard y estilo', 'Reserva de espacio', 'Plan B clima']),
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
        this.section('Documentacion', ['Contrato espacio', 'Documentacion civil/religiosa', 'Seguro del evento']),
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
    {
      id: 'luxury-signature',
      name: 'Luxury Signature Wedding',
      type: 'CHECKLIST',
      audience: 'mixed',
      description: 'Experiencia de alto nivel con protocolo VIP, concierge y ejecucion impecable.',
      highlights: ['Guest concierge', 'Protocolo VIP', 'Control premium de experiencia'],
      coverUrl: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=1400&q=70',
      schemaJson: { version: 1, sections: [
        this.section('Guest concierge', ['Recepcion VIP', 'Asistencia personalizada', 'Protocolos especiales', 'Welcome amenities']),
        this.section('Curaduria sensorial', ['Musica inmersiva', 'Aroma ambiente', 'Iluminacion escena', 'Ritmo de experiencia']),
        this.section('Control ejecutivo', ['KPI satisfaccion', 'Coste por invitado', 'Puntos criticos', 'Cierre premium']),
      ] },
    },
    {
      id: 'destination-ops',
      name: 'Destination Wedding Ops',
      type: 'TIMELINE',
      audience: 'planner',
      description: 'Operacion para boda destino con logistica de vuelos, alojamiento y planes alternativos.',
      highlights: ['Bloques de traslado', 'Control de habitaciones', 'Plan meteo y contingencia'],
      coverUrl: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1400&q=70',
      schemaJson: { version: 1, sections: [
        this.section('Travel control', ['Vuelos confirmados', 'Transfers aeropuerto', 'Check-in habitaciones', 'Welcome briefing']),
        this.section('Dia B destino', ['Montaje en playa/finca', 'Ritmo ceremonia', 'Coordinacion local', 'Plan alternativo']),
        this.section('Post y retorno', ['Checkout invitados', 'Feedback experiencia', 'Cierre logistica', 'Reporte final']),
      ] },
    },
  ];

  ngOnInit() {
    this.loadFavorites();
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
    if (this.qualityFilter > 0) {
      data = data.filter((item) => this.evaluateTemplateQuality(this.getSections(item.schemaJson)).score >= this.qualityFilter);
    }
    if (this.showFavoritesOnly) data = data.filter((item) => this.favorites.has(item.id));
    if (this.showClientReadyOnly) data = data.filter((item) => this.isClientReadyTemplate(item));
    if (this.sortMode === 'name') data.sort((a, b) => a.name.localeCompare(b.name));
    if (this.sortMode === 'fields') data.sort((a, b) => this.countFields(b.schemaJson) - this.countFields(a.schemaJson));
    if (this.sortMode === 'quality') {
      data.sort(
        (a, b) =>
          this.evaluateTemplateQuality(this.getSections(b.schemaJson)).score -
          this.evaluateTemplateQuality(this.getSections(a.schemaJson)).score,
      );
    }
    if (this.sortMode === 'recent') data.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
    this.filteredTemplates = data;
  }

  resetFilters() {
    this.searchTerm = '';
    this.typeFilter = 'ALL';
    this.sortMode = 'recent';
    this.qualityFilter = 0;
    this.showFavoritesOnly = false;
    this.showClientReadyOnly = false;
    this.applyFilters();
  }

  toggleFavoritesOnly() {
    this.showFavoritesOnly = !this.showFavoritesOnly;
    this.applyFilters();
  }

  toggleClientReadyOnly() {
    this.showClientReadyOnly = !this.showClientReadyOnly;
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

  generateFromBrief() {
    const brief = this.autoBrief.trim();
    const style = this.autoStyle;
    const selectedType = (this.creatorForm.value.type ?? 'CHECKLIST') as TemplateType;
    const profile = this.weddingProfile;

    const generatedSections: TemplateSection[] = [];
    const includeBudget = brief.toLowerCase().includes('presupuesto') || selectedType === 'BUDGET' || this.autoBudget > 0;
    const includeGuests = brief.toLowerCase().includes('invitad') || selectedType === 'GUEST_LIST' || this.autoGuestCount > 0;
    const includeVendors = brief.toLowerCase().includes('proveedor') || selectedType === 'VENDOR_LIST';
    const includeTimeline = brief.toLowerCase().includes('timeline') || selectedType === 'TIMELINE';

    generatedSections.push(
      this.section(
        'Vision del evento',
        style === 'emocional'
          ? ['Historia de la pareja', 'Momentos simbolicos', 'Experiencia invitado', 'Mensaje final']
          : ['Objetivo principal', 'Estilo visual', 'Nivel de servicio', 'Responsable general'],
      ),
    );

    if (profile === 'luxury') {
      generatedSections.push(this.section('Luxury experience', ['Concierge VIP', 'Protocolo de llegada', 'Curaduria sensorial', 'Hospitality premium']));
    }
    if (profile === 'destination') {
      generatedSections.push(this.section('Logistica destino', ['Vuelos y transfers', 'Alojamiento invitados', 'Mapa local', 'Plan meteorologico']));
    }
    if (profile === 'intimate') {
      generatedSections.push(this.section('Experiencia intima', ['Ritual familiar', 'Momentos privados', 'Mesa emocional', 'Memorias personalizadas']));
    }

    if (includeTimeline) {
      generatedSections.push(
        this.section('Timeline operativo', ['Bloques horario', 'Responsables por hito', 'Dependencias', 'Plan B']),
      );
    }

    if (includeBudget) {
      generatedSections.push(
        this.section('Control presupuesto', ['Partida', 'Previsto', 'Real', 'Desviacion']),
      );
    }

    if (includeGuests) {
      generatedSections.push(
        this.section('Gestion invitados', ['RSVP', 'Mesa asignada', 'Alergias', 'Atencion especial']),
      );
    }

    if (includeVendors || style !== 'emocional') {
      generatedSections.push(
        this.section('Proveedores y contratos', ['Proveedor principal', 'Contacto', 'Estado contrato', 'Pago pendiente']),
      );
    }

    generatedSections.push(
      this.section('Cierre y feedback', ['Checklist cierre', 'Satisfaccion cliente', 'Lecciones aprendidas', 'Referidos']),
    );

    this.draftSections = this.normalizeSections(generatedSections);
    this.creatorForm.patchValue({
      name: this.creatorForm.value.name?.trim() || 'Template generado automaticamente',
      description:
        this.creatorForm.value.description?.trim() ||
        `Template ${style} (${this.weddingProfile}) para ${this.autoGuestCount} invitados y presupuesto estimado de €${this.autoBudget}.`,
    });
    this.applyDesignCopyTone();
    this.currentStep = 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  fillPremiumBrief() {
    const profileBrief: Record<WeddingProfile, string> = {
      classic: 'Boda clasica elegante, ceremonia tradicional y foco en organizacion impecable.',
      luxury: 'Boda luxury con experiencia VIP, servicio premium y narrativa sensorial memorable.',
      destination: 'Boda destino con invitados internacionales, logistica de viaje y plan alternativo meteorologico.',
      intimate: 'Boda intima con fuerte componente emocional, pocos invitados y experiencia personalizada.',
    };
    this.autoBrief = profileBrief[this.weddingProfile];
    this.autoStyle = this.weddingProfile === 'luxury' ? 'premium' : this.weddingProfile === 'intimate' ? 'emocional' : 'operativo';
    this.autoGuestCount = this.weddingProfile === 'intimate' ? 45 : this.weddingProfile === 'luxury' ? 180 : 130;
    this.autoBudget = this.weddingProfile === 'luxury' ? 95000 : this.weddingProfile === 'destination' ? 65000 : 38000;
    this.creatorForm.patchValue({
      description: this.creatorForm.value.description || `Plantilla ${this.weddingProfile} diseñada para operación profesional y experiencia cliente de alto nivel.`,
    });
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

  addWeddingBlock(id: WeddingBlockId) {
    this.draftSections.push(this.buildWeddingBlock(id));
  }

  addWedding360Pack() {
    const pack: WeddingBlockId[] = ['ceremony', 'budget_control', 'guest_experience', 'vendors_ops', 'transport_logistics'];
    this.draftSections.push(...pack.map((id) => this.buildWeddingBlock(id)));
    this.draftSections = this.normalizeSections(this.draftSections);
  }

  addClientExperiencePack() {
    const baseSections: TemplateSection[] = [
      this.section('Decisiones de pareja', ['Estilo aprobado', 'Prioridades emocionales', 'No negociables', 'Firma decision']),
      this.section('Comunicacion y aprobaciones', ['Fecha revision semanal', 'Punto de bloqueo', 'Decision pendiente', 'Responsable validacion']),
      this.section('Bienestar invitados', ['Guest welcome', 'Dietas especiales', 'Movilidad reducida', 'Plan atencion familias']),
    ];
    this.draftSections = this.normalizeSections([...this.draftSections, ...baseSections]);
    this.creatorForm.patchValue({ audience: 'mixed', tone: 'detailed' });
    this.generatePreview();
  }

  optimizeDraftOneClick() {
    this.autoFillBySelectedType();
    this.addSuggestedBlocks();
    this.addDayBExecutionPack();
    this.addBudgetMilestonesPack();
    this.professionalizeDraftContent();
    this.applyDesignCopyTone();
    this.generatePreview();
  }

  autoCompletePremiumTemplate() {
    const profilePack: Record<WeddingProfile, TemplateSection> = {
      classic: this.section('Protocolo tradicional', ['Orden ceremonia', 'Protocolo familias', 'Timing cortejo', 'Checklist etiqueta']),
      luxury: this.section('Servicio concierge VIP', ['Host premium', 'Amenities invitados', 'Seguimiento alto valor', 'Cierre experiencia']),
      destination: this.section('Travel desk', ['Tracking vuelos', 'Transfers coordinados', 'Habitaciones confirmadas', 'Asistencia local']),
      intimate: this.section('Momentos intimos', ['Ritual privado', 'Discurso personalizado', 'Mesa recuerdos', 'Cierre emocional']),
    };
    this.draftSections = this.normalizeSections([...this.draftSections, profilePack[this.weddingProfile]]);
    if ((this.creatorForm.value.type ?? 'CHECKLIST') === 'GUEST_LIST') {
      this.addGuestMaster360Pack();
    }
    this.autoFillDraftFields();
    this.professionalizeDraftContent();
    this.applyAudienceLens();
    this.applyDesignCopyTone();
  }

  runAiQuickAssist() {
    this.autoCompletePremiumTemplate();
    this.addSuggestedBlocks();
    this.autoCompleteDraftCriticalBlocks();
    this.autoFillDraftFields();
    this.professionalizeDraftContent();
  }

  aiAutoGenerateGuestJourney() {
    this.creatorForm.patchValue({ type: 'GUEST_LIST', audience: 'mixed', tone: 'detailed' });
    this.addGuestMaster360Pack();
    this.draftSections = this.normalizeSections([
      ...this.draftSections,
      this.section('Comunicacion previa', ['Save the date enviado', 'Canal de soporte', 'FAQ invitados', 'Recordatorio final']),
      this.section('Experiencia en evento', ['Recepcion personalizada', 'Mesa asignada', 'Atencion alergias', 'Feedback en vivo']),
    ]);
    this.autoFillDraftFields();
    this.professionalizeDraftContent();
    this.generatePreview();
  }

  addDayBExecutionPack() {
    const executionSection: TemplateSection = {
      title: 'Ejecucion Dia B',
      description: 'Control minuto a minuto en ceremonia, banquete y fiesta.',
      fields: [
        { key: 'hora_briefing_staff', label: 'Hora briefing staff', type: 'time', required: true },
        { key: 'responsable_sala', label: 'Responsable de sala', type: 'text', required: true },
        { key: 'check_audio_luces', label: 'Check audio y luces', type: 'checkbox', required: true },
        { key: 'incidencias_en_vivo', label: 'Incidencias en vivo', type: 'textarea', required: false },
      ],
    };
    this.draftSections = this.normalizeSections([...this.draftSections, executionSection]);
  }

  addBudgetMilestonesPack() {
    const budgetSection: TemplateSection = {
      title: 'Hitos de pago y contratos',
      description: 'Seguimiento financiero por vencimientos y aprobaciones.',
      fields: [
        { key: 'hito_reserva', label: 'Hito de reserva', type: 'currency', required: true },
        { key: 'fecha_vencimiento_hito', label: 'Fecha de vencimiento', type: 'date', required: true },
        { key: 'estado_pago_hito', label: 'Estado pago hito', type: 'select', required: true },
        { key: 'riesgo_financiero', label: 'Riesgo financiero', type: 'text', required: false },
      ],
    };
    this.draftSections = this.normalizeSections([...this.draftSections, budgetSection]);
  }

  addGuestMaster360Pack() {
    const rsvpSection: TemplateSection = {
      title: 'RSVP inteligente',
      description: 'Control centralizado de confirmaciones por canal y prioridad.',
      fields: [
        { key: 'nombre_invitado', label: 'Nombre invitado', type: 'text', required: true },
        { key: 'canal_confirmacion', label: 'Canal confirmacion', type: 'select', required: true },
        { key: 'estado_rsvp', label: 'Estado RSVP', type: 'select', required: true },
        { key: 'plus_one', label: 'Acompanante confirmado', type: 'checkbox', required: false },
      ],
    };
    const seatingSection: TemplateSection = {
      title: 'Seating y alergias',
      description: 'Asignacion de mesa, menu y necesidades especiales.',
      fields: [
        { key: 'mesa_asignada', label: 'Mesa asignada', type: 'text', required: true },
        { key: 'menu_preferente', label: 'Menu preferente', type: 'select', required: false },
        { key: 'alergias_restricciones', label: 'Alergias y restricciones', type: 'textarea', required: false },
        { key: 'movilidad_reducida', label: 'Movilidad reducida', type: 'checkbox', required: false },
      ],
    };
    this.draftSections = this.normalizeSections([...this.draftSections, rsvpSection, seatingSection]);
  }

  normalizeDraftKeys() {
    this.draftSections = this.normalizeSections(
      this.draftSections.map((section, sectionIndex) => ({
        ...section,
        fields: section.fields.map((field, fieldIndex) => ({
          ...field,
          key: this.slugify(field.key || `${section.title}_${sectionIndex + 1}_${fieldIndex + 1}`),
        })),
      })),
    );
  }

  applyAudienceLens() {
    const audience = this.creatorForm.value.audience ?? 'mixed';
    if (audience === 'client') {
      this.applyClientPolishToDraft();
      return;
    }
    if (audience === 'planner') {
      this.professionalizeDraftContent();
      this.addSuggestedBlocks();
      return;
    }
    this.professionalizeDraftContent();
  }

  applyDesignCopyTone() {
    const suffixByTheme: Record<PremiumTheme, string> = {
      editorial: 'Presentacion editorial elegante con narrativa visual.',
      minimal: 'Diseño limpio de lectura rapida para ejecucion operativa.',
      cinematic: 'Estetica cinematica con foco en momentos de alto impacto.',
    };
    const current = this.creatorForm.value.description?.trim() ?? '';
    const base = current.replace(/\s\|\sTema:.*$/g, '');
    this.creatorForm.patchValue({
      description: `${base || 'Template profesional para wedding planner y cliente'} | Tema: ${suffixByTheme[this.premiumTheme]}`,
    });
  }

  autoFillBySelectedType() {
    const selected = (this.creatorForm.value.type ?? 'CHECKLIST') as TemplateType;
    const block: Record<TemplateType, 'checklist' | 'timeline' | 'budget' | 'guests' | 'vendors'> = {
      CHECKLIST: 'checklist',
      TIMELINE: 'timeline',
      BUDGET: 'budget',
      GUEST_LIST: 'guests',
      VENDOR_LIST: 'vendors',
    };
    if (!this.draftSections.length) {
      this.draftSections = [{ title: this.toLabel(selected), description: 'Base editable', fields: [] }];
    }
    this.draftSections = this.normalizeSections(
      this.draftSections.map((section) => ({
        ...section,
        fields: section.fields.length ? section.fields : this.buildFields(block[selected], 'detailed'),
      })),
    );
    this.professionalizeDraftContent();
  }

  addSuggestedBlocks() {
    const selectedType = (this.creatorForm.value.type ?? 'CHECKLIST') as TemplateType;
    const wantedByType: Record<TemplateType, WeddingBlockId[]> = {
      CHECKLIST: ['legal', 'ceremony', 'guest_experience', 'vendors_ops'],
      TIMELINE: ['ceremony', 'transport_logistics', 'photo_video', 'music_show'],
      BUDGET: ['budget_control', 'vendors_ops', 'catering'],
      GUEST_LIST: ['guest_experience', 'transport_logistics', 'catering'],
      VENDOR_LIST: ['vendors_ops', 'legal', 'budget_control'],
    };

    const existingTitles = new Set(this.draftSections.map((section) => section.title.toLowerCase()));
    const suggested = wantedByType[selectedType]
      .map((id) => this.buildWeddingBlock(id))
      .filter((section) => !existingTitles.has(section.title.toLowerCase()));

    if (suggested.length) {
      this.draftSections = this.normalizeSections([...this.draftSections, ...suggested]);
    }
    this.generatePreview();
  }

  professionalizeDraftContent() {
    this.draftSections = this.normalizeSections(
      this.draftSections.map((section, sectionIndex) => ({
        ...section,
        title: this.professionalizeTitle(section.title || `Bloque ${sectionIndex + 1}`),
        description:
          section.description?.trim() ||
          `Bloque operativo para wedding planner con foco en coordinacion y experiencia de los novios.`,
        fields: section.fields.map((field, fieldIndex) => this.professionalizeField(field, section.title, fieldIndex)),
      })),
    );
    this.applyDesignCopyTone();
    this.generatePreview();
  }

  smartFillSection(sectionIndex: number) {
    const section = this.draftSections[sectionIndex];
    if (!section) return;
    const title = section.title.toLowerCase();
    const hasFields = section.fields.length > 0;

    if (!hasFields) {
      if (title.includes('ceremonia')) section.fields = this.buildWeddingBlock('ceremony').fields;
      else if (title.includes('presupuesto') || title.includes('budget')) section.fields = this.buildWeddingBlock('budget_control').fields;
      else if (title.includes('invitad')) section.fields = this.buildWeddingBlock('guest_experience').fields;
      else if (title.includes('proveedor')) section.fields = this.buildWeddingBlock('vendors_ops').fields;
      else if (title.includes('transporte')) section.fields = this.buildWeddingBlock('transport_logistics').fields;
      else section.fields = this.buildFields('checklist', 'balanced');
    } else {
      section.fields = section.fields.map((field, fieldIndex) => this.professionalizeField(field, section.title, fieldIndex));
    }
    section.description =
      section.description?.trim() ||
      `Control profesional de ${section.title || 'bloque'} con enfoque operativo y trazabilidad.`;
    this.draftSections = this.normalizeSections([...this.draftSections]);
  }

  professionalizeSection(sectionIndex: number) {
    const section = this.draftSections[sectionIndex];
    if (!section) return;
    section.title = this.professionalizeTitle(section.title);
    section.description =
      section.description?.trim() ||
      'Bloque profesional para coordinar decisiones, responsables, fechas y validaciones del evento.';
    section.fields = section.fields.map((field, fieldIndex) =>
      this.professionalizeField(field, section.title, fieldIndex),
    );
    this.draftSections = this.normalizeSections([...this.draftSections]);
  }

  addSection() {
    this.draftSections.push({
      title: 'Coordinacion operativa',
      description: 'Bloque de control real para seguimiento de entregables y responsables.',
      fields: [
        { key: 'responsable_bloque', label: 'Responsable principal del bloque', type: 'text' },
        { key: 'fecha_limite_bloque', label: 'Fecha limite de cierre', type: 'date' },
      ],
    });
  }
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
  addField(sectionIndex: number) {
    const seed = this.getRealFieldSeed(this.draftSections[sectionIndex]?.title ?? '', this.draftSections[sectionIndex].fields.length);
    this.draftSections[sectionIndex].fields.push(seed);
  }
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

  renameTemplate(template: TemplateModel) {
    const nextName = window.prompt('Nuevo nombre de la plantilla', template.name)?.trim();
    if (!nextName || nextName === template.name) return;
    this.http
      .patch(`http://localhost:3000/api/v1/templates/${template.id}`, { name: nextName })
      .subscribe(() => this.load());
  }

  createClientVersion(template: TemplateModel) {
    const baseSections = this.getSections(template.schemaJson).map((section) => ({
      ...section,
      fields: section.fields
        .filter((field) => !field.key.toLowerCase().includes('coste') && !field.key.toLowerCase().includes('pago'))
        .map((field) => ({
          ...field,
          required: field.type === 'checkbox' ? false : field.required,
        })),
    }));

    this.http
      .post<TemplateModel>('http://localhost:3000/api/v1/templates', {
        name: `${template.name} (cliente)`,
        type: template.type,
        description: `${template.description ?? 'Version cliente simplificada.'} · Vista cliente`,
        schemaJson: { version: 1, sections: this.normalizeSections(baseSections) },
      })
      .subscribe(() => this.load());
  }

  loadTemplateIntoBuilder(template: TemplateModel) {
    this.creatorForm.patchValue({
      name: template.name,
      type: template.type,
      description: template.description ?? '',
    });
    this.draftSections = this.normalizeSections(this.getSections(template.schemaJson));
    this.currentStep = 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  exportTemplateJson(template: TemplateModel) {
    this.downloadJson(`${template.name}.json`, {
      name: template.name,
      type: template.type,
      description: template.description ?? '',
      schemaJson: template.schemaJson,
    });
  }

  aiEnhanceTemplate(template: TemplateModel) {
    const base = this.normalizeSections(this.getSections(template.schemaJson)).map((section, sectionIndex) => ({
      ...section,
      title: this.professionalizeTitle(section.title),
      description:
        section.description?.trim() || `Bloque operativo wedding para ${this.toLabel(template.type).toLowerCase()}.`,
      fields: section.fields.map((field, fieldIndex) =>
        this.professionalizeField(field, section.title, fieldIndex),
      ),
    }));

    const requiredByType: Record<TemplateType, Array<{ section: string; label: string; type: TemplateFieldType }>> = {
      CHECKLIST: [
        { section: 'Pre-boda', label: 'Prioridad de tarea', type: 'select' },
        { section: 'Pre-boda', label: 'Responsable asignado', type: 'text' },
      ],
      TIMELINE: [
        { section: 'Dia B operativo', label: 'Hora objetivo', type: 'time' },
        { section: 'Dia B operativo', label: 'Dependencia previa', type: 'text' },
      ],
      BUDGET: [
        { section: 'Control presupuesto', label: 'Importe comprometido', type: 'currency' },
        { section: 'Control presupuesto', label: 'Estado de pago', type: 'select' },
      ],
      GUEST_LIST: [
        { section: 'Guest master', label: 'Menu asignado', type: 'select' },
        { section: 'Guest master', label: 'Confirmacion RSVP', type: 'select' },
      ],
      VENDOR_LIST: [
        { section: 'Vendor ops', label: 'SLA acordado', type: 'text' },
        { section: 'Vendor ops', label: 'Riesgo de entrega', type: 'select' },
      ],
    };

    const next = [...base];
    requiredByType[template.type].forEach((item, index) => {
      let section = next.find((entry) => entry.title.toLowerCase().includes(item.section.toLowerCase()));
      if (!section) {
        section = { title: item.section, description: 'Bloque generado por IA', fields: [] };
        next.push(section);
      }
      const exists = section.fields.some(
        (field) => field.label.toLowerCase() === item.label.toLowerCase() || field.key.includes(this.slugify(item.label)),
      );
      if (!exists) {
        section.fields.push({
          key: this.slugify(`${item.label}_${index + 1}`),
          label: item.label,
          type: item.type,
          required: item.type !== 'checkbox',
        });
      }
    });

    const description = template.description?.trim()
      ? `${template.description.trim()} · Mejorado por IA`
      : 'Plantilla profesional optimizada por IA para wedding planner.';

    this.http
      .patch(`http://localhost:3000/api/v1/templates/${template.id}`, {
        name: template.name,
        type: template.type,
        description,
        schemaJson: { version: 1, sections: this.normalizeSections(next) },
      })
      .subscribe(() => {
        this.coreActionText = `IA: ${template.name} optimizada con campos wedding pro.`;
        this.load();
      });
  }

  exportTemplatePdf(template: TemplateModel) {
    const sections = this.getSections(template.schemaJson);
    openTemplatePdfPreview({
      title: template.name,
      subtitle: template.description ?? 'Plantilla wedding lista para produccion.',
      theme: this.pdfThemeForType(template.type),
      meta: [
        { label: 'Tipo', value: this.toLabel(template.type) },
        { label: 'Secciones', value: sections.length },
        { label: 'Campos', value: this.countFields(template.schemaJson) },
        { label: 'Score', value: `${this.evaluateTemplateQuality(sections).score}/100` },
      ],
      sections: sections.map((section) => ({
        title: section.title,
        description: section.description,
        fields: section.fields.map((field) => ({ label: field.label, type: field.type })),
      })),
    });
  }

  exportDraftJson() {
    if (!this.previewDraft) return;
    this.downloadJson(`${this.previewDraft.name}.json`, this.previewDraft);
  }

  exportDraftPdf() {
    if (!this.previewDraft) return;
    openTemplatePdfPreview({
      title: this.previewDraft.name,
      subtitle: this.previewDraft.description || 'Vista previa para validacion de cliente.',
      theme: this.pdfThemeForType(this.previewDraft.type),
      meta: [
        { label: 'Tipo', value: this.toLabel(this.previewDraft.type) },
        { label: 'Secciones', value: this.previewDraft.schemaJson.sections.length },
        { label: 'Campos', value: this.countFields(this.previewDraft.schemaJson) },
        { label: 'Score', value: `${this.evaluateTemplateQuality(this.previewDraft.schemaJson.sections).score}/100` },
      ],
      sections: this.previewDraft.schemaJson.sections.map((section) => ({
        title: section.title,
        description: section.description,
        fields: section.fields.map((field) => ({ label: field.label, type: field.type })),
      })),
    });
  }

  deleteTemplate(template: TemplateModel) {
    if (!window.confirm(`Eliminar template "${template.name}"?`)) return;
    this.http.delete(`http://localhost:3000/api/v1/templates/${template.id}`).subscribe(() => {
      this.favorites.delete(template.id);
      this.compareSelection.delete(template.id);
      this.persistFavorites();
      this.load();
    });
  }

  openBigPreviewFromExample(item: ExampleTemplate) {
    this.bigPreview = { title: item.name, description: item.description, type: item.type, coverUrl: item.coverUrl, sections: item.schemaJson.sections, audience: item.audience };
    this.bigPreviewFx = 'standard';
    this.bigPreviewFilter = 'all';
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
    this.bigPreviewFx = 'standard';
    this.bigPreviewFilter = 'all';
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
    this.bigPreviewFx = 'standard';
    this.bigPreviewFilter = 'all';
  }

  closeBigPreview() {
    this.bigPreview = null;
    this.bigPreviewFx = 'standard';
    this.bigPreviewFilter = 'all';
  }

  toggleBigPreviewFx() {
    this.bigPreviewFx = this.bigPreviewFx === 'standard' ? 'executive' : 'standard';
  }

  exportBigPreviewPdf() {
    if (!this.bigPreview) return;
    openTemplatePdfPreview({
      title: this.bigPreview.title,
      subtitle: this.bigPreview.description,
      theme: this.pdfThemeForType(this.bigPreview.type),
      meta: [
        { label: 'Tipo', value: this.toLabel(this.bigPreview.type) },
        { label: 'Audiencia', value: this.audienceLabel(this.bigPreview.audience) },
        { label: 'Secciones', value: this.bigPreview.sections.length },
        { label: 'Score', value: `${this.evaluateTemplateQuality(this.bigPreview.sections).score}/100` },
      ],
      sections: this.filteredBigPreviewSections.map((section) => ({
        title: section.title,
        description: section.description,
        fields: section.fields.map((field) => ({ label: field.label, type: field.type })),
      })),
    });
  }

  toggleFavorite(templateId: string) {
    if (this.favorites.has(templateId)) this.favorites.delete(templateId);
    else this.favorites.add(templateId);
    this.persistFavorites();
    this.applyFilters();
  }

  isFavorite(templateId: string) {
    return this.favorites.has(templateId);
  }

  toggleCompare(template: TemplateModel) {
    if (this.compareSelection.has(template.id)) {
      this.compareSelection.delete(template.id);
      return;
    }
    if (this.compareSelection.size >= this.maxCompare) return;
    this.compareSelection.add(template.id);
  }

  isCompared(templateId: string) {
    return this.compareSelection.has(templateId);
  }

  openCompareModal() {
    if (this.compareSelection.size < 2) return;
    this.showCompareModal = true;
  }

  closeCompareModal() {
    this.showCompareModal = false;
  }

  get comparedTemplates(): CompareItem[] {
    return this.templates
      .filter((item) => this.compareSelection.has(item.id))
      .map((item) => {
        const sections = this.getSections(item.schemaJson);
        const quality = this.evaluateTemplateQuality(sections);
        return {
          id: item.id,
          name: item.name,
          type: item.type,
          sections: sections.length,
          fields: this.countFields(item.schemaJson),
          score: quality.score,
          missingCritical: quality.missingCritical,
        };
      });
  }

  get filteredBigPreviewSections() {
    if (!this.bigPreview) return [] as TemplateSection[];
    if (this.bigPreviewFilter === 'all') return this.bigPreview.sections;
    const matcherByFilter: Record<'guest' | 'budget' | 'ops', string[]> = {
      guest: ['invitad', 'guest', 'rsvp', 'mesa', 'alergias'],
      budget: ['presupuesto', 'budget', 'pago', 'coste', 'financ'],
      ops: ['timeline', 'dia b', 'operacion', 'proveedor', 'logistica'],
    };
    const matchers = matcherByFilter[this.bigPreviewFilter];
    return this.bigPreview.sections.filter((section) => {
      const haystack = `${section.title} ${section.description ?? ''} ${section.fields.map((f) => `${f.label} ${f.key}`).join(' ')}`.toLowerCase();
      return matchers.some((item) => haystack.includes(item));
    });
  }

  get avgQualityScore() {
    if (!this.templates.length) return 0;
    const total = this.templates.reduce(
      (acc, template) => acc + this.evaluateTemplateQuality(this.getSections(template.schemaJson)).score,
      0,
    );
    return Math.round(total / this.templates.length);
  }

  get premiumReadyTemplates() {
    return this.templates.filter((template) => {
      const sections = this.getSections(template.schemaJson);
      const quality = this.evaluateTemplateQuality(sections).score;
      const fields = this.countFields(template.schemaJson);
      return quality >= 78 && fields >= 14;
    }).length;
  }

  get templatesNeedingAttention() {
    return this.templates.filter((template) => {
      const score = this.evaluateTemplateQuality(this.getSections(template.schemaJson)).score;
      return score < 60 || this.countFields(template.schemaJson) < 8;
    }).length;
  }

  get clientReadyCoveragePercent() {
    if (!this.templates.length) return 0;
    const ready = this.templates.filter((template) => this.isClientReadyTemplate(template)).length;
    return Math.round((ready / this.templates.length) * 100);
  }

  get templateDocsReadinessScore() {
    const base = this.avgQualityScore * 0.45 + this.clientReadyCoveragePercent * 0.35 + this.premiumReadyTemplates * 4;
    const penalty = this.templatesNeedingAttention * 3;
    return Math.max(10, Math.min(100, Math.round(base - penalty + this.templates.length)));
  }

  get templateVisibilityLabel() {
    if (this.templateDocsReadinessScore >= 75) return 'Alta visibilidad';
    if (this.templateDocsReadinessScore >= 50) return 'Visibilidad media';
    return 'Visibilidad baja';
  }

  get aiLibraryNarrative() {
    if (!this.templates.length) {
      return 'IA: crea una plantilla core para empezar a construir biblioteca reusable y medible.';
    }
    if (this.missingTemplateTypes.length) {
      return `IA: completa cobertura core (${this.missingTemplateTypes.join(', ')}) para acelerar documentos por evento.`;
    }
    if (this.templatesNeedingAttention) {
      return `IA: ${this.templatesNeedingAttention} plantilla(s) necesitan refuerzo de campos o bloques críticos.`;
    }
    return 'IA: biblioteca sólida. Prioriza conversión a cliente, presentación visual y packs premium.';
  }

  get templateProgressHighlights() {
    const items: Array<{ title: string; detail: string }> = [];
    if (this.premiumReadyTemplates) {
      items.push({
        title: 'Base premium reusable',
        detail: `${this.premiumReadyTemplates} plantilla(s) tienen profundidad suficiente para demos y operación real.`,
      });
    }
    if (this.clientReadyCoveragePercent >= 40) {
      items.push({
        title: 'Mejora de experiencia cliente',
        detail: `${this.clientReadyCoveragePercent}% de la biblioteca ya puede usarse en flujo cliente.`,
      });
    }
    if (this.templatesNeedingAttention) {
      items.push({
        title: 'Backlog de calidad',
        detail: `Hay ${this.templatesNeedingAttention} plantilla(s) con oportunidad de mejora rápida con IA.`,
      });
    }
    if (this.compareSelection.size >= 2) {
      items.push({
        title: 'Trabajo de curación activo',
        detail: `${this.compareSelection.size} plantillas en comparador para decisión de catálogo.`,
      });
    }
    return items.slice(0, 4);
  }

  get topTemplateCandidates() {
    return [...this.templates]
      .map((template) => {
        const sections = this.getSections(template.schemaJson);
        const quality = this.evaluateTemplateQuality(sections).score;
        const fields = this.countFields(template.schemaJson);
        const score = Math.round(quality * 0.7 + Math.min(100, fields * 3) * 0.3);
        return { ...template, score, fields };
      })
      .sort((a, b) => b.score - a.score || b.fields - a.fields)
      .slice(0, 3);
  }

  get templateLaunchScore() {
    if (!this.templates.length) return 0;
    const score =
      this.avgQualityScore * 0.35 +
      this.clientReadyCoveragePercent * 0.3 +
      this.templateDocsReadinessScore * 0.2 +
      (this.premiumReadyTemplates / Math.max(1, this.templates.length)) * 100 * 0.15;
    return Math.max(10, Math.min(100, Math.round(score)));
  }

  get templateOpsBacklog() {
    const items: Array<{ title: string; detail: string }> = [];
    if (this.missingTemplateTypes.length) {
      items.push({
        title: 'Cobertura core incompleta',
        detail: `Completa ${this.missingTemplateTypes.join(', ')} para cubrir briefs y entregables base.`,
      });
    }
    if (this.templatesNeedingAttention) {
      items.push({
        title: 'Refuerzo de calidad',
        detail: `${this.templatesNeedingAttention} plantilla(s) necesitan más bloques/campos o textos más profesionales.`,
      });
    }
    if (this.clientReadyCoveragePercent < 50 && this.templates.length) {
      items.push({
        title: 'Conversion cliente',
        detail: 'Falta adaptar más templates a lenguaje/flujo cliente para acelerar entregas.',
      });
    }
    if (this.compareSelection.size > 0) {
      items.push({
        title: 'Decisiones de catálogo pendientes',
        detail: `${this.compareSelection.size} plantilla(s) en comparador esperando decisión de publicación.`,
      });
    }
    return items.slice(0, 5);
  }

  get templatePortfolioModeLabel() {
    if (this.templateLaunchScore >= 80) return 'Modo escalar';
    if (this.templateLaunchScore >= 55) return 'Modo optimizar';
    return 'Modo consolidar';
  }

  get aiTemplatePortfolioNarrative() {
    if (!this.templates.length) {
      return 'IA: crea plantillas core y un primer template premium para activar el portfolio.';
    }
    if (this.templateOpsBacklog.length) {
      return `IA: foco inmediato en ${this.templateOpsBacklog[0].title.toLowerCase()} para subir valor del catálogo.`;
    }
    return 'IA: portfolio sólido. Próximo salto: diseño visual avanzado, packs premium y variantes por perfil de boda.';
  }

  get missingTemplateTypes() {
    const present = new Set(this.templates.map((template) => template.type));
    return this.types.filter((type) => !present.has(type)).map((type) => this.toLabel(type));
  }

  get coreCoverageLabel() {
    const present = new Set(this.templates.map((template) => template.type));
    const covered = this.types.filter((type) => present.has(type)).length;
    return `${covered}/${this.types.length}`;
  }

  get draftMissingCritical() {
    if (!this.previewDraft) return [] as string[];
    return this.evaluateTemplateQuality(this.previewDraft.schemaJson.sections).missingCritical;
  }

  get draftAiRecommendations() {
    const hints: string[] = [];
    const sectionCount = this.draftSections.length;
    const fieldCount = this.draftSections.reduce((acc, section) => acc + section.fields.length, 0);
    if (sectionCount < 4) hints.push('Añade mas secciones para cubrir pre-boda, dia B y post-boda.');
    if (fieldCount < 16) hints.push('Incrementa campos para mayor control operativo en boda real.');
    if (this.draftMissingCritical.length) hints.push(`Faltan bloques core: ${this.draftMissingCritical.join(', ')}.`);
    if ((this.creatorForm.value.audience ?? 'mixed') === 'client') {
      hints.push('Incluye más campos de decisión emocional y experiencia invitado.');
    }
    return hints.slice(0, 4);
  }

  get draftAiScore() {
    const score = 100 - this.draftAiRecommendations.length * 12 + Math.min(18, this.draftSections.length * 2);
    return Math.max(35, Math.min(100, score));
  }

  async createMissingCoreTemplates() {
    const present = new Set(this.templates.map((template) => template.type));
    const missing = this.types.filter((type) => !present.has(type));
    if (this.bulkCreating) return;
    if (!missing.length) {
      this.coreActionText = 'Biblioteca core ya completa. Puedes lanzar IA Portfolio Optimizer.';
      return;
    }

    this.bulkCreating = true;
    this.coreActionText = 'Generando plantillas core...';
    let created = 0;
    let failed = 0;

    for (const type of missing) {
      try {
        await firstValueFrom(
          this.http.post<TemplateModel>('http://localhost:3000/api/v1/templates', this.buildCoreTemplate(type)),
        );
        created += 1;
      } catch {
        failed += 1;
      }
    }

    this.bulkCreating = false;
    this.coreActionText =
      failed === 0
        ? `Core actualizado: ${created} plantilla(s) creada(s).`
        : `Core parcial: ${created} creadas, ${failed} con error.`;
    this.load();
  }

  runAiPortfolioOptimizer() {
    this.createMissingCoreTemplates();
    if (this.previewDraft) {
      this.autoCompleteDraftCriticalBlocks();
      this.professionalizeDraftContent();
    }
    this.applyFilters();
  }

  runAiPremiumLaunchPack() {
    if (!this.templates.length) {
      this.coreActionText = 'IA Premium Launch Pack: crea primero una plantilla base.';
      return;
    }
    this.runAiCatalogPolishPass();
    if (this.templateDocsReadinessScore < 70) {
      this.coreActionText = 'IA Premium Launch Pack: catálogo ordenado. Recomendado reforzar client-ready y bloques críticos.';
      return;
    }
    this.coreActionText = `IA Premium Launch Pack: portfolio listo para impulsar templates top (${this.topTemplateCandidates.map((t) => t.name).join(', ')}).`;
  }

  applyTemplateWorkbenchView() {
    this.showFavoritesOnly = false;
    this.showClientReadyOnly = false;
    this.sortMode = 'quality';
    this.qualityFilter = Math.max(this.qualityFilter, 40);
    this.applyFilters();
    this.coreActionText = 'Vista workbench: backlog amplio con orden por calidad para curación y mejora rápida.';
  }

  runAiCatalogPolishPass() {
    this.qualityFilter = Math.max(this.qualityFilter, 50);
    this.sortMode = 'quality';
    this.showClientReadyOnly = false;
    this.applyFilters();
    this.coreActionText = `IA Catalog Polish: vista ordenada por calidad y filtro mínimo ${this.qualityFilter}/100.`;
  }

  applyHighImpactLibraryView() {
    this.showFavoritesOnly = false;
    this.showClientReadyOnly = true;
    this.sortMode = 'quality';
    this.qualityFilter = 60;
    this.applyFilters();
    this.coreActionText = 'Vista alto impacto: templates client-ready + mejor calidad primero.';
  }

  openTopTemplateEditor() {
    if (!this.templates.length) return;
    const top = [...this.templates].sort((a, b) => {
      const scoreA = this.evaluateTemplateQuality(this.getSections(a.schemaJson)).score;
      const scoreB = this.evaluateTemplateQuality(this.getSections(b.schemaJson)).score;
      const fieldsA = this.countFields(a.schemaJson);
      const fieldsB = this.countFields(b.schemaJson);
      return scoreB - scoreA || fieldsB - fieldsA;
    })[0];
    if (!top) return;
    this.router.navigate(['/app/templates', top.id]);
  }

  runAiRiskAudit() {
    if (!this.previewDraft) {
      this.coreActionText = 'IA Risk Audit: crea o abre una vista previa primero.';
      return;
    }
    const report = this.evaluateTemplateQuality(this.previewDraft.schemaJson.sections);
    this.coreActionText = report.missingCritical.length
      ? `IA Risk Audit: faltan ${report.missingCritical.join(', ')}.`
      : 'IA Risk Audit: sin huecos criticos.';
  }

  runAiRevenuePack() {
    this.addBudgetMilestonesPack();
    this.addWeddingBlock('vendors_ops');
    this.professionalizeDraftContent();
    this.generatePreview();
    this.coreActionText = 'IA Revenue Pack aplicado: presupuesto, pagos y proveedores reforzados.';
  }

  autoCompleteDraftCriticalBlocks() {
    const missing = this.draftMissingCritical;
    if (!missing.length) return;
    const current = [...this.draftSections];

    missing.forEach((label) => {
      if (label === 'Cronograma') current.push(this.buildWeddingBlock('ceremony'));
      if (label === 'Presupuesto') current.push(this.buildWeddingBlock('budget_control'));
      if (label === 'Invitados') current.push(this.buildWeddingBlock('guest_experience'));
      if (label === 'Proveedores') current.push(this.buildWeddingBlock('vendors_ops'));
    });

    this.draftSections = this.normalizeSections(current);
    this.generatePreview();
  }

  autoFillDraftFields() {
    this.draftSections = this.normalizeSections(
      this.draftSections.map((section, sectionIndex) => ({
        ...section,
        fields: section.fields.map((field, fieldIndex) => {
          const key = this.slugify(field.key || field.label || `campo_${sectionIndex + 1}_${fieldIndex + 1}`);
          const label =
            field.label?.trim() ||
            key
              .split('_')
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' ');
          return {
            ...field,
            key,
            label,
            required: field.required ?? fieldIndex < 2,
          };
        }),
      })),
    );
  }

  applyClientPolishToDraft() {
    this.draftSections = this.normalizeSections(
      this.draftSections.map((section) => ({
        ...section,
        title: section.title.replace('Control', 'Resumen').replace('Operacion', 'Plan'),
        fields: section.fields
          .filter((field) => !field.key.toLowerCase().includes('riesgo'))
          .map((field) => ({
            ...field,
            label: field.label
              .replace('Responsable', 'Persona encargada')
              .replace('Estado', 'Estado de avance'),
            required: field.type === 'checkbox' ? false : field.required,
          })),
      })),
    );
    this.creatorForm.patchValue({ audience: 'client', tone: 'balanced' });
    this.generatePreview();
  }

  isClientReadyTemplate(template: TemplateModel) {
    const sections = this.getSections(template.schemaJson);
    const quality = this.evaluateTemplateQuality(sections);
    const fieldCount = this.countFields(template.schemaJson);
    return quality.score >= 68 && fieldCount >= 8;
  }

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
  evaluateTemplateQuality(sections: TemplateSection[]): QualityReport {
    const names = sections.map((section) => section.title.toLowerCase());
    const critical: Array<[string, string[]]> = [
      ['Cronograma', ['timeline', 'cronograma', 'dia b']],
      ['Presupuesto', ['presupuesto', 'budget', 'costes']],
      ['Invitados', ['invitados', 'guest', 'mesa', 'rsvp']],
      ['Proveedores', ['proveedor', 'vendor']],
    ];
    const missingCritical = critical
      .filter(([, matchers]) => !matchers.some((matcher) => names.some((value) => value.includes(matcher))))
      .map(([label]) => label);

    const fieldCount = sections.reduce((acc, section) => acc + section.fields.length, 0);
    const baseScore = Math.min(50, sections.length * 10) + Math.min(30, fieldCount * 2);
    const qualityPenalty = missingCritical.length * 8;
    const score = Math.max(20, Math.min(100, baseScore + 20 - qualityPenalty));
    return { score, missingCritical };
  }
  toLabel(type: TemplateType) { return type.replace('_', ' '); }
  pdfThemeForType(type: TemplateType): PdfTheme {
    if (type === 'TIMELINE') return 'timeline';
    if (type === 'BUDGET') return 'budget';
    if (type === 'GUEST_LIST') return 'guest';
    if (type === 'VENDOR_LIST') return 'vendor';
    return 'checklist';
  }

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

  onBigPreviewMove(event: MouseEvent) {
    const hero = event.currentTarget as HTMLElement;
    const rect = hero.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    hero.style.setProperty('--pmx', `${px * 100}%`);
    hero.style.setProperty('--pmy', `${py * 100}%`);
    hero.style.setProperty('--prx', `${(0.5 - py) * 5}deg`);
    hero.style.setProperty('--pry', `${(px - 0.5) * 7}deg`);
  }

  onBigPreviewLeave(event: MouseEvent) {
    const hero = event.currentTarget as HTMLElement;
    hero.style.setProperty('--pmx', '50%');
    hero.style.setProperty('--pmy', '50%');
    hero.style.setProperty('--prx', '0deg');
    hero.style.setProperty('--pry', '0deg');
  }

  @HostListener('window:keydown', ['$event'])
  handleTemplateShortcuts(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    const isTyping =
      target?.tagName === 'INPUT' ||
      target?.tagName === 'TEXTAREA' ||
      target?.tagName === 'SELECT' ||
      target?.isContentEditable;
    if (isTyping) return;

    if (event.key === 'Escape' && this.bigPreview) {
      event.preventDefault();
      this.closeBigPreview();
      return;
    }

    if (this.currentStep === 2 && event.ctrlKey && event.altKey && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      this.optimizeDraftOneClick();
      return;
    }

    if (this.currentStep === 2 && event.ctrlKey && event.altKey && event.key.toLowerCase() === 'd') {
      event.preventDefault();
      this.addDayBExecutionPack();
      this.professionalizeDraftContent();
      return;
    }

    if (this.currentStep === 2 && event.ctrlKey && event.altKey && event.key.toLowerCase() === 'g') {
      event.preventDefault();
      this.autoCompletePremiumTemplate();
    }
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
    this.draftSections = [
      {
        title: this.toLabel(selected),
        description: 'Base profesional para planificar y ejecutar bodas con control real.',
        fields: this.buildFields(block[selected], tone),
      },
    ];
  }

  private normalizeSections(sections: TemplateSection[]) {
    return sections.map((section, sectionIndex) => ({
      title: section.title?.trim() || `Seccion ${sectionIndex + 1}`,
      description: section.description?.trim() || 'Bloque operativo de wedding planner con seguimiento y validacion.',
      fields: section.fields.filter((field) => field.key.trim() && field.label.trim()).map((field) => ({ ...field, key: field.key.trim(), label: field.label.trim() })),
    }));
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'campo';
  }

  private section(title: string, fields: string[]): TemplateSection {
    return {
      title,
      description: 'Bloque recomendado para coordinacion real de boda.',
      fields: fields.map((label, index) => ({
        key: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${index + 1}`,
        label,
        type: this.inferFieldType(label),
      })),
    };
  }

  private buildWeddingBlock(id: WeddingBlockId): TemplateSection {
    const map: Record<WeddingBlockId, TemplateSection> = {
      legal: this.section('Legal y contratos', ['Contrato espacio', 'Contrato catering', 'Permisos municipales', 'Seguro RC']),
      venue: this.section('Espacio y montaje', ['Plano mesas', 'Prueba tecnica', 'Montaje decoracion', 'Checklist desmontaje']),
      ceremony: this.section('Ceremonia', ['Guion ceremonia', 'Lecturas', 'Musica entrada', 'Plan lluvia']),
      catering: this.section('Catering y menu', ['Menu final', 'Alergias', 'Prueba menu', 'Timing servicio']),
      photo_video: this.section('Foto y video', ['Shot list', 'Momentos clave', 'Drone permitido', 'Entrega material']),
      music_show: this.section('Musica y show', ['Playlist ceremonia', 'DJ briefing', 'Primer baile', 'Corte de sonido']),
      guest_experience: this.section('Experiencia invitado', ['RSVP segmentado', 'Asignacion de mesa', 'Alergias y dietas', 'Atencion especial']),
      vendors_ops: this.section('Control proveedores', ['Contacto principal', 'Hora llegada', 'Pago pendiente', 'Riesgos']),
      budget_control: this.section('Control presupuesto', ['Importe previsto aprobado', 'Importe real facturado', 'Desviacion presupuestaria', 'Estado de pago proveedor']),
      transport_logistics: this.section('Transporte y logistica', ['Shuttle invitados', 'Parking', 'Timing transfers', 'Plan contingencia']),
    };
    return map[id];
  }

  private buildCoreTemplate(type: TemplateType) {
    const setup: Record<TemplateType, { name: string; description: string; sections: TemplateSection[] }> = {
      CHECKLIST: {
        name: 'Checklist Wedding Core',
        description: 'Tareas clave pre-boda, dia B y post.',
        sections: [
          this.section('Pre-boda', ['Kickoff cliente', 'Reserva espacio', 'Contratos firmados', 'Plan de riesgos']),
          this.section('Dia B', ['Briefing staff', 'Control proveedores', 'Flujo ceremonia', 'Cierre operativo']),
        ],
      },
      TIMELINE: {
        name: 'Timeline Operativo Dia B',
        description: 'Cronograma por bloques con responsables.',
        sections: [
          this.section('Morning prep', ['Hora maquillaje', 'Foto detalles', 'Traslado pareja', 'Checklist venue']),
          this.section('Ceremonia y fiesta', ['Inicio ceremonia', 'Cocktail', 'Banquete', 'Cierre fiesta']),
        ],
      },
      BUDGET: {
        name: 'Budget Control Wedding',
        description: 'Previsto, real y desviacion por partida.',
        sections: [
          this.section('Costes base', ['Espacio', 'Catering', 'Foto/video', 'Musica']),
          this.section('Control financiero', ['Importe previsto', 'Importe real', 'Diferencia', 'Estado pago']),
        ],
      },
      GUEST_LIST: {
        name: 'Guest Experience Master',
        description: 'RSVP, seating y atencion personalizada.',
        sections: [
          this.section('RSVP', ['Nombre invitado', 'Confirmacion', 'Acompanantes', 'Canal respuesta']),
          this.section('Seating y dieta', ['Mesa', 'Alergias', 'Menu', 'Notas especiales']),
        ],
      },
      VENDOR_LIST: {
        name: 'Vendor Ops Hub',
        description: 'Control de proveedores y entregables.',
        sections: [
          this.section('Ficha proveedor', ['Nombre', 'Servicio', 'Contacto', 'Canal urgente']),
          this.section('Contrato y pagos', ['Contrato firmado', 'Entrega', 'Importe', 'Pago pendiente']),
        ],
      },
    };

    const selected = setup[type];
    return {
      name: selected.name,
      type,
      description: selected.description,
      schemaJson: { version: 1, sections: selected.sections },
    };
  }

  private coverRaw(type: TemplateType) {
    if (type === 'TIMELINE') return 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=70';
    if (type === 'BUDGET') return 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1400&q=70';
    if (type === 'GUEST_LIST') return 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1400&q=70';
    if (type === 'VENDOR_LIST') return 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1400&q=70';
    return 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1400&q=70';
  }

  private loadFavorites() {
    try {
      const raw = localStorage.getItem(this.favoritesStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as string[];
      this.favorites = new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
      this.favorites = new Set<string>();
    }
  }

  private persistFavorites() {
    try {
      localStorage.setItem(this.favoritesStorageKey, JSON.stringify([...this.favorites]));
    } catch {
      // no-op
    }
  }

  private downloadJson(filename: string, payload: unknown) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.replace(/\s+/g, '_').toLowerCase();
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private buildFields(block: 'checklist' | 'timeline' | 'budget' | 'guests' | 'vendors', tone: CreatorTone): TemplateField[] {
    const base: Record<typeof block, TemplateField[]> = {
      checklist: [
        { key: 'hito_operativo', label: 'Hito operativo de la boda', type: 'checkbox' },
        { key: 'responsable_hito', label: 'Responsable asignado del hito', type: 'text' },
        { key: 'fecha_compromiso', label: 'Fecha compromiso de entrega', type: 'date' },
        { key: 'observaciones_planner', label: 'Observaciones del planner', type: 'textarea' },
      ],
      timeline: [
        { key: 'momento_clave', label: 'Momento clave del cronograma', type: 'text' },
        { key: 'hora_programada', label: 'Hora programada', type: 'time' },
        { key: 'duracion_minutos', label: 'Duracion estimada (minutos)', type: 'number' },
        { key: 'responsable_franja', label: 'Responsable de la franja', type: 'text' },
      ],
      budget: [
        { key: 'partida_presupuestaria', label: 'Partida presupuestaria', type: 'text' },
        { key: 'importe_previsto', label: 'Importe previsto aprobado', type: 'currency' },
        { key: 'importe_real', label: 'Importe real facturado', type: 'currency' },
        { key: 'estado_pago_proveedor', label: 'Estado de pago proveedor', type: 'select' },
      ],
      guests: [
        { key: 'nombre_completo_invitado', label: 'Nombre completo del invitado', type: 'text' },
        { key: 'estado_confirmacion_rsvp', label: 'Estado de confirmacion RSVP', type: 'select' },
        { key: 'mesa_asignada_salon', label: 'Mesa asignada en salon', type: 'text' },
        { key: 'alergias_restricciones_alimentarias', label: 'Alergias o restricciones alimentarias', type: 'textarea' },
      ],
      vendors: [
        { key: 'nombre_proveedor', label: 'Nombre del proveedor', type: 'text' },
        { key: 'servicio_contratado', label: 'Servicio contratado', type: 'text' },
        { key: 'contacto_urgente', label: 'Contacto urgente', type: 'text' },
        { key: 'estado_pago_factura', label: 'Estado de pago de factura', type: 'select' },
      ],
    };
    const takeCount = tone === 'minimal' ? 2 : tone === 'balanced' ? 3 : 4;
    return base[block].slice(0, takeCount);
  }

  private inferFieldType(label: string): TemplateFieldType {
    const key = label.toLowerCase();
    if (/(fecha|date)/.test(key)) return 'date';
    if (/(hora|timing|time)/.test(key)) return 'time';
    if (/(importe|presupuesto|coste|pago|budget)/.test(key)) return 'currency';
    if (/(estado|rsvp|menu|prioridad)/.test(key)) return 'select';
    if (/(checklist|confirmad|aprobacion|riesgo|plan)/.test(key)) return 'checkbox';
    if (/(nota|observacion|comentario|detalle)/.test(key)) return 'textarea';
    return 'text';
  }

  private getRealFieldSeed(sectionTitle: string, fieldIndex: number): TemplateField {
    const catalog: TemplateField[] = [
      { key: 'responsable_bloque', label: 'Responsable principal del bloque', type: 'text' },
      { key: 'fecha_limite_entrega', label: 'Fecha limite de entrega', type: 'date' },
      { key: 'estado_avance_bloque', label: 'Estado de avance del bloque', type: 'select' },
      { key: 'prioridad_operativa', label: 'Prioridad operativa', type: 'select' },
      { key: 'riesgo_detectado', label: 'Riesgo detectado', type: 'textarea' },
      { key: 'validacion_cliente', label: 'Validacion final del cliente', type: 'checkbox' },
    ];
    const item = catalog[fieldIndex % catalog.length];
    const sectionSlug = this.slugify(sectionTitle || 'bloque');
    return { ...item, key: `${item.key}_${sectionSlug}_${fieldIndex + 1}` };
  }

  private professionalizeTitle(title: string) {
    const clean = title.trim();
    if (!clean) return 'Bloque wedding premium';
    return clean
      .replace('Operacion', 'Operacion wedding')
      .replace('Control', 'Control premium')
      .replace('Venue', 'Espacio')
      .replace('Dia B', 'Dia B operativo');
  }

  private professionalizeField(field: TemplateField, sectionTitle: string, fieldIndex: number): TemplateField {
    const key = this.slugify(field.key || field.label || `${sectionTitle}_${fieldIndex + 1}`);
    const labelBase = field.label?.trim() || key.replace(/_/g, ' ');
    const label = labelBase
      .replace('Responsable', 'Responsable asignado')
      .replace('Estado', 'Estado de avance')
      .replace('Fecha objetivo', 'Fecha objetivo comprometida')
      .replace('Notas', 'Observaciones operativas');
    const type = field.type || 'text';
    const required = field.required ?? !['textarea', 'checkbox'].includes(type);
    return { ...field, key, label, type, required };
  }
}
