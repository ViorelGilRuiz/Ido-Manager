import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, HostListener, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { TemplateModel, TemplateType } from '../../shared/models';
import { PdfDesign, PdfTheme, openTemplatePdfPreview } from '../../shared/utils/pdf-export';

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
type CanvasFxMode = 'showcase' | 'clean';
type PreviewStage = 'preboda' | 'dia_b' | 'post';
type DesignPreset = 'romantic' | 'minimal' | 'night';
type VisualStylePreset = 'editorial' | 'luxe' | 'botanical' | 'modern';
type TemplateVisualStyleSettings = {
  preset?: VisualStylePreset;
  surfaceBackground?: string;
  textColor?: string;
  mutedTextColor?: string;
  cardBackground?: string;
  cardBorderColor?: string;
  heroOverlay?: string;
  borderRadius?: number;
  cardRadius?: number;
  cardGap?: number;
  cardShadow?: string;
  viewportCss?: string;
  cardCss?: string;
  heroCss?: string;
};
type PdfExportPreset = 'signature' | 'minimal' | 'luxury';
type CanvasSectionPosition = { x: number; y: number };
type CanvasLayoutSettings = {
  freeMode?: boolean;
  showGrid?: boolean;
  showSafeMargins?: boolean;
  zoom?: number;
  gridSnapSize?: number;
  sectionSnapSize?: number;
  centerGuideTolerance?: number;
  positions?: Record<string, CanvasSectionPosition>;
};
type FreeLayoutElementType = 'text' | 'image' | 'shape' | 'label';
type FreeLayoutElement = {
  id: string;
  type: FreeLayoutElementType;
  visible?: boolean;
  text?: string;
  imageUrl?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
  locked?: boolean;
  shapeKind?: 'rect' | 'pill' | 'line';
  imageFit?: 'cover' | 'contain' | 'fill';
  color?: string;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  shadow?: string;
  blendMode?: string;
  backdropBlur?: number;
};
type FreeResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type FreeLayoutSettings = {
  blankPaperMode?: boolean;
  paperPreset?: 'a4p' | 'a4l' | 'square' | 'tall' | 'custom';
  paperWidth?: number;
  paperHeight?: number;
  showRulers?: boolean;
  showLayerLabels?: boolean;
  keyboardNudgeStep?: number;
  keyboardFineNudgeStep?: number;
  elements?: FreeLayoutElement[];
};
type EditorSnapshot = {
  id: string;
  label: string;
  createdAt: string;
  payload: {
    draftName: string;
    draftDescription: string;
    draftType: TemplateType;
    templatePhase: TemplatePhase;
    estimatedMinutes: number;
    tagsInput: string;
    sections: TemplateSection[];
  };
};

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
          <button type="button" class="ghost-btn" (click)="exportCurrentTemplatePdf()">PDF</button>
          <button type="button" (click)="saveNow()" [disabled]="saving">{{ saving ? 'Guardando...' : (isNewTemplateMode ? 'Crear template' : 'Guardar') }}</button>
          <span class="save-status" *ngIf="statusText">{{ statusText }}</span>
          <a routerLink="/app/templates" class="ghost-btn action-link">Volver</a>
          <div class="head-stat editor-status" [class.warn]="hasPendingChanges">
            <span>{{ hasPendingChanges ? 'Pendiente' : 'Estado' }}</span>
            <strong>{{ hasPendingChanges ? 'Sin guardar' : 'Al dia' }}</strong>
          </div>
        </div>
      </header>

      <section class="panel-card editor-workspace-dock">
        <div class="panel-head">
          <h3>Workspace rapido</h3>
          <span class="muted-copy">Navegacion a mano + atajos pro</span>
        </div>
        <div class="actions-row">
          <a routerLink="/app/dashboard" class="ghost-btn action-link">Dashboard</a>
          <a routerLink="/app/templates" class="ghost-btn action-link">Templates</a>
          <a routerLink="/app/events" class="ghost-btn action-link">Events</a>
          <button type="button" class="ghost-btn" (click)="openPreviewCanvas()">Vista grande</button>
          <button type="button" class="ghost-btn" (click)="resetToStarterTemplate()">Starter limpio</button>
        </div>
        <p class="muted-copy">Atajos: Ctrl+S guardar · Ctrl+Shift+P preview · Ctrl+Shift+K IA prompt · Esc cerrar preview</p>
      </section>

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
          <section class="quality-panel ai-workbench-panel">
            <div class="panel-head">
              <h4>AI Prompt Express</h4>
              <strong>Auto build</strong>
            </div>
            <label class="meta-tags">
              Brief rapido
              <textarea
                [(ngModel)]="quickAiPrompt"
                (ngModelChange)="onDraftChange()"
                rows="3"
                placeholder="Ej: boda de 180 invitados, control presupuesto, proveedores premium, timeline dia B y experiencia cliente"
              ></textarea>
            </label>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="applyQuickAiPrompt()">Aplicar prompt</button>
              <button type="button" class="ghost-btn" (click)="fillQuickAiPromptSample()">Autorrellenar ejemplo</button>
            </div>
          </section>
          <section class="quality-panel ai-workbench-panel">
            <div class="panel-head">
              <h4>Automation Engine</h4>
              <strong>{{ autoPilotEnabled ? 'Autopilot ON' : 'Manual' }}</strong>
            </div>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="runAiAutopilot()">IA Autopilot</button>
              <button type="button" class="ghost-btn" (click)="generateCompleteWeddingSuite()">Suite wedding 360</button>
              <button type="button" class="ghost-btn" (click)="dedupeSimilarSections()">Limpiar duplicados</button>
              <button type="button" class="ghost-btn" (click)="rebalanceRequiredCoverage()">Rebalance req</button>
            </div>
            <div class="tiny-actions">
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="autoPilotEnabled" (ngModelChange)="onDraftChange()" />
                Auto-aplicar mejoras IA
              </label>
              <button type="button" class="ghost-btn" (click)="createFromPromptAndSave()">Prompt + guardar</button>
            </div>
          </section>
          <section class="quality-panel ai-workbench-panel">
            <div class="panel-head">
              <h4>Snapshots de edicion</h4>
              <strong>{{ editorSnapshots.length }}</strong>
            </div>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="captureSnapshot()">Guardar snapshot</button>
              <button
                type="button"
                class="ghost-btn"
                (click)="restoreLatestSnapshot()"
                [disabled]="!editorSnapshots.length"
              >
                Restaurar ultimo
              </button>
              <button
                type="button"
                class="ghost-btn"
                (click)="clearSnapshots()"
                [disabled]="!editorSnapshots.length"
              >
                Limpiar snapshots
              </button>
            </div>
            <label class="meta-tags" *ngIf="editorSnapshots.length">
              Historial
              <select [(ngModel)]="selectedSnapshotId">
                <option *ngFor="let snap of editorSnapshots" [value]="snap.id">
                  {{ snap.label }} · {{ snap.createdAt }}
                </option>
              </select>
            </label>
            <div class="tiny-actions" *ngIf="editorSnapshots.length">
              <button type="button" class="ghost-btn" (click)="restoreSelectedSnapshot()">Restaurar seleccionado</button>
              <button type="button" class="ghost-btn" (click)="deleteSelectedSnapshot()">Eliminar seleccionado</button>
            </div>
          </section>
          <section class="quality-panel ai-workbench-panel">
            <div class="panel-head">
              <h4>Design Studio</h4>
              <strong>PDF Live</strong>
            </div>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="applyDesignPreset('romantic')">Romantic</button>
              <button type="button" class="ghost-btn" (click)="applyDesignPreset('minimal')">Minimal</button>
              <button type="button" class="ghost-btn" (click)="applyDesignPreset('night')">Night</button>
            </div>
            <div class="meta-inline-grid">
              <label>
                Fuente base
                <select [(ngModel)]="designFontFamily" (ngModelChange)="onDraftChange()">
                  <option value="'Poppins', 'Segoe UI', sans-serif">Poppins</option>
                  <option value="'Montserrat', 'Segoe UI', sans-serif">Montserrat</option>
                  <option value="'Lora', 'Georgia', serif">Lora</option>
                </select>
              </label>
              <label>
                Fuente titular
                <select [(ngModel)]="designTitleFontFamily" (ngModelChange)="onDraftChange()">
                  <option value="'Playfair Display', 'Georgia', serif">Playfair Display</option>
                  <option value="'Cormorant Garamond', 'Georgia', serif">Cormorant</option>
                  <option value="'Libre Baskerville', 'Georgia', serif">Libre Baskerville</option>
                </select>
              </label>
              <label>
                Color principal
                <input type="color" [(ngModel)]="designPrimaryColor" (ngModelChange)="onDraftChange()" />
              </label>
              <label>
                Color acento
                <input type="color" [(ngModel)]="designAccentColor" (ngModelChange)="onDraftChange()" />
              </label>
            </div>
            <label class="meta-tags">
              Imagen de portada (URL)
              <input [(ngModel)]="designHeroImageUrl" (ngModelChange)="onDraftChange()" placeholder="https://..." />
            </label>
            <label class="meta-tags">
              Logo (URL)
              <input [(ngModel)]="designLogoImageUrl" (ngModelChange)="onDraftChange()" placeholder="https://..." />
            </label>
            <div class="tiny-actions">
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="designCompactMode" (ngModelChange)="onDraftChange()" />
                Compact mode
              </label>
              <button type="button" class="ghost-btn" (click)="clearDesignImages()">Limpiar imagenes</button>
            </div>
          </section>
          <section class="quality-panel ai-workbench-panel">
            <div class="panel-head">
              <h4>Style Builder</h4>
              <strong>Preview/Canvas</strong>
            </div>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="applyVisualStylePreset('editorial')">Editorial</button>
              <button type="button" class="ghost-btn" (click)="applyVisualStylePreset('luxe')">Luxe</button>
              <button type="button" class="ghost-btn" (click)="applyVisualStylePreset('botanical')">Botanical</button>
              <button type="button" class="ghost-btn" (click)="applyVisualStylePreset('modern')">Modern</button>
            </div>
            <div class="meta-inline-grid">
              <label>
                Texto
                <input type="color" [(ngModel)]="visualTextColor" (ngModelChange)="onDraftChange()" />
              </label>
              <label>
                Muted
                <input type="color" [(ngModel)]="visualMutedTextColor" (ngModelChange)="onDraftChange()" />
              </label>
              <label>
                Fondo tarjeta
                <input type="color" [ngModel]="visualCardBackgroundColor" (ngModelChange)="setVisualCardBackgroundFromColor($event)" />
              </label>
              <label>
                Borde tarjeta
                <input type="color" [(ngModel)]="visualCardBorderColor" (ngModelChange)="onDraftChange()" />
              </label>
            </div>
            <label class="meta-tags">
              Fondo viewport (CSS)
              <input [(ngModel)]="visualSurfaceBackground" (ngModelChange)="onDraftChange()" placeholder="linear-gradient(...)" />
            </label>
            <label class="meta-tags">
              Overlay hero (CSS)
              <input [(ngModel)]="visualHeroOverlay" (ngModelChange)="onDraftChange()" placeholder="linear-gradient(...)" />
            </label>
            <label class="meta-tags">
              Sombra tarjetas (CSS)
              <input [(ngModel)]="visualCardShadow" (ngModelChange)="onDraftChange()" placeholder="0 20px 50px rgba(...)" />
            </label>
            <label class="preview-progress-control">
              Radio viewport {{ visualBorderRadius }}px
              <input type="range" min="8" max="34" step="1" [(ngModel)]="visualBorderRadius" (ngModelChange)="onDraftChange()" />
            </label>
            <label class="preview-progress-control">
              Radio tarjeta {{ visualCardRadius }}px
              <input type="range" min="6" max="28" step="1" [(ngModel)]="visualCardRadius" (ngModelChange)="onDraftChange()" />
            </label>
            <label class="preview-progress-control">
              Gap tarjetas {{ visualCardGap }}px
              <input type="range" min="6" max="28" step="1" [(ngModel)]="visualCardGap" (ngModelChange)="onDraftChange()" />
            </label>
            <label class="meta-tags">
              CSS libre viewport (declaraciones)
              <textarea
                [(ngModel)]="visualViewportCss"
                (ngModelChange)="onDraftChange()"
                rows="3"
                placeholder="backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,.2);"
              ></textarea>
            </label>
            <label class="meta-tags">
              CSS libre tarjetas (declaraciones)
              <textarea
                [(ngModel)]="visualCardCss"
                (ngModelChange)="onDraftChange()"
                rows="3"
                placeholder="transform: rotateX(.2deg); background: rgba(255,255,255,.92);"
              ></textarea>
            </label>
            <label class="meta-tags">
              CSS libre hero (declaraciones)
              <textarea
                [(ngModel)]="visualHeroCss"
                (ngModelChange)="onDraftChange()"
                rows="2"
                placeholder="background-position: center 35%; filter: saturate(1.05);"
              ></textarea>
            </label>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="resetVisualStyleBuilder()">Reset style builder</button>
            </div>
          </section>
          <section class="quality-panel ai-workbench-panel">
            <div class="panel-head">
              <h4>PDF Export Pro</h4>
              <strong>{{ pdfPageFormat }} · {{ pdfDensity }}</strong>
            </div>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="applyPdfExportPreset('signature')">Signature</button>
              <button type="button" class="ghost-btn" (click)="applyPdfExportPreset('minimal')">Minimal</button>
              <button type="button" class="ghost-btn" (click)="applyPdfExportPreset('luxury')">Luxury</button>
            </div>
            <div class="meta-inline-grid">
              <label>
                Layout PDF
                <select [(ngModel)]="pdfLayoutMode" (ngModelChange)="onDraftChange()">
                  <option value="cards">Cards</option>
                  <option value="list">List</option>
                </select>
              </label>
              <label>
                Formato
                <select [(ngModel)]="pdfPageFormat" (ngModelChange)="onDraftChange()">
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                </select>
              </label>
              <label>
                Densidad
                <select [(ngModel)]="pdfDensity" (ngModelChange)="onDraftChange()">
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="pdfShowToc" (ngModelChange)="onDraftChange()" />
                Incluir indice
              </label>
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="pdfShowWatermark" (ngModelChange)="onDraftChange()" />
                Watermark
              </label>
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="pdfShowDesignSheet" (ngModelChange)="onDraftChange()" />
                Design sheet
              </label>
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="pdfShowGeneratedStamp" (ngModelChange)="onDraftChange()" />
                Fecha generacion
              </label>
            </div>
            <label class="meta-tags">
              Watermark texto
              <input [(ngModel)]="pdfWatermarkText" (ngModelChange)="onDraftChange()" placeholder="I Do Manager" />
            </label>
            <label class="meta-tags">
              Footer texto
              <input
                [(ngModel)]="pdfFooterText"
                (ngModelChange)="onDraftChange()"
                placeholder="Documento premium generado para wedding planner y cliente"
              />
            </label>
          </section>
          <section class="quality-panel ai-workbench-panel">
            <div class="panel-head">
              <h4>Free Layout Studio</h4>
              <strong>{{ freeLayoutElements.length }} capas</strong>
            </div>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="addFreeLayoutElement('text')">+ Texto</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutElement('label')">+ Label</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutElement('shape')">+ Shape</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutElement('image')">+ Imagen</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutPresetElement('card')">+ Caja</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutPresetElement('button')">+ Boton</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutPresetElement('badge')">+ Badge</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutPresetElement('divider')">+ Divider</button>
              <button type="button" class="ghost-btn" (click)="generateAiPremiumFreeLayout()">IA layout</button>
            </div>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="addFreeLayoutPresetElement('textBlock')">+ Texto largo</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutPresetElement('note')">+ Nota</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutPresetElement('metric')">+ KPI</button>
              <button type="button" class="ghost-btn" (click)="runAiFreeLayoutAutoComplete()">IA autocompletar canvas</button>
            </div>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="addFreeLayoutKit('hero')">Kit Hero</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutKit('stats')">Kit Stats</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutKit('cta')">Kit CTA</button>
              <button type="button" class="ghost-btn" (click)="addFreeLayoutKit('signature')">Kit Firma</button>
            </div>
            <label class="small-check">
              <input type="checkbox" [(ngModel)]="canvasBlankPaperMode" (ngModelChange)="onDraftChange()" />
              Hoja en blanco (ocultar bloques de template)
            </label>
            <label class="small-check">
              <input type="checkbox" [(ngModel)]="canvasShowSafeMargins" (ngModelChange)="onDraftChange()" />
              Margenes seguros
            </label>
            <div class="meta-inline-grid">
              <label>
                Hoja
                <select [(ngModel)]="freeCanvasPaperPreset" (ngModelChange)="applyFreeCanvasPaperPreset($event)">
                  <option value="a4p">A4 Portrait</option>
                  <option value="a4l">A4 Landscape</option>
                  <option value="square">Square</option>
                  <option value="tall">Tall Dossier</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
              <label>
                Ancho hoja
                <input type="number" min="360" step="10" [(ngModel)]="freeCanvasPaperWidth" (ngModelChange)="onFreeCanvasPaperSizeChange()" />
              </label>
              <label>
                Alto hoja
                <input type="number" min="360" step="10" [(ngModel)]="freeCanvasPaperHeight" (ngModelChange)="onFreeCanvasPaperSizeChange()" />
              </label>
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="canvasShowRulers" (ngModelChange)="onDraftChange()" />
                Reglas
              </label>
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="canvasShowLayerLabels" (ngModelChange)="onDraftChange()" />
                Labels capas
              </label>
            </div>
            <label class="small-check">
              <input type="checkbox" [(ngModel)]="canvasSnapToGrid" />
              Snap grid
            </label>
            <label class="small-check">
              <input type="checkbox" [(ngModel)]="canvasSnapToCenterGuides" />
              Guías centro
            </label>
            <div class="meta-inline-grid">
              <label>
                Snap capas px
                <input type="number" min="1" max="48" step="1" [(ngModel)]="canvasGridSnapSize" (ngModelChange)="onCanvasAssistSettingChange()" />
              </label>
              <label>
                Snap secciones px
                <input type="number" min="1" max="72" step="1" [(ngModel)]="canvasSectionSnapSize" (ngModelChange)="onCanvasAssistSettingChange()" />
              </label>
              <label>
                Tolerancia guias
                <input type="number" min="2" max="40" step="1" [(ngModel)]="canvasCenterGuideTolerance" (ngModelChange)="onCanvasAssistSettingChange()" />
              </label>
              <label>
                Nudge teclado
                <input type="number" min="1" max="80" step="1" [(ngModel)]="freeLayerNudgeStep" (ngModelChange)="onCanvasAssistSettingChange()" />
              </label>
              <label>
                Nudge fino
                <input type="number" min="1" max="20" step="1" [(ngModel)]="freeLayerFineNudgeStep" (ngModelChange)="onCanvasAssistSettingChange()" />
              </label>
            </div>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="applyFreeEditorControlPreset('precision')">Preset Precision</button>
              <button type="button" class="ghost-btn" (click)="applyFreeEditorControlPreset('balanced')">Preset Balanced</button>
              <button type="button" class="ghost-btn" (click)="applyFreeEditorControlPreset('fast')">Preset Fast</button>
            </div>
            <p class="muted-copy">
              Atajos canvas: Flechas mover · Shift+Flechas nudge principal · Alt+Flechas nudge fino · Ctrl+D duplicar · Delete eliminar · [ / ] capas · L bloquear · H ocultar
            </p>
            <label class="meta-tags">
              Imagen rapida (URL)
              <input [(ngModel)]="freeLayoutQuickImageUrl" placeholder="https://..." />
            </label>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="addFreeImageFromQuickUrl()">Insertar imagen URL</button>
              <button type="button" class="ghost-btn" (click)="clearFreeLayoutElements()" [disabled]="!freeLayoutElements.length">Limpiar capas</button>
            </div>
            <label class="meta-tags" *ngIf="freeLayoutElements.length">
              Capas
              <select [(ngModel)]="selectedFreeLayoutElementId">
                <option *ngFor="let el of freeLayoutElements; let idx = index" [value]="el.id">
                  {{ idx + 1 }} · {{ el.type }} · {{ el.text || el.imageUrl || 'elemento' }}
                </option>
              </select>
            </label>
            <div class="tiny-actions" *ngIf="freeLayoutElements.length">
              <button type="button" class="ghost-btn" (click)="sortFreeLayoutLayersByPosition()">Ordenar por posicion</button>
              <button type="button" class="ghost-btn" (click)="normalizeFreeLayoutLayerZ()">Normalizar Z</button>
              <button type="button" class="ghost-btn" (click)="buildFreeLayoutFromVisibleSections()">Importar secciones al canvas</button>
            </div>
            <div class="quality-panel" *ngIf="freeLayoutElements.length">
              <div class="panel-head">
                <h4>Layer Stack</h4>
                <strong>{{ freeLayoutElements.length }}</strong>
              </div>
              <div class="section-stack">
                <article class="section-card" *ngFor="let layer of freeLayoutElements; let li = index">
                  <div class="panel-head">
                    <div class="section-head-main">
                      <strong>{{ li + 1 }} · {{ layer.type }}</strong>
                      <span class="section-field-count">z {{ layer.zIndex }}</span>
                    </div>
                    <div class="tiny-actions">
                      <button type="button" class="ghost-btn" (click)="selectFreeLayoutElement(layer.id)">Sel</button>
                      <button type="button" class="ghost-btn" (click)="toggleFreeLayoutLayerVisibility(layer.id)">{{ layer.visible === false ? 'Mostrar' : 'Ocultar' }}</button>
                      <button type="button" class="ghost-btn" (click)="toggleFreeLayoutLayerLock(layer.id)">{{ layer.locked ? 'Unlock' : 'Lock' }}</button>
                      <button type="button" class="ghost-btn" (click)="moveFreeLayoutLayerOrder(layer.id, -1)">↑</button>
                      <button type="button" class="ghost-btn" (click)="moveFreeLayoutLayerOrder(layer.id, 1)">↓</button>
                    </div>
                  </div>
                  <p class="muted-copy">{{ layer.text || layer.imageUrl || 'Elemento visual' }}</p>
                </article>
              </div>
            </div>
            <div *ngIf="selectedFreeLayoutElement as active" class="meta-form">
              <label *ngIf="active.type !== 'shape'">
                Texto / URL
                <textarea
                  *ngIf="active.type !== 'image'; else imageInputTpl"
                  [ngModel]="active.text"
                  (ngModelChange)="updateSelectedFreeLayoutElement({ text: $event })"
                  rows="2"
                ></textarea>
                <ng-template #imageInputTpl>
                  <input
                    [ngModel]="active.imageUrl"
                    (ngModelChange)="updateSelectedFreeLayoutElement({ imageUrl: $event })"
                    placeholder="https://..."
                  />
                </ng-template>
              </label>
              <div class="meta-inline-grid">
                <label>X<input type="number" [ngModel]="active.x" (ngModelChange)="updateSelectedFreeLayoutElement({ x: +$event || 0 })" /></label>
                <label>Y<input type="number" [ngModel]="active.y" (ngModelChange)="updateSelectedFreeLayoutElement({ y: +$event || 0 })" /></label>
                <label>Ancho<input type="number" [ngModel]="active.width" (ngModelChange)="updateSelectedFreeLayoutElement({ width: minNumber($event, 20) })" /></label>
                <label>Alto<input type="number" [ngModel]="active.height" (ngModelChange)="updateSelectedFreeLayoutElement({ height: minNumber($event, 20) })" /></label>
                <label>Rot<input type="number" [ngModel]="active.rotation" (ngModelChange)="updateSelectedFreeLayoutElement({ rotation: +$event || 0 })" /></label>
                <label>Z<input type="number" [ngModel]="active.zIndex" (ngModelChange)="updateSelectedFreeLayoutElement({ zIndex: +$event || 1 })" /></label>
                <label>Font px<input type="number" [ngModel]="active.fontSize || 16" (ngModelChange)="updateSelectedFreeLayoutElement({ fontSize: minNumber($event, 10) })" /></label>
                <label>Peso<input type="number" [ngModel]="active.fontWeight || 500" (ngModelChange)="updateSelectedFreeLayoutElement({ fontWeight: minNumber($event, 300) })" /></label>
              </div>
              <div class="meta-inline-grid">
                <label>Fuente
                  <select [ngModel]="active.fontFamily || defaultFreeLayoutFontFamily" (ngModelChange)="updateSelectedFreeLayoutElement({ fontFamily: $event })">
                    <option value="'Poppins', 'Segoe UI', sans-serif">Poppins</option>
                    <option value="'Montserrat', 'Segoe UI', sans-serif">Montserrat</option>
                    <option value="'Playfair Display', 'Georgia', serif">Playfair</option>
                    <option value="'Cormorant Garamond', 'Georgia', serif">Cormorant</option>
                  </select>
                </label>
                <label>Color<input type="color" [ngModel]="freeColorInput(active.color, '#0f172a')" (ngModelChange)="updateSelectedFreeLayoutElement({ color: $event })" /></label>
                <label>Fondo<input type="color" [ngModel]="freeColorInput(active.background, '#ffffff')" (ngModelChange)="updateSelectedFreeLayoutElement({ background: $event })" /></label>
                <label>Borde<input type="color" [ngModel]="freeColorInput(active.borderColor, '#cbd5e1')" (ngModelChange)="updateSelectedFreeLayoutElement({ borderColor: $event })" /></label>
              </div>
              <div class="meta-inline-grid">
                <label *ngIf="active.type === 'shape'">Forma
                  <select [ngModel]="active.shapeKind || 'rect'" (ngModelChange)="updateSelectedFreeLayoutElement({ shapeKind: $event })">
                    <option value="rect">Rect</option>
                    <option value="pill">Pill</option>
                    <option value="line">Line</option>
                  </select>
                </label>
                <label *ngIf="active.type === 'image'">Image fit
                  <select [ngModel]="active.imageFit || 'cover'" (ngModelChange)="updateSelectedFreeLayoutElement({ imageFit: $event })">
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                  </select>
                </label>
                <label>Gradiente rapido
                  <select (ngModelChange)="applySelectedGradientPreset($event)" [ngModel]="''">
                    <option value="">Sin cambio</option>
                    <option value="softMint">Soft Mint</option>
                    <option value="editorialRose">Editorial Rose</option>
                    <option value="nightGlass">Night Glass</option>
                  </select>
                </label>
                <label>Sombra preset
                  <select (ngModelChange)="applySelectedShadowPreset($event)" [ngModel]="''">
                    <option value="">Sin cambio</option>
                    <option value="soft">Soft</option>
                    <option value="deep">Deep</option>
                    <option value="none">None</option>
                  </select>
                </label>
              </div>
              <div class="meta-inline-grid">
                <label>Alinear
                  <select [ngModel]="active.textAlign || 'left'" (ngModelChange)="updateSelectedFreeLayoutElement({ textAlign: $event })">
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <label>Tracking
                  <input type="number" [ngModel]="active.letterSpacing || 0" (ngModelChange)="updateSelectedFreeLayoutElement({ letterSpacing: numberOr($event, 0) })" />
                </label>
                <label>Line height
                  <input type="number" step="0.1" [ngModel]="active.lineHeight || 1.2" (ngModelChange)="updateSelectedFreeLayoutElement({ lineHeight: minFloat($event, 0.7) })" />
                </label>
                <label>Radio
                  <input type="number" [ngModel]="active.borderRadius || 0" (ngModelChange)="updateSelectedFreeLayoutElement({ borderRadius: minNumber($event, 0) })" />
                </label>
              </div>
              <label class="preview-progress-control">
                Opacidad {{ active.opacity }}
                <input type="range" min="0.1" max="1" step="0.05" [ngModel]="active.opacity" (ngModelChange)="updateSelectedFreeLayoutElement({ opacity: +$event })" />
              </label>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="nudgeSelectedFreeLayoutElement(-10, 0)">←</button>
                <button type="button" class="ghost-btn" (click)="nudgeSelectedFreeLayoutElement(10, 0)">→</button>
                <button type="button" class="ghost-btn" (click)="nudgeSelectedFreeLayoutElement(0, -10)">↑</button>
                <button type="button" class="ghost-btn" (click)="nudgeSelectedFreeLayoutElement(0, 10)">↓</button>
                <button type="button" class="ghost-btn" (click)="rotateSelectedFreeLayoutElement(-5)">-5°</button>
                <button type="button" class="ghost-btn" (click)="rotateSelectedFreeLayoutElement(5)">+5°</button>
                <button type="button" class="ghost-btn" (click)="resizeSelectedFreeLayoutElement(20, 0)">+W</button>
                <button type="button" class="ghost-btn" (click)="resizeSelectedFreeLayoutElement(-20, 0)">-W</button>
                <button type="button" class="ghost-btn" (click)="resizeSelectedFreeLayoutElement(0, 20)">+H</button>
                <button type="button" class="ghost-btn" (click)="resizeSelectedFreeLayoutElement(0, -20)">-H</button>
                <button type="button" class="ghost-btn" (click)="alignSelectedFreeLayoutElement('left')">Alinear izq</button>
                <button type="button" class="ghost-btn" (click)="alignSelectedFreeLayoutElement('center')">Centrar</button>
                <button type="button" class="ghost-btn" (click)="alignSelectedFreeLayoutElement('right')">Alinear der</button>
                <button type="button" class="ghost-btn" (click)="alignSelectedFreeLayoutElement('top')">Top</button>
                <button type="button" class="ghost-btn" (click)="alignSelectedFreeLayoutElement('middle')">Middle</button>
                <button type="button" class="ghost-btn" (click)="alignSelectedFreeLayoutElement('bottom')">Bottom</button>
                <button type="button" class="ghost-btn" (click)="bringSelectedFreeLayoutElement('front')">Traer al frente</button>
                <button type="button" class="ghost-btn" (click)="bringSelectedFreeLayoutElement('back')">Enviar atrás</button>
                <button type="button" class="ghost-btn" (click)="toggleLockSelectedFreeLayoutElement()">{{ active.locked ? 'Unlock' : 'Lock' }}</button>
                <button type="button" class="ghost-btn" (click)="applySelectedFreeLayoutStylePreset('title')">Preset Titulo</button>
                <button type="button" class="ghost-btn" (click)="applySelectedFreeLayoutStylePreset('chip')">Preset Chip</button>
                <button type="button" class="ghost-btn" (click)="applySelectedFreeLayoutStylePreset('glass')">Preset Glass</button>
                <button type="button" class="ghost-btn" (click)="duplicateSelectedFreeLayoutElementOffset(40, 0)">Duplicar +X</button>
                <button type="button" class="ghost-btn" (click)="duplicateSelectedFreeLayoutElementOffset(0, 40)">Duplicar +Y</button>
                <button type="button" class="ghost-btn" (click)="duplicateSelectedFreeLayoutSeries('row')">Serie fila</button>
                <button type="button" class="ghost-btn" (click)="duplicateSelectedFreeLayoutSeries('column')">Serie columna</button>
                <button type="button" class="ghost-btn" (click)="copySelectedFreeLayoutStyle()">Copiar estilo</button>
                <button type="button" class="ghost-btn" (click)="pasteStyleToSelectedFreeLayoutElement()">Pegar estilo</button>
                <button type="button" class="ghost-btn" (click)="fitSelectedFreeLayoutTextBox()" [disabled]="active.type === 'image' || active.type === 'shape'">Autoajustar texto</button>
                <button type="button" class="ghost-btn" (click)="fitSelectedFreeLayoutElementToPaper('width')">Ajustar ancho hoja</button>
                <button type="button" class="ghost-btn" (click)="fitSelectedFreeLayoutElementToPaper('height')">Ajustar alto hoja</button>
                <button type="button" class="ghost-btn" (click)="mirrorSelectedFreeLayoutElement('x')">Mirror X</button>
                <button type="button" class="ghost-btn" (click)="mirrorSelectedFreeLayoutElement('y')">Mirror Y</button>
                <button type="button" class="ghost-btn" (click)="snapSelectedFreeLayoutElementToSafeMargins()">Snap margen</button>
                <button type="button" class="ghost-btn" (click)="distributeFreeLayoutElements('horizontal')">Distribuir H</button>
                <button type="button" class="ghost-btn" (click)="distributeFreeLayoutElements('vertical')">Distribuir V</button>
                <button type="button" class="ghost-btn" (click)="runAiSelectedLayerTextBoost()">IA texto capa</button>
                <button type="button" class="ghost-btn" (click)="centerSelectedFreeLayoutElementOnPaper()">Centrar hoja</button>
                <button type="button" class="ghost-btn" (click)="duplicateSelectedFreeLayoutElement()">Duplicar capa</button>
                <button type="button" class="ghost-btn danger-btn" (click)="deleteSelectedFreeLayoutElement()">Eliminar capa</button>
              </div>
            </div>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="runAiNeedBasedTemplateBoost('operativa')">IA Need: Operativa</button>
              <button type="button" class="ghost-btn" (click)="runAiNeedBasedTemplateBoost('cliente')">IA Need: Cliente</button>
              <button type="button" class="ghost-btn" (click)="runAiNeedBasedTemplateBoost('lujo')">IA Need: Lujo</button>
              <button type="button" class="ghost-btn" (click)="runAiVisualPolishPass()">IA Visual Polish</button>
              <button type="button" class="ghost-btn" (click)="runAiAutoCompleteFromPromptContext()">IA Prompt Context</button>
              <button type="button" class="ghost-btn" (click)="runAiLayoutVariant('editorial')">IA Layout Editorial</button>
              <button type="button" class="ghost-btn" (click)="runAiLayoutVariant('report')">IA Layout Report</button>
              <button type="button" class="ghost-btn" (click)="runAiLayoutVariant('minimal')">IA Layout Minimal</button>
            </div>
          </section>
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
              <button type="button" class="ghost-btn" (click)="autoCompleteRequiredFields()">Autocompletar requeridos</button>
              <button type="button" class="ghost-btn" (click)="applyWeddingProfessionalCopy()">Autotexto wedding</button>
              <button type="button" class="ghost-btn" (click)="addFinancialControlPack()">Pack financiero</button>
              <button type="button" class="ghost-btn" (click)="addGuestRsvpPack()">Pack RSVP</button>
              <button type="button" class="ghost-btn" (click)="generateClientChecklist()">Checklist cliente</button>
            </div>
          </section>
          <section class="quality-panel ai-workbench-panel">
            <div class="panel-head">
              <h4>AI Workbench</h4>
              <strong>{{ aiOperationalScore }}/100</strong>
            </div>
            <ul *ngIf="aiRecommendations.length; else aiOk">
              <li *ngFor="let recommendation of aiRecommendations">{{ recommendation }}</li>
            </ul>
            <ng-template #aiOk>
              <p class="muted-copy">IA: todo alineado con estándar premium.</p>
            </ng-template>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="runAiFullAssist()">IA Full Assist</button>
              <button type="button" class="ghost-btn" (click)="runAiBusinessPlan()">IA Plan operativo</button>
              <button type="button" class="ghost-btn" (click)="runAiRiskShield()">IA Risk Shield</button>
              <button type="button" class="ghost-btn" (click)="autoFixDuplicateKeys()">Auto-fix keys</button>
              <button type="button" class="ghost-btn" (click)="autoFillMissingLabels()">Auto-labels</button>
            </div>
          </section>
          <section class="quality-panel ai-workbench-panel">
            <div class="panel-head">
              <h4>AI Roles Copilot</h4>
              <strong>{{ previewPersona === 'planner' ? 'Admin/Planner' : 'Cliente' }}</strong>
            </div>
            <p class="muted-copy">{{ aiRoleCopilotHint }}</p>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="runAiAdminOpsBoost()">IA Admin Ops</button>
              <button type="button" class="ghost-btn" (click)="runAiClientExperienceBoost()">IA Cliente UX</button>
              <button type="button" class="ghost-btn" (click)="runAiDualModeOptimization()">IA Dual Mode</button>
              <button type="button" class="ghost-btn" (click)="runAiWeddingLuxuryNarrativePack()">IA Luxury Copy</button>
              <button type="button" class="ghost-btn" (click)="runAiVendorContractPack()">IA Vendor Pack</button>
              <button type="button" class="ghost-btn" (click)="runAiCeremonyFlowPack()">IA Ceremony Pack</button>
            </div>
          </section>
        </article>

        <article class="panel-card editor-structure-card scroll-panel">
          <div class="panel-head">
            <h3>Estructura</h3>
            <div class="tiny-actions">
              <button type="button" class="ghost-btn" (click)="expandAllSections()">Expandir</button>
              <button type="button" class="ghost-btn" (click)="collapseAllSections()">Colapsar</button>
              <button type="button" class="ghost-btn" (click)="sortSectionsByWeddingFlow()">Autoordenar</button>
              <button type="button" class="ghost-btn" (click)="rebalanceRequiredCoverage()">Req inteligente</button>
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
            <article
              class="section-card"
              *ngFor="let section of sections; let si = index"
              (dragover)="onSectionDragOver($event)"
              (drop)="onSectionDrop($event, si)"
            >
              <div class="panel-head">
                <div class="section-head-main">
                  <input [(ngModel)]="section.title" (ngModelChange)="onDraftChange()" placeholder="Titulo" />
                  <span class="section-field-count">{{ section.fields.length }} campos</span>
                </div>
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="toggleSection(si)">{{ isSectionCollapsed(si) ? 'Abrir' : 'Ocultar' }}</button>
                  <button
                    type="button"
                    class="ghost-btn"
                    draggable="true"
                    title="Arrastra para mover seccion"
                    (dragstart)="onSectionDragStart(si)"
                    (dragend)="onSectionDragEnd()"
                  >
                    ↕
                  </button>
                  <button type="button" class="ghost-btn" (click)="moveSection(si, -1)" [disabled]="si===0">↑</button>
                  <button type="button" class="ghost-btn" (click)="moveSection(si, 1)" [disabled]="si===sections.length-1">↓</button>
                  <button type="button" class="ghost-btn" (click)="duplicateSection(si)">Dup</button>
                  <button type="button" class="ghost-btn" (click)="upgradeSectionWithAi(si)">IA bloque</button>
                  <button type="button" class="ghost-btn" (click)="removeSection(si)">X</button>
                </div>
              </div>
              <input class="section-description-input" [(ngModel)]="section.description" (ngModelChange)="onDraftChange()" placeholder="Descripcion corta de la seccion" />

              <div class="field-stack" *ngIf="!isSectionCollapsed(si)">
                <div
                  class="field-row-builder"
                  *ngFor="let field of section.fields; let fi = index"
                  (dragover)="onFieldDragOver($event)"
                  (drop)="onFieldDrop($event, si, fi)"
                >
                  <button
                    type="button"
                    class="ghost-btn"
                    draggable="true"
                    title="Arrastra para mover campo"
                    (dragstart)="onFieldDragStart(si, fi)"
                    (dragend)="onFieldDragEnd()"
                  >
                    ↕
                  </button>
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
                <button type="button" class="ghost-btn" (click)="addDayBSlots(si)">+ Slots Dia B</button>
                <button type="button" class="ghost-btn" (click)="injectRealWeddingFields(si)">+ Campos reales</button>
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
              <button type="button" class="ghost-btn" (click)="exportCurrentTemplatePdf()">PDF</button>
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
          <div class="segmented-control">
            <button type="button" class="ghost-btn" [class.is-active]="previewStage === 'preboda'" (click)="previewStage = 'preboda'">Pre-boda</button>
            <button type="button" class="ghost-btn" [class.is-active]="previewStage === 'dia_b'" (click)="previewStage = 'dia_b'">Dia B</button>
            <button type="button" class="ghost-btn" [class.is-active]="previewStage === 'post'" (click)="previewStage = 'post'">Post</button>
          </div>
          <div
            class="preview-viewport mirror-3d"
            [class.is-mobile]="previewDevice === 'mobile'"
            [class.is-live]="previewPulse"
            [ngStyle]="previewViewportStyle"
            (mousemove)="onMirrorMove($event)"
            (mouseleave)="onMirrorLeave($event)"
          >
            <div class="preview-stack preview-stack-rich" *ngIf="filteredPreviewSections.length; else emptyPreviewFiltered" [ngStyle]="previewStackStyle">
              <article
                class="preview-section preview-card"
                *ngFor="let section of filteredPreviewSections; let i = index"
                [style.animation-delay.ms]="40 * i"
                [ngStyle]="previewCardStyle"
              >
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

    <div class="canvas-preview-modal keep-menu-visible" *ngIf="showPreviewCanvas" (click)="closePreviewCanvas()">
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
          <article
            class="canvas-main-card"
            [class.is-showcase]="canvasFxMode === 'showcase'"
            [class.is-reveal]="canvasReveal"
            [ngStyle]="canvasMainCardStyle"
          >
            <div class="canvas-hero" [style.background-image]="canvasHeroImage" [ngStyle]="canvasHeroStyle">
              <span class="type-chip">{{ toLabel(draftType) }}</span>
              <strong>{{ sections.length }} secciones</strong>
            </div>
            <div class="canvas-body" [ngStyle]="canvasBodyStyle">
              <section class="canvas-paper-sheet" [ngStyle]="canvasPaperStyle">
                <div *ngIf="canvasShowSafeMargins" class="free-layout-safe-margins" [ngStyle]="canvasSafeMarginsStyle"></div>
                <div *ngIf="canvasShowRulers" [ngStyle]="canvasRulerTopStyle"></div>
                <div *ngIf="canvasShowRulers" [ngStyle]="canvasRulerLeftStyle"></div>
                <div *ngIf="canvasGuideX !== null" [ngStyle]="canvasGuideVerticalStyle"></div>
                <div *ngIf="canvasGuideY !== null" [ngStyle]="canvasGuideHorizontalStyle"></div>
                <article
                  class="canvas-section-card"
                  *ngFor="let section of filteredPreviewSections; let ci = index"
                  [ngStyle]="canvasSectionCardStyleFor(section, ci)"
                  (mousedown)="onCanvasSectionMouseDown($event, section, ci)"
                  [style.display]="canvasBlankPaperMode ? 'none' : null"
                >
                  <header>
                    <h4>{{ section.title }}</h4>
                    <span>{{ section.fields.length }} campos</span>
                  </header>
                  <p *ngIf="section.description">{{ section.description }}</p>
                  <div class="canvas-field-grid">
                    <label *ngFor="let field of section.fields">{{ field.label }}</label>
                  </div>
                  <div class="detail-row" *ngIf="canvasFreeMode">
                    <span>Drag <strong>Libre</strong></span>
                    <span>Grid <strong>{{ canvasShowGrid ? 'ON' : 'OFF' }}</strong></span>
                  </div>
                </article>

                <div
                  *ngFor="let el of freeLayoutElements"
                  class="free-layout-el"
                  [class.is-selected]="selectedFreeLayoutElementId === el.id"
                  [ngStyle]="freeLayoutElementStyle(el)"
                  [style.display]="el.visible === false ? 'none' : null"
                  (mousedown)="onFreeLayoutElementMouseDown($event, el)"
                  (click)="selectFreeLayoutElement(el.id); $event.stopPropagation()"
                >
                  <div
                    *ngIf="selectedFreeLayoutElementId === el.id"
                    class="free-layout-mini-toolbar"
                    [ngStyle]="freeLayoutMiniToolbarStyle(el)"
                    (mousedown)="$event.stopPropagation()"
                    (click)="$event.stopPropagation()"
                  >
                    <button type="button" (click)="bringSelectedFreeLayoutElement('front'); $event.stopPropagation()">Frente</button>
                    <button type="button" (click)="bringSelectedFreeLayoutElement('back'); $event.stopPropagation()">Atras</button>
                    <button type="button" (click)="duplicateSelectedFreeLayoutElement(); $event.stopPropagation()">Duplicar</button>
                    <button type="button" (click)="toggleLockSelectedFreeLayoutElement(); $event.stopPropagation()">{{ el.locked ? 'Unlock' : 'Lock' }}</button>
                    <button type="button" class="danger" (click)="deleteSelectedFreeLayoutElement(); $event.stopPropagation()">Eliminar</button>
                  </div>
                  <div
                    *ngIf="selectedFreeLayoutElementId === el.id && !el.locked"
                    class="free-layout-rotate-guide"
                    [ngStyle]="freeLayoutRotateGuideStyle()"
                  ></div>
                  <button
                    *ngIf="selectedFreeLayoutElementId === el.id && !el.locked"
                    type="button"
                    class="free-layout-rotate-handle"
                    [ngStyle]="freeLayoutRotateHandleStyle()"
                    (mousedown)="onFreeLayoutRotateHandleMouseDown($event, el)"
                  ></button>
                  <small *ngIf="canvasShowLayerLabels" [ngStyle]="freeLayoutLayerLabelStyle(el)">
                    {{ el.type }} · {{ roundInt(el.x) }},{{ roundInt(el.y) }}
                  </small>
                  <ng-container [ngSwitch]="el.type">
                    <img *ngSwitchCase="'image'" [src]="el.imageUrl || ''" alt="" [ngStyle]="freeLayoutImageInnerStyle(el)" />
                    <div *ngSwitchCase="'shape'" style="width:100%;height:100%;border-radius:inherit;"></div>
                    <span
                      *ngSwitchDefault
                      [attr.contenteditable]="'true'"
                      spellcheck="false"
                      (mousedown)="$event.stopPropagation()"
                      (click)="$event.stopPropagation()"
                      (dblclick)="$event.stopPropagation()"
                      (input)="onFreeLayoutTextInput($event, el)"
                      (blur)="onFreeLayoutTextBlur()"
                    >{{ el.text || (el.type === 'label' ? 'Label premium' : 'Texto') }}</span>
                  </ng-container>
                  <button
                    *ngIf="selectedFreeLayoutElementId === el.id && !el.locked"
                    type="button"
                    class="free-layout-resize-handle"
                    [ngStyle]="freeLayoutResizeHandleStyle('nw')"
                    (mousedown)="onFreeLayoutResizeHandleMouseDown($event, el, 'nw')"
                  ></button>
                  <button
                    *ngIf="selectedFreeLayoutElementId === el.id && !el.locked"
                    type="button"
                    class="free-layout-resize-handle"
                    [ngStyle]="freeLayoutResizeHandleStyle('ne')"
                    (mousedown)="onFreeLayoutResizeHandleMouseDown($event, el, 'ne')"
                  ></button>
                  <button
                    *ngIf="selectedFreeLayoutElementId === el.id && !el.locked"
                    type="button"
                    class="free-layout-resize-handle"
                    [ngStyle]="freeLayoutResizeHandleStyle('sw')"
                    (mousedown)="onFreeLayoutResizeHandleMouseDown($event, el, 'sw')"
                  ></button>
                  <button
                    *ngIf="selectedFreeLayoutElementId === el.id && !el.locked"
                    type="button"
                    class="free-layout-resize-handle"
                    [ngStyle]="freeLayoutResizeHandleStyle('se')"
                    (mousedown)="onFreeLayoutResizeHandleMouseDown($event, el, 'se')"
                  ></button>
                </div>
              </section>
            </div>
          </article>
          <aside class="canvas-side-panel">
            <div class="canvas-side-section">
              <div class="panel-head">
                <h4>Vista</h4>
                <span class="muted-copy">Preview studio</span>
              </div>
              <div class="segmented-control">
                <button type="button" class="ghost-btn" [class.is-active]="canvasFxMode === 'showcase'" (click)="canvasFxMode = 'showcase'">Showcase</button>
                <button type="button" class="ghost-btn" [class.is-active]="canvasFxMode === 'clean'" (click)="canvasFxMode = 'clean'">Clean</button>
              </div>
              <button type="button" class="ghost-btn" (click)="previewMode = previewMode === 'schema' ? 'filled' : 'schema'">
                Modo: {{ previewMode === 'schema' ? 'Schema' : 'Filled' }}
              </button>
              <div class="canvas-side-kpis">
                <article><span>Capas</span><strong>{{ freeLayoutElements.length }}</strong></article>
                <article><span>Zoom</span><strong>{{ canvasZoom }}%</strong></article>
                <article><span>Modo</span><strong>{{ canvasFreeMode ? 'Libre' : 'Flujo' }}</strong></article>
              </div>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="adjustCanvasZoom(-10)">-10%</button>
                <button type="button" class="ghost-btn" (click)="setCanvasZoom(100)">100%</button>
                <button type="button" class="ghost-btn" (click)="adjustCanvasZoom(10)">+10%</button>
              </div>
              <label class="preview-progress-control">
                Zoom canvas {{ canvasZoom }}%
                <input type="range" min="60" max="170" step="5" [(ngModel)]="canvasZoom" (ngModelChange)="onDraftChange()" />
              </label>
            </div>

            <div class="canvas-side-tabs">
              <button type="button" class="canvas-side-tab" [class.is-active]="previewSidebarTab === 'canvas'" (click)="previewSidebarTab = 'canvas'">Canvas</button>
              <button type="button" class="canvas-side-tab" [class.is-active]="previewSidebarTab === 'selection'" (click)="previewSidebarTab = 'selection'">Seleccion</button>
              <button type="button" class="canvas-side-tab" [class.is-active]="previewSidebarTab === 'blocks'" (click)="previewSidebarTab = 'blocks'">Bloques</button>
              <button type="button" class="canvas-side-tab" [class.is-active]="previewSidebarTab === 'style'" (click)="previewSidebarTab = 'style'">Estilo</button>
              <button type="button" class="canvas-side-tab" [class.is-active]="previewSidebarTab === 'actions'" (click)="previewSidebarTab = 'actions'">Acciones</button>
            </div>

            <div class="canvas-side-section" *ngIf="previewSidebarTab === 'canvas'">
              <div class="panel-head">
                <h4>Canvas</h4>
                <span class="muted-copy">Edicion libre</span>
              </div>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="toggleCanvasFreeMode()">{{ canvasFreeMode ? 'Canvas flujo' : 'Canvas libre' }}</button>
                <button type="button" class="ghost-btn" (click)="autoArrangeCanvasLayout()">Auto layout</button>
                <button type="button" class="ghost-btn" (click)="resetCanvasLayout()">Reset layout</button>
              </div>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="quickAddToPreviewCanvas('text')">+ Texto</button>
                <button type="button" class="ghost-btn" (click)="quickAddToPreviewCanvas('shape')">+ Shape</button>
                <button type="button" class="ghost-btn" (click)="quickAddToPreviewCanvas('image')">+ Imagen</button>
                <button type="button" class="ghost-btn" (click)="quickAddToPreviewCanvas('card')">+ Caja</button>
                <button type="button" class="ghost-btn" (click)="quickAddToPreviewCanvas('button')">+ Boton</button>
              </div>
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="canvasShowGrid" (ngModelChange)="onDraftChange()" />
                Grid canvas
              </label>
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="canvasSnapToGrid" (ngModelChange)="onDraftChange()" />
                Snap grid
              </label>
              <label class="small-check">
                <input type="checkbox" [(ngModel)]="canvasSnapToCenterGuides" (ngModelChange)="onDraftChange()" />
                Guias centro
              </label>
              <div class="canvas-mini-form">
                <label>Snap
                  <input type="number" min="1" max="48" [(ngModel)]="canvasGridSnapSize" (ngModelChange)="onCanvasAssistSettingChange()" />
                </label>
                <label>Nudge
                  <input type="number" min="1" max="80" [(ngModel)]="freeLayerNudgeStep" (ngModelChange)="onCanvasAssistSettingChange()" />
                </label>
              </div>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="applyFreeEditorControlPreset('precision')">Precision</button>
                <button type="button" class="ghost-btn" (click)="applyFreeEditorControlPreset('balanced')">Balanced</button>
                <button type="button" class="ghost-btn" (click)="applyFreeEditorControlPreset('fast')">Fast</button>
              </div>
            </div>

            <div class="canvas-side-section" *ngIf="previewSidebarTab === 'selection' && selectedFreeLayoutElement as activeLayer">
              <div class="panel-head">
                <h4>Capa</h4>
                <span class="muted-copy">{{ activeLayer.type }} · z{{ activeLayer.zIndex }}</span>
              </div>
              <div class="canvas-selection-card">
                <p class="canvas-selection-title">{{ activeLayer.text || activeLayer.imageUrl || 'Elemento visual' }}</p>
                <div class="canvas-mini-stats">
                  <span>X <strong>{{ roundInt(activeLayer.x) }}</strong></span>
                  <span>Y <strong>{{ roundInt(activeLayer.y) }}</strong></span>
                  <span>W <strong>{{ roundInt(activeLayer.width) }}</strong></span>
                  <span>H <strong>{{ roundInt(activeLayer.height) }}</strong></span>
                </div>
                <label class="small-check">
                  <input type="checkbox" [(ngModel)]="freeResizeLockAspect" />
                  Bloquear proporcion (resize)
                </label>
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="bringSelectedFreeLayoutElement('front')">Frente</button>
                  <button type="button" class="ghost-btn" (click)="bringSelectedFreeLayoutElement('back')">Atras</button>
                  <button type="button" class="ghost-btn" (click)="centerSelectedFreeLayoutElementOnPaper()">Centrar</button>
                </div>
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="toggleLockSelectedFreeLayoutElement()">{{ activeLayer.locked ? 'Unlock' : 'Lock' }}</button>
                  <button type="button" class="ghost-btn" (click)="toggleVisibilitySelectedFreeLayoutElement()">{{ activeLayer.visible === false ? 'Mostrar' : 'Ocultar' }}</button>
                  <button type="button" class="ghost-btn" (click)="duplicateSelectedFreeLayoutElement()">Duplicar</button>
                  <button type="button" class="ghost-btn danger-btn" (click)="deleteSelectedFreeLayoutElement()">Eliminar</button>
                </div>
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="cycleSelectedFreeLayoutLayer(-1)">Prev</button>
                  <button type="button" class="ghost-btn" (click)="cycleSelectedFreeLayoutLayer(1)">Next</button>
                  <button type="button" class="ghost-btn" (click)="alignSelectedFreeLayoutElement('left')">Izq</button>
                  <button type="button" class="ghost-btn" (click)="alignSelectedFreeLayoutElement('center')">Centro</button>
                  <button type="button" class="ghost-btn" (click)="alignSelectedFreeLayoutElement('right')">Der</button>
                </div>
                <label *ngIf="activeLayer.type !== 'shape'" class="canvas-inline-field">
                  {{ activeLayer.type === 'image' ? 'URL imagen' : 'Texto manual' }}
                  <textarea
                    *ngIf="activeLayer.type !== 'image'; else previewLayerImageInput"
                    [ngModel]="activeLayer.text || ''"
                    (ngModelChange)="updateSelectedFreeLayoutElement({ text: $event })"
                    rows="2"
                    placeholder="Escribe a mano libremente..."
                  ></textarea>
                  <ng-template #previewLayerImageInput>
                    <input
                      [ngModel]="activeLayer.imageUrl || ''"
                      (ngModelChange)="updateSelectedFreeLayoutElement({ imageUrl: $event })"
                      placeholder="https://..."
                    />
                  </ng-template>
                </label>
                <div class="canvas-mini-form canvas-mini-form-4">
                  <label>X
                    <input type="number" [ngModel]="activeLayer.x" (ngModelChange)="updateSelectedFreeLayoutElement({ x: numberOr($event, 0) })" />
                  </label>
                  <label>Y
                    <input type="number" [ngModel]="activeLayer.y" (ngModelChange)="updateSelectedFreeLayoutElement({ y: numberOr($event, 0) })" />
                  </label>
                  <label>W
                    <input type="number" [ngModel]="activeLayer.width" (ngModelChange)="updateSelectedFreeLayoutElement({ width: minNumber($event, 20) })" />
                  </label>
                  <label>H
                    <input type="number" [ngModel]="activeLayer.height" (ngModelChange)="updateSelectedFreeLayoutElement({ height: minNumber($event, 20) })" />
                  </label>
                </div>
                <div class="canvas-mini-form canvas-mini-form-4">
                  <label>Rot
                    <input type="number" [ngModel]="activeLayer.rotation" (ngModelChange)="updateSelectedFreeLayoutElement({ rotation: numberOr($event, 0) })" />
                  </label>
                  <label>Font
                    <input type="number" [ngModel]="activeLayer.fontSize || 16" (ngModelChange)="updateSelectedFreeLayoutElement({ fontSize: minNumber($event, 8) })" />
                  </label>
                  <label>Peso
                    <input type="number" [ngModel]="activeLayer.fontWeight || 500" (ngModelChange)="updateSelectedFreeLayoutElement({ fontWeight: minNumber($event, 100) })" />
                  </label>
                  <label>Radio
                    <input type="number" [ngModel]="activeLayer.borderRadius || 0" (ngModelChange)="updateSelectedFreeLayoutElement({ borderRadius: minNumber($event, 0) })" />
                  </label>
                </div>
                <div class="canvas-color-grid">
                  <label>Texto
                    <input type="color" [ngModel]="freeColorInput(activeLayer.color, '#0f172a')" (ngModelChange)="updateSelectedFreeLayoutElement({ color: $event })" />
                  </label>
                  <label>Fondo
                    <input type="color" [ngModel]="freeColorInput(activeLayer.background, '#ffffff')" (ngModelChange)="updateSelectedFreeLayoutElement({ background: $event })" />
                  </label>
                  <label>Borde
                    <input type="color" [ngModel]="freeColorInput(activeLayer.borderColor, '#cbd5e1')" (ngModelChange)="updateSelectedFreeLayoutElement({ borderColor: $event })" />
                  </label>
                </div>
                <div class="canvas-mini-form canvas-mini-form-4">
                  <label>Borde px
                    <input type="number" [ngModel]="activeLayer.borderWidth || 1" (ngModelChange)="updateSelectedFreeLayoutElement({ borderWidth: minNumber($event, 0) })" />
                  </label>
                  <label>Blur
                    <input type="number" [ngModel]="activeLayer.backdropBlur || 0" (ngModelChange)="updateSelectedFreeLayoutElement({ backdropBlur: minNumber($event, 0) })" />
                  </label>
                  <label>Tracking
                    <input type="number" [ngModel]="activeLayer.letterSpacing || 0" (ngModelChange)="updateSelectedFreeLayoutElement({ letterSpacing: numberOr($event, 0) })" />
                  </label>
                  <label>Line
                    <input type="number" step="0.1" [ngModel]="activeLayer.lineHeight || 1.2" (ngModelChange)="updateSelectedFreeLayoutElement({ lineHeight: minFloat($event, 0.5) })" />
                  </label>
                </div>
                <div class="canvas-mini-form">
                  <label>Alinear
                    <select [ngModel]="activeLayer.textAlign || 'left'" (ngModelChange)="updateSelectedFreeLayoutElement({ textAlign: $event })">
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                  <label>Opacidad
                    <input type="range" min="0.1" max="1" step="0.05" [ngModel]="activeLayer.opacity" (ngModelChange)="updateSelectedFreeLayoutElement({ opacity: numberOr($event, 1) })" />
                  </label>
                </div>
                <div class="canvas-mini-form">
                  <label>Blend mode
                    <select [ngModel]="activeLayer.blendMode || 'normal'" (ngModelChange)="updateSelectedFreeLayoutElement({ blendMode: $event })">
                      <option value="normal">Normal</option>
                      <option value="multiply">Multiply</option>
                      <option value="screen">Screen</option>
                      <option value="overlay">Overlay</option>
                      <option value="soft-light">Soft light</option>
                      <option value="difference">Difference</option>
                    </select>
                  </label>
                  <label>Efecto rapido
                    <select [ngModel]="''" (ngModelChange)="applyQuickSelectedEffect($event)">
                      <option value="">Sin cambio</option>
                      <option value="glass">Glass</option>
                      <option value="glow">Glow</option>
                      <option value="elevated">Elevated</option>
                      <option value="muted">Muted</option>
                    </select>
                  </label>
                </div>
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="applySelectedFreeLayoutStylePreset('title')">Preset titulo</button>
                  <button type="button" class="ghost-btn" (click)="applySelectedFreeLayoutStylePreset('chip')">Preset chip</button>
                  <button type="button" class="ghost-btn" (click)="applySelectedFreeLayoutStylePreset('glass')">Preset glass</button>
                  <button type="button" class="ghost-btn" (click)="copySelectedFreeLayoutStyle()">Copiar estilo</button>
                  <button type="button" class="ghost-btn" (click)="pasteStyleToSelectedFreeLayoutElement()">Pegar estilo</button>
                </div>
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="fitSelectedFreeLayoutTextBox()" [disabled]="activeLayer.type === 'image' || activeLayer.type === 'shape'">Auto texto</button>
                  <button type="button" class="ghost-btn" (click)="fitSelectedFreeLayoutElementToPaper('width')">Ajustar ancho</button>
                  <button type="button" class="ghost-btn" (click)="fitSelectedFreeLayoutElementToPaper('height')">Ajustar alto</button>
                  <button type="button" class="ghost-btn" (click)="snapSelectedFreeLayoutElementToSafeMargins()">Snap margenes</button>
                </div>
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="rotateSelectedFreeLayoutElement(-5)">-5°</button>
                  <button type="button" class="ghost-btn" (click)="rotateSelectedFreeLayoutElement(5)">+5°</button>
                  <button type="button" class="ghost-btn" (click)="resizeSelectedFreeLayoutElement(20, 0)">+W</button>
                  <button type="button" class="ghost-btn" (click)="resizeSelectedFreeLayoutElement(-20, 0)">-W</button>
                  <button type="button" class="ghost-btn" (click)="resizeSelectedFreeLayoutElement(0, 20)">+H</button>
                  <button type="button" class="ghost-btn" (click)="resizeSelectedFreeLayoutElement(0, -20)">-H</button>
                </div>
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="mirrorSelectedFreeLayoutElement('x')">Mirror X</button>
                  <button type="button" class="ghost-btn" (click)="mirrorSelectedFreeLayoutElement('y')">Mirror Y</button>
                  <button type="button" class="ghost-btn" (click)="duplicateSelectedFreeLayoutSeries('row')">Serie fila</button>
                  <button type="button" class="ghost-btn" (click)="duplicateSelectedFreeLayoutSeries('column')">Serie col</button>
                  <button type="button" class="ghost-btn" (click)="distributeFreeLayoutElements('horizontal')">Distribuir H</button>
                  <button type="button" class="ghost-btn" (click)="distributeFreeLayoutElements('vertical')">Distribuir V</button>
                </div>
                <div class="canvas-mini-form">
                  <label>Gradiente rapido
                    <select (ngModelChange)="applySelectedGradientPreset($event)" [ngModel]="''">
                      <option value="">Sin cambio</option>
                      <option value="softMint">Soft Mint</option>
                      <option value="editorialRose">Editorial Rose</option>
                      <option value="nightGlass">Night Glass</option>
                    </select>
                  </label>
                  <label>Sombra preset
                    <select (ngModelChange)="applySelectedShadowPreset($event)" [ngModel]="''">
                      <option value="">Sin cambio</option>
                      <option value="soft">Soft</option>
                      <option value="deep">Deep</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                </div>
                <div class="swatch-row">
                  <button type="button" class="swatch-btn is-teal" title="Teal" (click)="applyQuickSelectedPalette('teal')"></button>
                  <button type="button" class="swatch-btn is-rose" title="Rose" (click)="applyQuickSelectedPalette('rose')"></button>
                  <button type="button" class="swatch-btn is-gold" title="Gold" (click)="applyQuickSelectedPalette('gold')"></button>
                  <button type="button" class="swatch-btn is-ink" title="Ink" (click)="applyQuickSelectedPalette('ink')"></button>
                  <button type="button" class="ghost-btn" (click)="runAiSelectedLayerTextBoost()" [disabled]="activeLayer.type === 'shape' || activeLayer.type === 'image'">IA texto capa</button>
                </div>
              </div>
            </div>

            <div class="canvas-side-section" *ngIf="previewSidebarTab === 'selection' && !selectedFreeLayoutElement">
              <div class="panel-head">
                <h4>Seleccion</h4>
                <span class="muted-copy">Sin capa activa</span>
              </div>
              <p class="muted-copy">Haz click en una capa del canvas libre para editar texto, color, tamaño, estilo y posición.</p>
            </div>

            <div class="canvas-side-section" *ngIf="previewSidebarTab === 'selection' && freeLayoutElements.length">
              <div class="panel-head">
                <h4>Layer Stack</h4>
                <span class="muted-copy">{{ freeLayoutElements.length }} capas</span>
              </div>
              <div class="canvas-layer-list">
                <button
                  type="button"
                  class="canvas-layer-row"
                  *ngFor="let layer of previewLayerStack"
                  [class.is-active]="selectedFreeLayoutElementId === layer.id"
                  (click)="selectFreeLayoutElement(layer.id)"
                >
                  <span class="canvas-layer-type">{{ layer.type }}</span>
                  <span class="canvas-layer-name">{{ layer.text || layer.imageUrl || 'Elemento visual' }}</span>
                  <span class="canvas-layer-meta">z{{ layer.zIndex }}</span>
                </button>
              </div>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="sortFreeLayoutLayersByPosition()">Ordenar pos</button>
                <button type="button" class="ghost-btn" (click)="normalizeFreeLayoutLayerZ()">Normalizar Z</button>
                <button type="button" class="ghost-btn" (click)="clearFreeLayoutElements()" [disabled]="!freeLayoutElements.length">Limpiar capas</button>
              </div>
            </div>

            <div class="canvas-side-section" *ngIf="previewSidebarTab === 'blocks'">
              <div class="panel-head">
                <h4>Cajones y bloques</h4>
                <span class="muted-copy">Informacion visual</span>
              </div>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="quickAddPresetToPreviewCanvas('card')">Caja</button>
                <button type="button" class="ghost-btn" (click)="quickAddPresetToPreviewCanvas('note')">Nota</button>
                <button type="button" class="ghost-btn" (click)="quickAddPresetToPreviewCanvas('metric')">KPI</button>
                <button type="button" class="ghost-btn" (click)="quickAddPresetToPreviewCanvas('divider')">Divider</button>
                <button type="button" class="ghost-btn" (click)="quickAddPresetToPreviewCanvas('textBlock')">Texto largo</button>
                <button type="button" class="ghost-btn" (click)="quickAddPresetToPreviewCanvas('badge')">Badge</button>
              </div>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="quickAddKitToPreviewCanvas('hero')">Kit Hero</button>
                <button type="button" class="ghost-btn" (click)="quickAddKitToPreviewCanvas('stats')">Kit Stats</button>
                <button type="button" class="ghost-btn" (click)="quickAddKitToPreviewCanvas('cta')">Kit CTA</button>
                <button type="button" class="ghost-btn" (click)="quickAddKitToPreviewCanvas('signature')">Kit Firma</button>
              </div>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="buildFreeLayoutFromVisibleSections()">Importar secciones</button>
                <button type="button" class="ghost-btn" (click)="runAiFreeLayoutAutoComplete()">IA autocompletar canvas</button>
                <button type="button" class="ghost-btn" (click)="runAiVisualPolishPass()">IA visual polish</button>
              </div>
            </div>

            <div class="canvas-side-section" *ngIf="previewSidebarTab === 'style'">
              <div class="panel-head">
                <h4>Estilo plantilla</h4>
                <span class="muted-copy">Tema global</span>
              </div>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="applyDesignPreset('romantic')">Romantic</button>
                <button type="button" class="ghost-btn" (click)="applyDesignPreset('minimal')">Minimal</button>
                <button type="button" class="ghost-btn" (click)="applyDesignPreset('night')">Night</button>
              </div>
              <div class="tiny-actions">
                <button type="button" class="ghost-btn" (click)="applyVisualStylePreset('editorial')">Editorial</button>
                <button type="button" class="ghost-btn" (click)="applyVisualStylePreset('luxe')">Luxe</button>
                <button type="button" class="ghost-btn" (click)="applyVisualStylePreset('botanical')">Botanical</button>
                <button type="button" class="ghost-btn" (click)="applyVisualStylePreset('modern')">Modern</button>
              </div>
              <div class="canvas-color-grid">
                <label>Principal
                  <input type="color" [(ngModel)]="designPrimaryColor" (ngModelChange)="onDraftChange()" />
                </label>
                <label>Acento
                  <input type="color" [(ngModel)]="designAccentColor" (ngModelChange)="onDraftChange()" />
                </label>
                <label>Texto
                  <input type="color" [(ngModel)]="visualTextColor" (ngModelChange)="onDraftChange()" />
                </label>
                <label>Muted
                  <input type="color" [(ngModel)]="visualMutedTextColor" (ngModelChange)="onDraftChange()" />
                </label>
              </div>
              <div class="swatch-row">
                <button type="button" class="swatch-btn is-editorial" title="Editorial" (click)="applyQuickThemePalette('editorial')"></button>
                <button type="button" class="swatch-btn is-botanical" title="Botanical" (click)="applyQuickThemePalette('botanical')"></button>
                <button type="button" class="swatch-btn is-sunset" title="Sunset" (click)="applyQuickThemePalette('sunset')"></button>
                <button type="button" class="swatch-btn is-midnight" title="Midnight" (click)="applyQuickThemePalette('midnight')"></button>
              </div>
              <div class="canvas-mini-form">
                <label>Fondo viewport
                  <input [(ngModel)]="visualSurfaceBackground" (ngModelChange)="onDraftChange()" placeholder="linear-gradient(...)" />
                </label>
                <label>Overlay hero
                  <input [(ngModel)]="visualHeroOverlay" (ngModelChange)="onDraftChange()" placeholder="linear-gradient(...)" />
                </label>
              </div>
              <div class="canvas-mini-form canvas-mini-form-4">
                <label>R viewport
                  <input type="number" [ngModel]="visualBorderRadius" (ngModelChange)="visualBorderRadius = minNumber($event, 0); onDraftChange()" />
                </label>
                <label>R tarjeta
                  <input type="number" [ngModel]="visualCardRadius" (ngModelChange)="visualCardRadius = minNumber($event, 0); onDraftChange()" />
                </label>
                <label>Gap
                  <input type="number" [ngModel]="visualCardGap" (ngModelChange)="visualCardGap = minNumber($event, 0); onDraftChange()" />
                </label>
                <label>Sombra
                  <select [ngModel]="''" (ngModelChange)="applySelectedShadowPreset($event)">
                    <option value="">Preset sombra capa</option>
                    <option value="soft">Soft</option>
                    <option value="deep">Deep</option>
                    <option value="none">None</option>
                  </select>
                </label>
              </div>
            </div>

            <div class="canvas-side-section" *ngIf="previewSidebarTab === 'actions'">
              <div class="panel-head">
                <h4>IA y acciones</h4>
                <span class="muted-copy">Boost rapido</span>
              </div>
              <button type="button" class="ghost-btn" (click)="runAiTemplateAudit()">IA: Diagnosticar</button>
              <button type="button" class="ghost-btn" (click)="runAiAutoStructure()">IA: Autoestructurar</button>
              <button type="button" class="ghost-btn" (click)="runAiPremiumCopy()">IA: Copy premium</button>
              <button type="button" class="ghost-btn" (click)="runAiClientSimulation()">IA: Simular cliente</button>
              <button type="button" class="ghost-btn" (click)="triggerCanvasReveal()">Play reveal</button>
              <button type="button" class="ghost-btn" (click)="collapseAllSections()">Colapsar todo</button>
              <button type="button" class="ghost-btn" (click)="expandAllSections()">Expandir todo</button>
              <button type="button" class="ghost-btn" (click)="exportCurrentTemplatePdf()">Exportar PDF</button>
              <button type="button" class="ghost-btn" (click)="save()">Guardar cambios</button>
              <p class="muted-copy ai-note" *ngIf="aiCopilotNote">{{ aiCopilotNote }}</p>
              <p class="muted-copy canvas-shortcuts-note">Flechas=grid · Shift+Flechas=nudge · Alt+Flechas=fino · Ctrl+D · Del</p>
            </div>
            <div class="canvas-mini-timeline" *ngIf="previewSidebarTab === 'actions'">
              <p>Demo cliente</p>
              <ul>
                <li>Kickoff creativo</li>
                <li>Aprobacion proveedores</li>
                <li>Reunion final</li>
                <li>Ejecucion dia B</li>
              </ul>
            </div>
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
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  private readonly draftChanges$ = new Subject<void>();
  private readonly subscriptions = new Subscription();
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;
  private collapsedSections = new Set<number>();
  private history: TemplateSection[][] = [];
  private future: TemplateSection[][] = [];
  private autoPilotRunning = false;
  private draggedSectionIndex: number | null = null;
  private draggedFieldRef: { sectionIndex: number; fieldIndex: number } | null = null;
  private canvasDragState:
    | {
        key: string;
        startClientX: number;
        startClientY: number;
        startX: number;
        startY: number;
      }
    | null = null;
  private freeElementDragState:
    | {
        id: string;
        startClientX: number;
        startClientY: number;
        startX: number;
        startY: number;
      }
    | null = null;
  private freeElementResizeState:
    | {
        id: string;
        handle: FreeResizeHandle;
        startClientX: number;
        startClientY: number;
        startX: number;
        startY: number;
        startWidth: number;
        startHeight: number;
        aspectRatio: number;
      }
    | null = null;
  private freeElementRotateState:
    | {
        id: string;
        centerClientX: number;
        centerClientY: number;
        startPointerAngle: number;
        startRotation: number;
      }
    | null = null;
  canvasGuideX: number | null = null;
  canvasGuideY: number | null = null;

  loaded = false;
  saving = false;
  statusText = '';
  hasPendingChanges = false;
  templateId = '';
  isNewTemplateMode = false;
  previewDevice: 'desktop' | 'mobile' = 'desktop';
  previewMode: PreviewMode = 'schema';
  previewPulse = false;
  previewQuery = '';
  previewCompletion = 45;
  previewPersona: PreviewPersona = 'planner';
  previewStage: PreviewStage = 'preboda';
  canvasFxMode: CanvasFxMode = 'showcase';
  canvasReveal = false;
  showPreviewCanvas = false;
  showCatalogView = false;
  previewSidebarTab: 'canvas' | 'selection' | 'blocks' | 'style' | 'actions' = 'canvas';
  aiCopilotNote = '';
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
  designFontFamily = "'Poppins', 'Segoe UI', sans-serif";
  designTitleFontFamily = "'Playfair Display', 'Georgia', serif";
  designPrimaryColor = '#0f766e';
  designAccentColor = '#7c3aed';
  designPageBackground =
    'radial-gradient(circle at 10% 0%,rgba(244,114,182,.16),transparent 34%),radial-gradient(circle at 90% 12%,rgba(14,165,233,.12),transparent 42%),linear-gradient(180deg,#fff8fb,#f8fbff 60%,#f3f6fb)';
  designHeroImageUrl = '';
  designLogoImageUrl = '';
  designCompactMode = false;
  visualStylePreset: VisualStylePreset = 'editorial';
  visualSurfaceBackground = 'linear-gradient(180deg, rgba(255,255,255,.88), rgba(248,250,252,.9))';
  visualTextColor = '#0f172a';
  visualMutedTextColor = '#475569';
  visualCardBackground = 'rgba(255,255,255,.84)';
  visualCardBorderColor = 'rgba(148,163,184,.28)';
  visualHeroOverlay = 'linear-gradient(150deg, rgba(15,23,42,.42), rgba(15,118,110,.24))';
  visualBorderRadius = 22;
  visualCardRadius = 18;
  visualCardGap = 14;
  visualCardShadow = '0 22px 50px rgba(15,23,42,.14)';
  visualViewportCss = '';
  visualCardCss = '';
  visualHeroCss = '';
  autoPilotEnabled = false;
  quickAiPrompt = '';
  editorSnapshots: EditorSnapshot[] = [];
  selectedSnapshotId = '';
  pdfExportPreset: PdfExportPreset = 'signature';
  pdfLayoutMode: 'cards' | 'list' = 'cards';
  pdfShowToc = true;
  pdfShowWatermark = true;
  pdfShowDesignSheet = true;
  pdfShowGeneratedStamp = true;
  pdfWatermarkText = 'I Do Manager';
  pdfFooterText = 'Documento premium generado para wedding planner y cliente';
  pdfPageFormat: 'A4' | 'Letter' = 'A4';
  pdfDensity: 'comfortable' | 'compact' = 'comfortable';
  canvasFreeMode = false;
  canvasShowGrid = true;
  canvasZoom = 100;
  canvasSectionPositions: Record<string, CanvasSectionPosition> = {};
  canvasBlankPaperMode = false;
  canvasShowSafeMargins = true;
  canvasSnapToGrid = true;
  canvasSnapToCenterGuides = true;
  canvasGridSnapSize = 6;
  canvasSectionSnapSize = 12;
  canvasCenterGuideTolerance = 10;
  freeCanvasPaperPreset: 'a4p' | 'a4l' | 'square' | 'tall' | 'custom' = 'a4p';
  freeCanvasPaperWidth = 720;
  freeCanvasPaperHeight = 1020;
  canvasShowRulers = true;
  canvasShowLayerLabels = true;
  freeLayerNudgeStep = 10;
  freeLayerFineNudgeStep = 1;
  freeResizeLockAspect = false;
  freeLayoutElements: FreeLayoutElement[] = [];
  selectedFreeLayoutElementId = '';
  freeLayoutQuickImageUrl = '';
  freeLayoutStyleClipboard: Partial<FreeLayoutElement> | null = null;
  defaultFreeLayoutFontFamily = "'Poppins', 'Segoe UI', sans-serif";
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

  get aiRecommendations() {
    const hints: string[] = [];
    if (this.missingCoreBlocks.length) {
      hints.push(`Añade bloques core: ${this.missingCoreBlocks.join(', ')}.`);
    }
    if (this.requiredFields < Math.ceil(this.totalFields * 0.35) && this.totalFields > 0) {
      hints.push('Marca más campos críticos como requeridos para operación real.');
    }
    const duplicatedKeyIssue = this.validationIssues.find((issue) => issue.message.includes('Key duplicada'));
    if (duplicatedKeyIssue) hints.push('Corrige keys duplicadas para evitar errores de datos.');
    if (this.previewCompletion < 55) hints.push('Simula mayor avance operativo para validar experiencia cliente.');
    if (!this.enableGuestCare) hints.push('Activa seguimiento de experiencia invitado para plantillas wedding.');
    return hints.slice(0, 5);
  }

  get aiOperationalScore() {
    const score = this.completenessScore + this.requiredFields - this.aiRecommendations.length * 6;
    return Math.max(20, Math.min(100, score));
  }

  get aiRoleCopilotHint() {
    if (this.previewPersona === 'client') {
      return 'IA prioriza claridad, menos friccion visual y pasos faciles de completar para la pareja.';
    }
    return 'IA prioriza control operativo, cobertura de riesgos, proveedores y campos criticos para el planner.';
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
    this.subscriptions.add(
      this.draftChanges$.pipe(debounceTime(900)).subscribe(() => {
        if (this.autoPilotEnabled && !this.autoPilotRunning) {
          this.applySilentAutoPilotPass();
        }
        this.save(false);
      }),
    );

    this.templateId = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.templateId || this.templateId === 'new') {
      this.isNewTemplateMode = true;
      this.templateId = '';
      this.draftName = 'Nuevo template wedding';
      this.draftType = 'CHECKLIST';
      this.draftDescription = 'Plantilla editable desde Editor Pro con IA, estilo y drag & drop.';
      this.resetToStarterTemplateState();
      this.loaded = true;
      this.statusText = 'Editor libre listo (modo nuevo template).';
      return;
    }
    this.http.get<TemplateModel>(`http://localhost:3000/api/v1/templates/${this.templateId}`).subscribe({
      next: (template) => {
        this.draftName = template.name;
        this.draftType = template.type;
        this.draftDescription = template.description ?? '';
        this.sections = this.readSections(template.schemaJson);
        this.readSettings(template.schemaJson);
        this.isNewTemplateMode = false;
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
    if (this.revealTimer) clearTimeout(this.revealTimer);
  }

  @HostListener('wheel', ['$event'])
  preventZoomOnCtrlWheel(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault();
    }
  }

  @HostListener('window:keydown', ['$event'])
  handleEditorShortcuts(event: KeyboardEvent) {
    if (this.handleFreeLayoutKeyboardShortcuts(event)) {
      return;
    }
    const key = event.key.toLowerCase();
    if (event.ctrlKey && key === 's') {
      event.preventDefault();
      this.saveNow();
      return;
    }
    if (event.ctrlKey && event.shiftKey && key === 'p') {
      event.preventDefault();
      this.openPreviewCanvas();
      return;
    }
    if (event.ctrlKey && event.shiftKey && key === 'k') {
      event.preventDefault();
      this.applyQuickAiPrompt();
      return;
    }
    if (key === 'escape' && this.showPreviewCanvas) {
      event.preventDefault();
      this.closePreviewCanvas();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(event: MouseEvent) {
    if (this.freeElementRotateState && this.showPreviewCanvas) {
      const angle =
        (Math.atan2(event.clientY - this.freeElementRotateState.centerClientY, event.clientX - this.freeElementRotateState.centerClientX) *
          180) /
        Math.PI;
      let next = this.freeElementRotateState.startRotation + (angle - this.freeElementRotateState.startPointerAngle);
      if (event.shiftKey) {
        next = Math.round(next / 5) * 5;
      }
      this.freeLayoutElements = this.freeLayoutElements.map((item) =>
        item.id === this.freeElementRotateState?.id ? { ...item, rotation: next } : item,
      );
      return;
    }
    if (this.freeElementResizeState && this.showPreviewCanvas) {
      const zoom = this.canvasZoom / 100;
      const dx = (event.clientX - this.freeElementResizeState.startClientX) / zoom;
      const dy = (event.clientY - this.freeElementResizeState.startClientY) / zoom;
      const snap = this.canvasShowGrid && this.canvasSnapToGrid ? Math.max(1, this.canvasGridSnapSize) : 1;
      const minSize = 20;
      let x = this.freeElementResizeState.startX;
      let y = this.freeElementResizeState.startY;
      let width = this.freeElementResizeState.startWidth;
      let height = this.freeElementResizeState.startHeight;
      const handle = this.freeElementResizeState.handle;

      if (handle === 'ne' || handle === 'se') width = Math.max(minSize, this.freeElementResizeState.startWidth + dx);
      if (handle === 'sw' || handle === 'se') height = Math.max(minSize, this.freeElementResizeState.startHeight + dy);
      if (handle === 'nw' || handle === 'sw') {
        const nextWidth = this.freeElementResizeState.startWidth - dx;
        width = Math.max(minSize, nextWidth);
        x = this.freeElementResizeState.startX + (this.freeElementResizeState.startWidth - width);
      }
      if (handle === 'nw' || handle === 'ne') {
        const nextHeight = this.freeElementResizeState.startHeight - dy;
        height = Math.max(minSize, nextHeight);
        y = this.freeElementResizeState.startY + (this.freeElementResizeState.startHeight - height);
      }

      const keepAspect = this.freeResizeLockAspect || event.shiftKey;
      if (keepAspect) {
        const ratio = Math.max(0.01, this.freeElementResizeState.aspectRatio || 1);
        if (Math.abs(dx) >= Math.abs(dy)) {
          height = Math.max(minSize, width / ratio);
        } else {
          width = Math.max(minSize, height * ratio);
        }
        if (handle === 'nw' || handle === 'sw') {
          x = this.freeElementResizeState.startX + (this.freeElementResizeState.startWidth - width);
        }
        if (handle === 'nw' || handle === 'ne') {
          y = this.freeElementResizeState.startY + (this.freeElementResizeState.startHeight - height);
        }
      }

      x = Math.max(0, Math.round(x / snap) * snap);
      y = Math.max(0, Math.round(y / snap) * snap);
      width = Math.max(minSize, Math.round(width / snap) * snap);
      height = Math.max(minSize, Math.round(height / snap) * snap);

      this.freeLayoutElements = this.freeLayoutElements.map((item) =>
        item.id === this.freeElementResizeState?.id ? { ...item, x, y, width, height } : item,
      );
      return;
    }
    if (this.freeElementDragState && this.showPreviewCanvas) {
      const zoom = this.canvasZoom / 100;
      const dx = (event.clientX - this.freeElementDragState.startClientX) / zoom;
      const dy = (event.clientY - this.freeElementDragState.startClientY) / zoom;
      const active = this.freeLayoutElements.find((item) => item.id === this.freeElementDragState?.id);
      const snap = this.canvasShowGrid && this.canvasSnapToGrid ? Math.max(1, this.canvasGridSnapSize) : 1;
      let x = Math.max(0, Math.round((this.freeElementDragState.startX + dx) / snap) * snap);
      let y = Math.max(0, Math.round((this.freeElementDragState.startY + dy) / snap) * snap);
      this.canvasGuideX = null;
      this.canvasGuideY = null;
      if (active && this.canvasSnapToCenterGuides) {
        const centerX = Math.round(this.freeCanvasPaperWidth / 2);
        const centerY = Math.round(this.freeCanvasPaperHeight / 2);
        const elementCenterX = x + active.width / 2;
        const elementCenterY = y + active.height / 2;
        const tolerance = Math.max(2, this.canvasCenterGuideTolerance);
        if (Math.abs(elementCenterX - centerX) <= tolerance) {
          x = Math.round(centerX - active.width / 2);
          this.canvasGuideX = centerX;
        }
        if (Math.abs(elementCenterY - centerY) <= tolerance) {
          y = Math.round(centerY - active.height / 2);
          this.canvasGuideY = centerY;
        }
      }
      this.freeLayoutElements = this.freeLayoutElements.map((item) =>
        item.id === this.freeElementDragState?.id ? { ...item, x, y } : item,
      );
      return;
    }
    if (!this.canvasDragState || !this.canvasFreeMode || !this.showPreviewCanvas) return;
    const zoom = this.canvasZoom / 100;
    const dx = (event.clientX - this.canvasDragState.startClientX) / zoom;
    const dy = (event.clientY - this.canvasDragState.startClientY) / zoom;
    const snap = this.canvasShowGrid ? Math.max(1, this.canvasSectionSnapSize) : 1;
    const x = Math.max(0, Math.round((this.canvasDragState.startX + dx) / snap) * snap);
    const y = Math.max(0, Math.round((this.canvasDragState.startY + dy) / snap) * snap);
    this.canvasSectionPositions = {
      ...this.canvasSectionPositions,
      [this.canvasDragState.key]: { x, y },
    };
  }

  @HostListener('window:mouseup')
  onWindowMouseUp() {
    if (this.freeElementRotateState) {
      this.freeElementRotateState = null;
      this.statusText = 'Rotacion de capa actualizada.';
      this.onDraftChange();
      return;
    }
    if (this.freeElementResizeState) {
      this.freeElementResizeState = null;
      this.statusText = 'Tamano de capa actualizado.';
      this.onDraftChange();
      return;
    }
    if (this.freeElementDragState) {
      this.freeElementDragState = null;
      this.canvasGuideX = null;
      this.canvasGuideY = null;
      this.statusText = 'Capa libre actualizada.';
      this.onDraftChange();
      return;
    }
    if (!this.canvasDragState) return;
    this.canvasDragState = null;
    this.statusText = 'Layout visual actualizado.';
    this.onDraftChange();
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

  onCanvasAssistSettingChange() {
    this.canvasGridSnapSize = this.minNumber(this.canvasGridSnapSize, 1);
    this.canvasSectionSnapSize = this.minNumber(this.canvasSectionSnapSize, 1);
    this.canvasCenterGuideTolerance = this.minNumber(this.canvasCenterGuideTolerance, 2);
    this.freeLayerNudgeStep = this.minNumber(this.freeLayerNudgeStep, 1);
    this.freeLayerFineNudgeStep = this.minNumber(this.freeLayerFineNudgeStep, 1);
    this.statusText = 'Controles de precision del editor libre actualizados.';
    this.onDraftChange();
  }

  applyFreeEditorControlPreset(preset: 'precision' | 'balanced' | 'fast') {
    if (preset === 'precision') {
      this.canvasGridSnapSize = 2;
      this.canvasSectionSnapSize = 6;
      this.canvasCenterGuideTolerance = 6;
      this.freeLayerNudgeStep = 4;
      this.freeLayerFineNudgeStep = 1;
    } else if (preset === 'fast') {
      this.canvasGridSnapSize = 12;
      this.canvasSectionSnapSize = 18;
      this.canvasCenterGuideTolerance = 14;
      this.freeLayerNudgeStep = 20;
      this.freeLayerFineNudgeStep = 5;
    } else {
      this.canvasGridSnapSize = 6;
      this.canvasSectionSnapSize = 12;
      this.canvasCenterGuideTolerance = 10;
      this.freeLayerNudgeStep = 10;
      this.freeLayerFineNudgeStep = 1;
    }
    this.statusText = `Preset ${preset} aplicado al editor libre`;
    this.onDraftChange();
  }

  private applySilentAutoPilotPass() {
    this.autoPilotRunning = true;
    try {
      const used = new Set<string>();
      let required = 0;
      let total = 0;
      this.sections = this.sections.map((section) => ({
        ...section,
        title: section.title?.trim() || 'Bloque wedding',
        fields: (section.fields ?? []).map((field, index) => {
          total += 1;
          const base = this.slugify(field.key || field.label || `campo_${index + 1}`);
          let candidate = base;
          let n = 2;
          while (used.has(candidate)) {
            candidate = `${base}_${n}`;
            n += 1;
          }
          used.add(candidate);
          const normalized = {
            ...field,
            key: candidate,
            label: field.label?.trim() || candidate.replace(/_/g, ' '),
          };
          if (normalized.required) required += 1;
          return normalized;
        }),
      }));

      const target = Math.ceil(total * 0.4);
      if (required < target) {
        for (const section of this.sections) {
          for (const field of section.fields) {
            if (required >= target) break;
            if (field.required || ['checkbox', 'textarea'].includes(field.type)) continue;
            field.required = true;
            required += 1;
          }
          if (required >= target) break;
        }
      }
    } finally {
      this.autoPilotRunning = false;
    }
  }

  pushHistorySnapshot() {
    this.history.push(structuredClone(this.sections));
    if (this.history.length > 50) this.history.shift();
    this.future = [];
  }

  save(manual = true) {
    if (!this.loaded || this.saving) return;
    if (this.isNewTemplateMode) {
      if (manual) this.saveAsCopy();
      else this.statusText = 'Modo nuevo template: pendiente de crear.';
      return;
    }
    if (!this.templateId) {
      this.statusText = 'Template sin ID. Usa Guardar como copia.';
      return;
    }

    this.saving = true;
    this.statusText = manual ? 'Guardando...' : '';

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
          aiPrompt: this.quickAiPrompt.trim(),
          options: {
            budgetAlerts: this.enableBudgetAlerts,
            guestCare: this.enableGuestCare,
            vendorOps: this.enableVendorOps,
          },
          design: this.currentDesignSettings,
          visualStyle: this.currentVisualStyleSettings,
          pdfExport: this.currentPdfExportSettings,
          canvasLayout: this.currentCanvasLayoutSettings,
          freeLayout: this.currentFreeLayoutSettings,
        },
      },
    };

    this.http.patch(`http://localhost:3000/api/v1/templates/${this.templateId}`, payload).subscribe({
      next: () => {
        this.saving = false;
        this.hasPendingChanges = false;
        this.statusText = `Guardado ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      },
      error: (error) => {
        this.saving = false;
        this.statusText = `Error al guardar: ${this.extractErrorMessage(error)}`;
      },
    });
  }

  saveNow() {
    this.save(true);
  }

  saveAsCopy() {
    const payload = {
      name: this.isNewTemplateMode ? (this.draftName.trim() || 'Nuevo template wedding') : `${this.draftName} (copia)`,
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
          aiPrompt: this.quickAiPrompt.trim(),
          options: {
            budgetAlerts: this.enableBudgetAlerts,
            guestCare: this.enableGuestCare,
            vendorOps: this.enableVendorOps,
          },
          design: this.currentDesignSettings,
          visualStyle: this.currentVisualStyleSettings,
          pdfExport: this.currentPdfExportSettings,
          canvasLayout: this.currentCanvasLayoutSettings,
          freeLayout: this.currentFreeLayoutSettings,
        },
      },
    };
    this.http.post<TemplateModel>('http://localhost:3000/api/v1/templates', payload).subscribe({
      next: (created) => {
        this.statusText = this.isNewTemplateMode ? 'Template creado' : 'Copia creada';
        this.isNewTemplateMode = false;
        this.router.navigate(['/app/templates', created.id]);
      },
      error: (error) => {
        this.statusText = `No se pudo crear copia: ${this.extractErrorMessage(error)}`;
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

  fillQuickAiPromptSample() {
    this.quickAiPrompt =
      'Boda de 180 invitados en finca, ceremonia civil, foco en presupuesto, proveedores premium, timeline dia B y experiencia cliente.';
    this.onDraftChange();
  }

  applyQuickAiPrompt() {
    const prompt = this.quickAiPrompt.trim().toLowerCase();
    if (!prompt) {
      this.statusText = 'Escribe un brief rapido para aplicar IA.';
      return;
    }
    this.pushHistorySnapshot();
    const blocksToAdd: string[] = [];
    const maybeAdd = (title: string) => {
      const exists = this.sections.some((section) => section.title.toLowerCase().includes(title.toLowerCase()));
      if (!exists) blocksToAdd.push(title);
    };

    if (prompt.includes('timeline') || prompt.includes('dia b') || prompt.includes('hora')) maybeAdd('Timeline Dia B');
    if (prompt.includes('presupuesto') || prompt.includes('coste') || prompt.includes('pago')) maybeAdd('Presupuesto');
    if (prompt.includes('invitad') || prompt.includes('rsvp') || prompt.includes('seating')) maybeAdd('Invitados y seating');
    if (prompt.includes('proveedor') || prompt.includes('vendor')) maybeAdd('Proveedores');
    if (prompt.includes('legal') || prompt.includes('contrato')) maybeAdd('Legal y contratos');
    if (prompt.includes('transporte') || prompt.includes('logistica')) maybeAdd('Transporte');

    blocksToAdd.forEach((block) => {
      this.sections.push({
        title: block,
        description: 'Bloque generado desde AI Prompt Express.',
        fields: this.defaultRowsForBlock(block),
      });
    });

    if (prompt.includes('cliente') || prompt.includes('novio') || prompt.includes('novia')) {
      this.previewPersona = 'client';
      this.enableGuestCare = true;
    }
    if (prompt.includes('planner') || prompt.includes('agencia')) {
      this.previewPersona = 'planner';
      this.enableVendorOps = true;
    }

    if (prompt.includes('minimal')) this.applyDesignPreset('minimal');
    if (prompt.includes('noche')) this.applyDesignPreset('night');
    if (prompt.includes('romant')) this.applyDesignPreset('romantic');

    this.autoFixDuplicateKeys();
    this.autoFillMissingLabels();
    this.autoCompleteRequiredFields();
    this.sortSectionsByWeddingFlow();

    this.aiCopilotNote = `AI Prompt aplicado: ${blocksToAdd.length} bloque(s) nuevo(s).`;
    this.triggerCanvasReveal();
    this.onDraftChange();
  }

  createFromPromptAndSave() {
    this.applyQuickAiPrompt();
    this.saveNow();
  }

  runAiAutopilot() {
    this.pushHistorySnapshot();
    this.runAiAutoStructure();
    this.autoFixDuplicateKeys();
    this.autoFillMissingLabels();
    this.rebalanceRequiredCoverage(0.45);
    this.dedupeSimilarSections();
    if (this.completenessScore < 70) {
      this.addFinancialControlPack();
      this.addGuestRsvpPack();
    }
    this.sortSectionsByWeddingFlow();
    this.applyWeddingProfessionalCopy();
    this.captureSnapshot('Autopilot IA');
    this.aiCopilotNote = 'IA Autopilot ejecutado: estructura, copy, limpieza y validacion reforzada.';
    this.triggerCanvasReveal();
    this.onDraftChange();
  }

  generateCompleteWeddingSuite() {
    this.pushHistorySnapshot();
    this.sections = [
      {
        title: 'Brief y objetivos del evento',
        description: 'Datos clave de alcance, vision y prioridades de la pareja.',
        fields: [
          { key: 'fecha_boda_objetivo', label: 'Fecha objetivo de boda', type: 'date', required: true },
          { key: 'numero_invitados_estimado', label: 'Numero de invitados estimado', type: 'number', required: true },
          { key: 'presupuesto_global_objetivo', label: 'Presupuesto global objetivo', type: 'currency', required: true },
          { key: 'estilo_visual_preferido', label: 'Estilo visual preferido', type: 'text', required: false },
        ],
      },
      {
        title: 'Timeline operativo dia B',
        description: 'Secuencia horaria con responsables y puntos de control.',
        fields: [
          { key: 'hora_inicio_preparativos', label: 'Hora inicio preparativos', type: 'time', required: true },
          { key: 'hora_ceremonia', label: 'Hora ceremonia', type: 'time', required: true },
          { key: 'hora_cocktail', label: 'Hora cocktail', type: 'time', required: false },
          { key: 'hora_apertura_fiesta', label: 'Hora apertura fiesta', type: 'time', required: false },
          { key: 'responsable_coordinacion_dia_b', label: 'Responsable coordinacion dia B', type: 'text', required: true },
        ],
      },
      {
        title: 'Control financiero y pagos',
        description: 'Seguimiento de partidas, vencimientos y desviaciones.',
        fields: [
          { key: 'partida_presupuestaria', label: 'Partida presupuestaria', type: 'text', required: true },
          { key: 'importe_previsto', label: 'Importe previsto', type: 'currency', required: true },
          { key: 'importe_pagado', label: 'Importe pagado', type: 'currency', required: false },
          { key: 'desviacion_detectada', label: 'Desviacion detectada', type: 'currency', required: false },
          { key: 'estado_pago_global', label: 'Estado de pago global', type: 'select', required: true },
        ],
      },
      {
        title: 'Invitados, RSVP y seating',
        description: 'Gestion de confirmaciones, mesas y restricciones especiales.',
        fields: [
          { key: 'nombre_invitado', label: 'Nombre invitado', type: 'text', required: true },
          { key: 'confirmacion_rsvp', label: 'Confirmacion RSVP', type: 'select', required: true },
          { key: 'mesa_asignada', label: 'Mesa asignada', type: 'text', required: false },
          { key: 'alergias_restricciones', label: 'Alergias o restricciones', type: 'textarea', required: false },
          { key: 'asistencia_final_confirmada', label: 'Asistencia final confirmada', type: 'checkbox', required: false },
        ],
      },
      {
        title: 'Proveedores y contratos',
        description: 'Operativa contractual, puntos de contacto y estado de entrega.',
        fields: [
          { key: 'proveedor_categoria', label: 'Categoria de proveedor', type: 'text', required: true },
          { key: 'contacto_principal', label: 'Contacto principal', type: 'text', required: true },
          { key: 'contrato_firmado', label: 'Contrato firmado', type: 'checkbox', required: true },
          { key: 'fecha_limite_pago', label: 'Fecha limite de pago', type: 'date', required: false },
          { key: 'riesgo_operativo_detectado', label: 'Riesgo operativo detectado', type: 'textarea', required: false },
        ],
      },
      {
        title: 'Plan contingencia y post-evento',
        description: 'Protocolos de riesgo, cierre y acciones posteriores.',
        fields: [
          { key: 'plan_b_meteorologia', label: 'Plan B por meteorologia', type: 'textarea', required: false },
          { key: 'canal_comunicacion_crisis', label: 'Canal de comunicacion de crisis', type: 'text', required: true },
          { key: 'encuesta_satisfaccion_cliente', label: 'Encuesta de satisfaccion cliente', type: 'checkbox', required: false },
          { key: 'cierre_administrativo_completado', label: 'Cierre administrativo completado', type: 'checkbox', required: false },
        ],
      },
    ];
    this.previewPersona = 'planner';
    this.previewMode = 'filled';
    this.previewCompletion = 72;
    this.designCompactMode = true;
    this.autoFixDuplicateKeys();
    this.sortSectionsByWeddingFlow();
    this.captureSnapshot('Suite wedding 360');
    this.aiCopilotNote = 'Suite wedding 360 creada con campos reales y estructura operativa.';
    this.triggerCanvasReveal();
    this.onDraftChange();
  }

  injectRealWeddingFields(sectionIndex: number) {
    const section = this.sections[sectionIndex];
    if (!section) return;
    this.pushHistorySnapshot();
    const candidates = this.defaultRowsForBlock(section.title).map((field) => ({
      ...field,
      key: this.slugify(field.key || field.label),
    }));
    const existing = new Set(section.fields.map((field) => field.key.trim().toLowerCase()));
    const toAdd = candidates.filter((field) => !existing.has(field.key.trim().toLowerCase()));
    section.fields.push(...toAdd);
    this.autoFillMissingLabels();
    this.rebalanceRequiredCoverage();
    this.aiCopilotNote = `Bloque "${section.title}" reforzado con ${toAdd.length} campo(s) real(es).`;
    this.onDraftChange();
  }

  upgradeSectionWithAi(sectionIndex: number) {
    const section = this.sections[sectionIndex];
    if (!section) return;
    this.pushHistorySnapshot();
    if (!section.description?.trim()) {
      section.description = 'Bloque premium orientado a ejecucion real con wedding planner y cliente.';
    }
    this.injectRealWeddingFields(sectionIndex);
    section.fields = section.fields.map((field) => ({
      ...field,
      label: this.toProfessionalFieldLabel(field.label, section.title),
      required: field.required ?? !['checkbox', 'textarea'].includes(field.type),
    }));
    this.autoFixDuplicateKeys();
    this.aiCopilotNote = `IA bloque aplicada sobre "${section.title}".`;
    this.onDraftChange();
  }

  dedupeSimilarSections() {
    this.pushHistorySnapshot();
    const seen = new Set<string>();
    this.sections = this.sections.filter((section) => {
      const key = this.slugify(section.title || 'seccion');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    this.onDraftChange();
  }

  rebalanceRequiredCoverage(targetRatio = 0.4) {
    this.pushHistorySnapshot();
    const total = this.totalFields;
    if (!total) return;
    const target = Math.ceil(total * targetRatio);
    let current = this.requiredFields;
    if (current >= target) return;
    for (const section of this.sections) {
      for (const field of section.fields) {
        if (current >= target) break;
        if (field.required) continue;
        if (['checkbox', 'textarea'].includes(field.type)) continue;
        field.required = true;
        current += 1;
      }
      if (current >= target) break;
    }
    this.onDraftChange();
  }

  captureSnapshot(label?: string) {
    const snapshot: EditorSnapshot = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: label?.trim() || `Snapshot ${this.editorSnapshots.length + 1}`,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      payload: {
        draftName: this.draftName,
        draftDescription: this.draftDescription,
        draftType: this.draftType,
        templatePhase: this.templatePhase,
        estimatedMinutes: this.estimatedMinutes,
        tagsInput: this.tagsInput,
        sections: structuredClone(this.sections),
      },
    };
    this.editorSnapshots = [snapshot, ...this.editorSnapshots].slice(0, 12);
    this.selectedSnapshotId = snapshot.id;
    this.statusText = `Snapshot guardado: ${snapshot.label}`;
  }

  restoreLatestSnapshot() {
    if (!this.editorSnapshots.length) return;
    this.selectedSnapshotId = this.editorSnapshots[0].id;
    this.restoreSelectedSnapshot();
  }

  restoreSelectedSnapshot() {
    const selected = this.editorSnapshots.find((item) => item.id === this.selectedSnapshotId);
    if (!selected) return;
    this.pushHistorySnapshot();
    this.draftName = selected.payload.draftName;
    this.draftDescription = selected.payload.draftDescription;
    this.draftType = selected.payload.draftType;
    this.templatePhase = selected.payload.templatePhase;
    this.estimatedMinutes = selected.payload.estimatedMinutes;
    this.tagsInput = selected.payload.tagsInput;
    this.sections = structuredClone(selected.payload.sections);
    this.collapsedSections.clear();
    this.statusText = `Snapshot restaurado: ${selected.label}`;
    this.onDraftChange();
  }

  deleteSelectedSnapshot() {
    if (!this.selectedSnapshotId) return;
    this.editorSnapshots = this.editorSnapshots.filter((item) => item.id !== this.selectedSnapshotId);
    this.selectedSnapshotId = this.editorSnapshots[0]?.id ?? '';
  }

  clearSnapshots() {
    this.editorSnapshots = [];
    this.selectedSnapshotId = '';
  }

  resetToStarterTemplate() {
    if (!window.confirm('Reiniciar editor a un template base limpio?')) return;
    this.pushHistorySnapshot();
    this.resetToStarterTemplateState();
    this.statusText = 'Template reiniciado en modo starter.';
    this.onDraftChange();
  }

  private resetToStarterTemplateState() {
    this.sections = [
      {
        title: 'Base wedding planner',
        description: 'Arranque limpio para construir plantilla premium.',
        fields: [
          { key: 'tarea_principal', label: 'Tarea principal', type: 'text', required: true },
          { key: 'responsable_asignado', label: 'Responsable asignado', type: 'text', required: true },
          { key: 'fecha_objetivo', label: 'Fecha objetivo', type: 'date', required: false },
        ],
      },
    ];
    this.previewMode = 'schema';
    this.previewPersona = 'planner';
    this.previewStage = 'preboda';
    this.previewQuery = '';
    this.previewCompletion = 35;
    this.collapsedSections.clear();
  }

  addSection() {
    this.pushHistorySnapshot();
    this.sections.push({
      title: 'Coordinacion operativa',
      description: 'Seguimiento real de responsables, fechas y validaciones de boda.',
      fields: [
        {
          key: 'responsable_principal_bloque',
          label: 'Responsable principal del bloque',
          type: 'text',
          required: true,
        },
      ],
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

  onSectionDragStart(index: number) {
    this.draggedSectionIndex = index;
  }

  onSectionDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onSectionDrop(event: DragEvent, targetIndex: number) {
    event.preventDefault();
    if (this.draggedSectionIndex === null || this.draggedSectionIndex === targetIndex) return;
    const sourceIndex = this.draggedSectionIndex;
    if (sourceIndex < 0 || sourceIndex >= this.sections.length) return;
    this.pushHistorySnapshot();
    const [moved] = this.sections.splice(sourceIndex, 1);
    const insertAt = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    this.sections.splice(insertAt, 0, moved);
    this.draggedSectionIndex = null;
    this.collapsedSections.clear();
    this.statusText = 'Seccion movida con drag & drop.';
    this.onDraftChange();
  }

  onSectionDragEnd() {
    this.draggedSectionIndex = null;
  }

  removeSection(index: number) {
    this.pushHistorySnapshot();
    this.sections.splice(index, 1);
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  addField(sectionIndex: number) {
    this.pushHistorySnapshot();
    const seed = this.getRealFieldSeed(
      this.sections[sectionIndex]?.title ?? '',
      this.sections[sectionIndex].fields.length,
    );
    this.sections[sectionIndex].fields.push({
      key: seed.key,
      label: seed.label,
      type: seed.type,
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

  onFieldDragStart(sectionIndex: number, fieldIndex: number) {
    this.draggedFieldRef = { sectionIndex, fieldIndex };
  }

  onFieldDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onFieldDrop(event: DragEvent, targetSectionIndex: number, targetFieldIndex: number) {
    event.preventDefault();
    if (!this.draggedFieldRef) return;
    const { sectionIndex, fieldIndex } = this.draggedFieldRef;
    if (sectionIndex !== targetSectionIndex) {
      this.statusText = 'Drag de campos entre secciones: proximo paso.';
      this.draggedFieldRef = null;
      return;
    }
    if (fieldIndex === targetFieldIndex) {
      this.draggedFieldRef = null;
      return;
    }
    const fields = this.sections[targetSectionIndex]?.fields;
    if (!fields) return;
    this.pushHistorySnapshot();
    const [moved] = fields.splice(fieldIndex, 1);
    const insertAt = fieldIndex < targetFieldIndex ? targetFieldIndex - 1 : targetFieldIndex;
    fields.splice(insertAt, 0, moved);
    this.draggedFieldRef = null;
    this.statusText = 'Campo reordenado con drag & drop.';
    this.onDraftChange();
  }

  onFieldDragEnd() {
    this.draggedFieldRef = null;
  }

  removeField(sectionIndex: number, fieldIndex: number) {
    this.pushHistorySnapshot();
    this.sections[sectionIndex].fields.splice(fieldIndex, 1);
    this.onDraftChange();
  }

  addFieldByType(sectionIndex: number, type: string) {
    this.pushHistorySnapshot();
    const byType: Record<string, { key: string; label: string }> = {
      date: { key: 'fecha_confirmacion_hito', label: 'Fecha de confirmacion del hito' },
      currency: { key: 'importe_comprometido_hito', label: 'Importe comprometido del hito' },
      checkbox: { key: 'hito_validado_equipo', label: 'Hito validado por el equipo' },
      select: { key: 'estado_aprobacion_cliente', label: 'Estado de aprobacion del cliente' },
      textarea: { key: 'observaciones_operativas', label: 'Observaciones operativas del planner' },
      text: { key: 'responsable_tarea', label: 'Responsable de la tarea' },
      time: { key: 'hora_programada_hito', label: 'Hora programada del hito' },
      number: { key: 'duracion_estimacion_minutos', label: 'Duracion estimada en minutos' },
    };
    const selected = byType[type] ?? byType['text'];
    this.sections[sectionIndex].fields.push({
      key: `${selected.key}_${this.sections[sectionIndex].fields.length + 1}`,
      label: selected.label,
      type,
      required: false,
    });
    this.onDraftChange();
  }

  addOperationalPack(sectionIndex: number) {
    this.pushHistorySnapshot();
    const suffix = sectionIndex + 1;
    const pack: TemplateField[] = [
      { key: `responsable_asignado_${suffix}`, label: 'Responsable asignado', type: 'text', required: true },
      { key: `fecha_limite_compromiso_${suffix}`, label: 'Fecha limite de compromiso', type: 'date', required: false },
      { key: `prioridad_operativa_${suffix}`, label: 'Prioridad operativa', type: 'select', required: false },
      { key: `estado_avance_${suffix}`, label: 'Estado de avance', type: 'select', required: true },
    ];
    this.sections[sectionIndex].fields.push(...pack);
    this.onDraftChange();
  }

  addDayBSlots(sectionIndex: number) {
    this.pushHistorySnapshot();
    const slots: TemplateField[] = [
      { key: `slot_0800_preparativos_${sectionIndex + 1}`, label: '08:00 Preparativos y maquillaje', type: 'text', required: true },
      { key: `slot_1200_ceremonia_${sectionIndex + 1}`, label: '12:00 Inicio de ceremonia', type: 'text', required: true },
      { key: `slot_1500_cocktail_${sectionIndex + 1}`, label: '15:00 Cocktail y fotos de grupo', type: 'text', required: false },
      { key: `slot_2100_fiesta_${sectionIndex + 1}`, label: '21:00 Apertura de fiesta', type: 'text', required: false },
    ];
    this.sections[sectionIndex].fields.push(...slots);
    this.onDraftChange();
  }

  sortSectionsByWeddingFlow() {
    this.pushHistorySnapshot();
    const flowOrder = [
      'brief',
      'vision',
      'legal',
      'contrato',
      'presupuesto',
      'invitados',
      'proveedor',
      'ceremonia',
      'timeline',
      'dia b',
      'post',
      'cierre',
    ];
    this.sections.sort((a, b) => {
      const aKey = a.title.toLowerCase();
      const bKey = b.title.toLowerCase();
      const aIndex = flowOrder.findIndex((item) => aKey.includes(item));
      const bIndex = flowOrder.findIndex((item) => bKey.includes(item));
      const safeA = aIndex === -1 ? 999 : aIndex;
      const safeB = bIndex === -1 ? 999 : bIndex;
      return safeA - safeB;
    });
    this.onDraftChange();
  }

  isFieldMarkedComplete(sectionIndex: number, fieldIndex: number) {
    const ratio = this.previewCompletion / 100;
    const fingerprint = ((sectionIndex + 1) * (fieldIndex + 3)) % 10;
    return fingerprint / 10 < ratio;
  }

  sampleDateValue(sectionIndex: number, fieldIndex: number) {
    const baseMonth = this.previewStage === 'preboda' ? '06' : this.previewStage === 'dia_b' ? '09' : '10';
    const day = String(8 + ((sectionIndex + fieldIndex) % 18)).padStart(2, '0');
    return `2026-${baseMonth}-${day}`;
  }

  sampleTimeValue(sectionIndex: number, fieldIndex: number) {
    const start = this.previewStage === 'dia_b' ? 7 : this.previewStage === 'post' ? 10 : 9;
    const hour = String(start + ((sectionIndex + fieldIndex) % 10)).padStart(2, '0');
    const minute = (sectionIndex + fieldIndex) % 2 === 0 ? '00' : '30';
    return `${hour}:${minute}`;
  }

  sampleNumberValue(sectionIndex: number, fieldIndex: number) {
    return (sectionIndex + 1) * (fieldIndex + 1);
  }

  sampleCurrencyValue(sectionIndex: number, fieldIndex: number) {
    const stageFactor = this.previewStage === 'dia_b' ? 1.25 : this.previewStage === 'post' ? 0.65 : 1;
    const value = Math.round((450 + (sectionIndex + 1) * 180 + fieldIndex * 65) * stageFactor);
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
        const base = this.slugify(field.key || field.label || `campo_operativo_${index + 1}`);
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
      this.sections = [this.makeSection('Coordinacion principal', ['Responsable principal del evento'])];
    }
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  autoCompleteRequiredFields() {
    this.pushHistorySnapshot();
    this.sections = this.sections.map((section) => {
      const hasRequired = section.fields.some((field) => field.required);
      if (hasRequired) return section;
      return {
        ...section,
        fields: [
          ...section.fields,
          {
            key: `${this.slugify(section.title)}_aprobacion`,
            label: 'Aprobacion final',
            type: 'checkbox',
            required: true,
          },
        ],
      };
    });
    this.onDraftChange();
  }

  applyWeddingProfessionalCopy() {
    this.pushHistorySnapshot();
    this.sections = this.sections.map((section, sectionIndex) => {
      const normalizedTitle = section.title.trim() || `Bloque ${sectionIndex + 1}`;
      const title = normalizedTitle
        .replace('Base editable', 'Base wedding premium')
        .replace('Checklist', 'Checklist operativo')
        .replace('Venue', 'Espacio')
        .replace('Dia B', 'Dia B operativo');
      return {
        ...section,
        title,
        description:
          section.description?.trim() ||
          'Bloque profesional para coordinar decisiones, responsables y entregables del evento.',
        fields: section.fields.map((field, fieldIndex) => {
          const key = this.slugify(field.key || field.label || `${title}_${fieldIndex + 1}`);
          const label = (field.label || key.replace(/_/g, ' '))
            .replace('Responsable', 'Responsable asignado')
            .replace('Estado', 'Estado de avance')
            .replace('Pago', 'Estado de pago')
            .replace('Notas', 'Observaciones profesionales');
          return {
            ...field,
            key,
            label,
            required: field.required ?? !['checkbox', 'textarea'].includes(field.type),
          };
        }),
      };
    });
    this.triggerCanvasReveal();
    this.onDraftChange();
  }

  addFinancialControlPack() {
    this.pushHistorySnapshot();
    this.sections.push(
      this.makeSection('Control financiero premium', [
        'Partida presupuestaria',
        'Importe previsto',
        'Importe comprometido',
        'Importe real',
        'Estado de pago',
      ]),
    );
    const lastIndex = this.sections.length - 1;
    this.sections[lastIndex].fields = [
      { key: 'partida_presupuestaria', label: 'Partida presupuestaria', type: 'text', required: true },
      { key: 'importe_previsto', label: 'Importe previsto', type: 'currency', required: true },
      { key: 'importe_comprometido', label: 'Importe comprometido', type: 'currency', required: false },
      { key: 'importe_real', label: 'Importe real', type: 'currency', required: false },
      { key: 'estado_pago', label: 'Estado de pago', type: 'select', required: true },
    ];
    this.previewStage = 'preboda';
    this.onDraftChange();
  }

  addGuestRsvpPack() {
    this.pushHistorySnapshot();
    this.sections.push({
      title: 'RSVP y seating premium',
      description: 'Control de asistencia, mesas y necesidades especiales.',
      fields: [
        { key: 'nombre_invitado', label: 'Nombre invitado', type: 'text', required: true },
        { key: 'confirmacion_asistencia', label: 'Confirmacion asistencia', type: 'select', required: true },
        { key: 'mesa_asignada', label: 'Mesa asignada', type: 'text', required: false },
        { key: 'menu_asignado', label: 'Menu asignado', type: 'select', required: false },
        { key: 'alergias_restricciones', label: 'Alergias o restricciones', type: 'textarea', required: false },
      ],
    });
    this.previewPersona = 'client';
    this.previewMode = 'filled';
    this.onDraftChange();
  }

  generateClientChecklist() {
    this.pushHistorySnapshot();
    const clientSections = [
      this.makeSection('Decision estilo y narrativa', ['Moodboard aprobado', 'Paleta confirmada', 'Guion emocional validado']),
      this.makeSection('Invitados y experiencia', ['RSVP completado', 'Mesas revisadas', 'Menus especiales confirmados']),
      this.makeSection('Semana final premium', ['Timeline revisado', 'Pagos clave cerrados', 'Brief final compartido']),
      this.makeSection('Post boda cliente', ['Encuesta de satisfaccion', 'Entrega de recuerdos', 'Cierre administrativo']),
    ];
    this.sections.push(...clientSections);
    this.previewPersona = 'client';
    this.previewMode = 'filled';
    this.previewStage = 'post';
    this.triggerCanvasReveal();
    this.collapsedSections.clear();
    this.onDraftChange();
  }

  runAiTemplateAudit() {
    const issues = this.validationIssues;
    const missing = this.missingCoreBlocks;
    if (!issues.length && !missing.length) {
      this.aiCopilotNote = 'IA: estructura solida. Lista para uso premium.';
      return;
    }
    const resume = [
      issues.length ? `${issues.length} incidencias` : 'sin incidencias',
      missing.length ? `faltan ${missing.join(', ')}` : 'bloques core completos',
      `score ${this.completenessScore}/100`,
    ];
    this.aiCopilotNote = `IA: ${resume.join(' · ')}.`;
  }

  runAiAutoStructure() {
    this.pushHistorySnapshot();
    const map: Record<string, string> = {
      timeline: 'Ceremonia',
      presupuesto: 'Presupuesto',
      invitados: 'Invitados y seating',
      proveedor: 'Proveedores',
    };
    this.missingCoreBlocks.forEach((missing) => {
      const block = map[missing] ?? 'Coordinacion operativa';
      this.addWeddingBlock(block);
    });
    this.sortSectionsByWeddingFlow();
    this.autoCompleteRequiredFields();
    this.aiCopilotNote = 'IA: estructura reforzada con bloques core y campos requeridos.';
  }

  runAiPremiumCopy() {
    this.applyWeddingProfessionalCopy();
    this.normalizeFieldKeys();
    this.aiCopilotNote = 'IA: copy premium aplicado en titulos, descripciones y labels.';
  }

  runAiClientSimulation() {
    this.previewPersona = 'client';
    this.previewMode = 'filled';
    this.previewStage = 'dia_b';
    this.previewCompletion = 70;
    this.triggerCanvasReveal();
    this.aiCopilotNote = 'IA: simulacion cliente activada con vista rellenada.';
  }

  runAiFullAssist() {
    this.runAiAutoStructure();
    this.autoFixDuplicateKeys();
    this.autoFillMissingLabels();
    this.runAiPremiumCopy();
    if (!this.enableGuestCare) this.enableGuestCare = true;
    if (!this.enableBudgetAlerts) this.enableBudgetAlerts = true;
    this.previewCompletion = Math.max(this.previewCompletion, 70);
    this.triggerCanvasReveal();
    this.aiCopilotNote = 'IA: Full Assist aplicado (estructura, keys, labels y copy premium).';
    this.onDraftChange();
  }

  runAiBusinessPlan() {
    this.sortSectionsByWeddingFlow();
    this.autoCompleteRequiredFields();
    this.addGuestRsvpPack();
    this.addFinancialControlPack();
    this.previewCompletion = Math.max(this.previewCompletion, 75);
    this.aiCopilotNote = 'IA: plan operativo generado con foco en ejecucion, invitados y finanzas.';
    this.onDraftChange();
  }

  runAiRiskShield() {
    if (!this.enableVendorOps) this.enableVendorOps = true;
    if (!this.enableBudgetAlerts) this.enableBudgetAlerts = true;
    this.addWeddingBlock('Plan contingencia');
    this.addFinancialControlPack();
    this.previewStage = 'dia_b';
    this.previewCompletion = Math.max(this.previewCompletion, 65);
    this.aiCopilotNote = 'IA: Risk Shield activado con contingencias, control de pagos y proveedores.';
    this.onDraftChange();
  }

  runAiAdminOpsBoost() {
    this.previewPersona = 'planner';
    this.enableVendorOps = true;
    this.enableBudgetAlerts = true;
    this.runAiBusinessPlan();
    this.runAiRiskShield();
    this.rebalanceRequiredCoverage(0.5);
    this.aiCopilotNote = 'IA Admin Ops: foco en ejecucion, riesgos, proveedores y control financiero.';
    this.onDraftChange();
  }

  runAiClientExperienceBoost() {
    this.previewPersona = 'client';
    this.enableGuestCare = true;
    this.generateClientChecklist();
    this.applyVisualStylePreset('botanical');
    this.previewMode = 'filled';
    this.previewCompletion = Math.max(this.previewCompletion, 65);
    this.autoFillMissingLabels();
    this.aiCopilotNote = 'IA Cliente UX: checklist claro, visual amable y experiencia de completado simplificada.';
    this.triggerCanvasReveal();
    this.onDraftChange();
  }

  runAiDualModeOptimization() {
    this.runAiAutopilot();
    this.runAiClientExperienceBoost();
    this.applyVisualStylePreset('luxe');
    this.previewPersona = 'planner';
    this.aiCopilotNote = 'IA Dual Mode: plantilla balanceada para admin/planner y cliente final.';
    this.onDraftChange();
  }

  runAiWeddingLuxuryNarrativePack() {
    this.pushHistorySnapshot();
    if (!this.sections.some((s) => s.title.toLowerCase().includes('vision'))) {
      this.sections.unshift(
        this.makeSection('Vision creativa de la boda', [
          'Concepto estético rector',
          'Paleta y atmosfera emocional',
          'Experiencia deseada de invitados',
        ]),
      );
    }
    this.sections = this.sections.map((section) => ({
      ...section,
      description:
        section.description?.trim() ||
        `Bloque premium orientado a ejecucion wedding con foco en detalle, coordinacion y experiencia del cliente.`,
      fields: section.fields.map((field) => ({
        ...field,
        label: this.toProfessionalFieldLabel(field.label || field.key, section.title),
      })),
    }));
    this.applyVisualStylePreset('luxe');
    this.applyPdfExportPreset('luxury');
    this.aiCopilotNote = 'IA Wedding Luxury: narrativa premium, copy profesional y estilo visual/export luxury.';
    this.onDraftChange();
  }

  runAiVendorContractPack() {
    this.pushHistorySnapshot();
    const title = 'Vendor SLA y contratos premium';
    const exists = this.sections.find((s) => s.title.toLowerCase().includes('vendor sla'));
    if (!exists) {
      this.sections.push({
        title,
        description: 'Seguimiento contractual, SLA, pagos y riesgos por proveedor clave.',
        fields: [
          { key: 'proveedor_categoria', label: 'Categoria de proveedor', type: 'text', required: true },
          { key: 'sla_hora_llegada', label: 'SLA hora de llegada', type: 'time', required: true },
          { key: 'penalizacion_incumplimiento', label: 'Penalizacion por incumplimiento', type: 'textarea', required: false },
          { key: 'responsable_backoffice', label: 'Responsable backoffice', type: 'text', required: true },
          { key: 'estado_documentacion', label: 'Estado de documentacion', type: 'select', required: true },
        ],
      });
    }
    this.enableVendorOps = true;
    this.autoFixDuplicateKeys();
    this.aiCopilotNote = 'IA Vendor Pack: bloque SLA/contratos añadido y reforzado para operativa premium.';
    this.onDraftChange();
  }

  runAiCeremonyFlowPack() {
    this.pushHistorySnapshot();
    this.sections.push({
      title: 'Guion ceremonial y cues tecnicos',
      description: 'Secuencia ceremonial con cues de musica, entradas, microfonia y fotografos.',
      fields: [
        { key: 'cue_musica_entrada', label: 'Cue musica entrada', type: 'text', required: true },
        { key: 'cue_oficiante_inicio', label: 'Cue oficiante inicio', type: 'time', required: true },
        { key: 'cue_lecturas', label: 'Lecturas y orden', type: 'textarea', required: false },
        { key: 'cue_foto_video_prioridades', label: 'Prioridades foto y video', type: 'textarea', required: false },
        { key: 'check_microfonia', label: 'Check microfonia', type: 'checkbox', required: true },
      ],
    });
    this.previewStage = 'dia_b';
    this.autoFixDuplicateKeys();
    this.sortSectionsByWeddingFlow();
    this.aiCopilotNote = 'IA Ceremony Pack: guion ceremonial profesional con cues tecnicos listo.';
    this.onDraftChange();
  }

  applyPdfExportPreset(preset: PdfExportPreset) {
    this.pdfExportPreset = preset;
    if (preset === 'minimal') {
      this.pdfLayoutMode = 'list';
      this.pdfDensity = 'compact';
      this.pdfShowToc = true;
      this.pdfShowWatermark = false;
      this.pdfShowDesignSheet = false;
      this.pdfShowGeneratedStamp = true;
      this.pdfFooterText = 'Template operativo listo para revision interna';
      if (this.visualStylePreset !== 'modern') this.applyVisualStylePreset('modern');
    } else if (preset === 'luxury') {
      this.pdfLayoutMode = 'cards';
      this.pdfDensity = 'comfortable';
      this.pdfShowToc = true;
      this.pdfShowWatermark = true;
      this.pdfShowDesignSheet = true;
      this.pdfShowGeneratedStamp = true;
      this.pdfWatermarkText = 'Wedding Signature';
      this.pdfFooterText = 'Dossier premium para wedding planner y cliente final';
    } else {
      this.pdfLayoutMode = 'cards';
      this.pdfDensity = 'comfortable';
      this.pdfShowToc = true;
      this.pdfShowWatermark = true;
      this.pdfShowDesignSheet = true;
      this.pdfShowGeneratedStamp = true;
      this.pdfWatermarkText = 'I Do Manager';
      this.pdfFooterText = 'Documento premium generado para wedding planner y cliente';
    }
    this.onDraftChange();
  }

  toggleCanvasFreeMode() {
    this.canvasFreeMode = !this.canvasFreeMode;
    if (this.canvasFreeMode && !Object.keys(this.canvasSectionPositions).length) {
      this.autoArrangeCanvasLayout();
      return;
    }
    this.onDraftChange();
  }

  setCanvasZoom(value: number) {
    this.canvasZoom = Math.max(60, Math.min(170, Math.round(Number(value) || 100)));
    this.onDraftChange();
  }

  adjustCanvasZoom(delta: number) {
    this.setCanvasZoom(this.canvasZoom + delta);
  }

  quickAddToPreviewCanvas(kind: 'text' | 'shape' | 'image' | 'label' | 'card' | 'button' | 'badge') {
    if (!this.canvasFreeMode) {
      this.canvasFreeMode = true;
    }
    if (kind === 'text' || kind === 'shape' || kind === 'image' || kind === 'label') {
      this.addFreeLayoutElement(kind);
      this.statusText = `Capa ${kind} añadida al canvas`;
      return;
    }
    this.addFreeLayoutPresetElement(kind);
    this.statusText = `Componente ${kind} añadido al canvas`;
  }

  quickAddPresetToPreviewCanvas(kind: 'card' | 'button' | 'badge' | 'divider' | 'textBlock' | 'note' | 'metric') {
    if (!this.canvasFreeMode) this.canvasFreeMode = true;
    this.addFreeLayoutPresetElement(kind);
    this.statusText = `Bloque ${kind} añadido al canvas`;
  }

  quickAddKitToPreviewCanvas(kind: 'hero' | 'stats' | 'cta' | 'signature') {
    if (!this.canvasFreeMode) this.canvasFreeMode = true;
    this.addFreeLayoutKit(kind);
    this.statusText = `Kit ${kind} añadido al canvas`;
  }

  applyQuickSelectedPalette(palette: 'teal' | 'rose' | 'gold' | 'ink') {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    const map = {
      teal: { color: '#0f766e', background: '#ecfdf5', borderColor: '#99f6e4' },
      rose: { color: '#9f1239', background: '#fff1f2', borderColor: '#fecdd3' },
      gold: { color: '#92400e', background: '#fffbeb', borderColor: '#fcd34d' },
      ink: { color: '#f8fafc', background: '#0f172a', borderColor: '#334155' },
    } as const;
    this.updateSelectedFreeLayoutElement({ ...map[palette] });
    this.statusText = `Paleta ${palette} aplicada a la capa`;
  }

  applyQuickThemePalette(palette: 'editorial' | 'botanical' | 'sunset' | 'midnight') {
    if (palette === 'editorial') {
      this.designPrimaryColor = '#0f766e';
      this.designAccentColor = '#7c3aed';
      this.visualTextColor = '#0f172a';
      this.visualMutedTextColor = '#475569';
    }
    if (palette === 'botanical') {
      this.designPrimaryColor = '#166534';
      this.designAccentColor = '#65a30d';
      this.visualTextColor = '#14532d';
      this.visualMutedTextColor = '#3f6212';
    }
    if (palette === 'sunset') {
      this.designPrimaryColor = '#c2410c';
      this.designAccentColor = '#db2777';
      this.visualTextColor = '#431407';
      this.visualMutedTextColor = '#7c2d12';
    }
    if (palette === 'midnight') {
      this.designPrimaryColor = '#0ea5e9';
      this.designAccentColor = '#8b5cf6';
      this.visualTextColor = '#e2e8f0';
      this.visualMutedTextColor = '#cbd5e1';
      this.visualSurfaceBackground = 'linear-gradient(180deg, rgba(15,23,42,.92), rgba(30,41,59,.94))';
      this.visualCardBackground = 'rgba(30,41,59,.82)';
      this.visualCardBorderColor = 'rgba(148,163,184,.28)';
    }
    this.statusText = `Paleta global ${palette} aplicada`;
    this.onDraftChange();
  }

  applyQuickSelectedEffect(effect: '' | 'glass' | 'glow' | 'elevated' | 'muted') {
    if (!effect) return;
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    if (effect === 'glass') {
      this.updateSelectedFreeLayoutElement({
        background: 'rgba(255,255,255,.22)',
        borderColor: 'rgba(255,255,255,.45)',
        shadow: '0 12px 30px rgba(15,23,42,.16)',
        backdropBlur: 10,
        blendMode: 'normal',
      });
    }
    if (effect === 'glow') {
      this.updateSelectedFreeLayoutElement({
        shadow: `0 0 0 1px ${this.designAccentColor}33, 0 0 26px ${this.designAccentColor}66`,
        borderColor: this.designAccentColor,
        backdropBlur: 0,
      });
    }
    if (effect === 'elevated') {
      this.updateSelectedFreeLayoutElement({
        background: active.background || 'rgba(255,255,255,.96)',
        borderColor: active.borderColor || 'rgba(203,213,225,.52)',
        shadow: '0 18px 34px rgba(15,23,42,.14)',
        blendMode: 'normal',
      });
    }
    if (effect === 'muted') {
      this.updateSelectedFreeLayoutElement({
        opacity: 0.78,
        shadow: 'none',
        backdropBlur: 0,
        blendMode: 'multiply',
      });
    }
    this.statusText = `Efecto ${effect} aplicado`;
  }

  autoArrangeCanvasLayout() {
    const positions: Record<string, CanvasSectionPosition> = {};
    const cols = 2;
    const cardW = 340;
    const cardH = 210;
    const gap = 20;
    this.filteredPreviewSections.forEach((section, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      positions[this.canvasSectionLayoutKey(section, index)] = {
        x: col * (cardW + gap),
        y: row * (cardH + gap),
      };
    });
    this.canvasSectionPositions = { ...this.canvasSectionPositions, ...positions };
    this.canvasFreeMode = true;
    this.statusText = 'Auto layout aplicado en canvas.';
    this.onDraftChange();
  }

  resetCanvasLayout() {
    this.canvasSectionPositions = {};
    this.canvasFreeMode = false;
    this.statusText = 'Layout visual reiniciado.';
    this.onDraftChange();
  }

  onCanvasSectionMouseDown(event: MouseEvent, section: TemplateSection, sectionIndex: number) {
    if (!this.canvasFreeMode) return;
    const target = event.target as HTMLElement;
    const interactive = target.closest('input,textarea,select,button,a,label');
    if (interactive) return;
    event.preventDefault();
    const key = this.canvasSectionLayoutKey(section, sectionIndex);
    const pos = this.canvasPositionFor(section, sectionIndex);
    this.canvasDragState = {
      key,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: pos.x,
      startY: pos.y,
    };
  }

  addFreeLayoutElement(type: FreeLayoutElementType) {
    const baseY = 24 + this.freeLayoutElements.length * 22;
    const id = `fle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const presets: Record<FreeLayoutElementType, Partial<FreeLayoutElement>> = {
      text: {
        text: 'Texto premium wedding',
        width: 280,
        height: 56,
        fontFamily: "'Playfair Display', 'Georgia', serif",
        fontSize: 26,
        fontWeight: 700,
        color: '#0f172a',
        background: 'transparent',
        borderColor: 'transparent',
      },
      label: {
        text: 'CHECKLIST PREMIUM',
        width: 220,
        height: 36,
        fontFamily: "'Montserrat', 'Segoe UI', sans-serif",
        fontSize: 12,
        fontWeight: 800,
        color: '#0f766e',
        background: 'rgba(240,253,250,.9)',
        borderColor: 'rgba(15,118,110,.2)',
      },
      shape: {
        width: 320,
        height: 140,
        background: 'rgba(248,250,252,.95)',
        borderColor: 'rgba(203,213,225,.6)',
      },
      image: {
        imageUrl:
          this.freeLayoutQuickImageUrl.trim() ||
          'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1200&q=70',
        width: 260,
        height: 180,
        borderColor: 'rgba(255,255,255,.7)',
      },
    };
    const element: FreeLayoutElement = {
      id,
      type,
      x: 30,
      y: baseY,
      width: 240,
      height: 80,
      rotation: 0,
      zIndex: this.freeLayoutElements.length + 3,
      opacity: 1,
      borderRadius: 12,
      shadow: '0 10px 24px rgba(15,23,42,.08)',
      visible: true,
      shapeKind: type === 'shape' ? 'rect' : undefined,
      ...presets[type],
    };
    this.freeLayoutElements = [...this.freeLayoutElements, element];
    this.selectedFreeLayoutElementId = id;
    this.canvasFreeMode = true;
    this.canvasBlankPaperMode = true;
    this.statusText = `Capa ${type} añadida`;
    this.onDraftChange();
  }

  addFreeLayoutPresetElement(kind: 'card' | 'button' | 'badge' | 'divider' | 'textBlock' | 'note' | 'metric') {
    if (kind === 'card') {
      this.addFreeLayoutElement('shape');
      this.updateSelectedFreeLayoutElement({
        width: 320,
        height: 160,
        background: 'linear-gradient(165deg, rgba(255,255,255,.96), rgba(248,250,252,.92))',
        borderColor: 'rgba(203,213,225,.55)',
        borderRadius: 18,
        shadow: '0 16px 32px rgba(15,23,42,.08)',
      });
      return;
    }
    if (kind === 'button') {
      this.addFreeLayoutElement('label');
      this.updateSelectedFreeLayoutElement({
        text: 'Aprobar propuesta',
        width: 220,
        height: 44,
        textAlign: 'center',
        color: '#ffffff',
        background: `linear-gradient(135deg, ${this.designPrimaryColor}, ${this.designAccentColor})`,
        borderColor: 'transparent',
        borderRadius: 14,
        fontSize: 14,
        fontWeight: 700,
        shadow: '0 14px 28px rgba(15,23,42,.14)',
      });
      return;
    }
    if (kind === 'badge') {
      this.addFreeLayoutElement('label');
      this.updateSelectedFreeLayoutElement({
        text: 'Premium',
        width: 132,
        height: 34,
        textAlign: 'center',
        color: this.designPrimaryColor,
        background: `${this.designPrimaryColor}14`,
        borderColor: `${this.designPrimaryColor}55`,
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.9,
      });
      return;
    }
    if (kind === 'divider') {
      this.addFreeLayoutElement('shape');
      this.updateSelectedFreeLayoutElement({
        width: 420,
        height: 3,
        shapeKind: 'line',
        background: this.designAccentColor,
        borderColor: 'transparent',
        borderRadius: 2,
        shadow: 'none',
      });
      return;
    }
    if (kind === 'textBlock') {
      this.addFreeLayoutElement('text');
      this.updateSelectedFreeLayoutElement({
        text: 'Escribe aqui el texto del bloque visual. Doble click para editar directamente en el canvas.',
        width: 420,
        height: 120,
        fontFamily: "'Poppins', 'Segoe UI', sans-serif",
        fontSize: 15,
        fontWeight: 500,
        lineHeight: 1.45,
        color: '#334155',
        background: 'rgba(255,255,255,.66)',
        borderColor: 'rgba(203,213,225,.35)',
        borderRadius: 14,
      });
      return;
    }
    if (kind === 'note') {
      this.addFreeLayoutElement('shape');
      this.updateSelectedFreeLayoutElement({
        width: 300,
        height: 120,
        background: 'linear-gradient(165deg, rgba(255,251,235,.98), rgba(255,247,237,.94))',
        borderColor: 'rgba(245,158,11,.25)',
        borderRadius: 16,
      });
      this.addFreeLayoutElement('text');
      this.updateSelectedFreeLayoutElement({
        x: 48,
        y: 48,
        width: 260,
        height: 72,
        text: 'Nota visual para cliente o planner',
        fontSize: 14,
        color: '#92400e',
        background: 'transparent',
        borderColor: 'transparent',
        shadow: 'none',
      });
      return;
    }
    this.addFreeLayoutElement('shape');
    this.updateSelectedFreeLayoutElement({
      width: 170,
      height: 94,
      background: 'rgba(255,255,255,.95)',
      borderColor: 'rgba(203,213,225,.5)',
      borderRadius: 16,
    });
    this.addFreeLayoutElement('label');
    this.updateSelectedFreeLayoutElement({
      text: 'KPI',
      x: 42,
      y: 42,
      width: 60,
      height: 22,
      background: 'transparent',
      borderColor: 'transparent',
      color: this.designAccentColor,
      fontSize: 11,
      fontWeight: 800,
      letterSpacing: 1,
    });
    this.addFreeLayoutElement('text');
    this.updateSelectedFreeLayoutElement({
      text: '94/100',
      x: 42,
      y: 64,
      width: 120,
      height: 32,
      background: 'transparent',
      borderColor: 'transparent',
      shadow: 'none',
      fontFamily: "'Playfair Display', 'Georgia', serif",
      fontSize: 24,
      fontWeight: 700,
      color: '#0f172a',
    });
  }

  addFreeImageFromQuickUrl() {
    if (!this.freeLayoutQuickImageUrl.trim()) {
      this.statusText = 'Escribe una URL de imagen para insertar.';
      return;
    }
    this.addFreeLayoutElement('image');
  }

  clearFreeLayoutElements() {
    this.freeLayoutElements = [];
    this.selectedFreeLayoutElementId = '';
    this.onDraftChange();
  }

  applyFreeCanvasPaperPreset(preset: 'a4p' | 'a4l' | 'square' | 'tall' | 'custom') {
    this.freeCanvasPaperPreset = preset;
    const map = {
      a4p: { w: 720, h: 1020 },
      a4l: { w: 1020, h: 720 },
      square: { w: 820, h: 820 },
      tall: { w: 760, h: 1240 },
    } as const;
    if (preset !== 'custom') {
      this.freeCanvasPaperWidth = map[preset].w;
      this.freeCanvasPaperHeight = map[preset].h;
    }
    this.statusText = `Hoja ${preset} aplicada`;
    this.onDraftChange();
  }

  onFreeCanvasPaperSizeChange() {
    this.freeCanvasPaperPreset = 'custom';
    this.freeCanvasPaperWidth = Math.max(360, this.minNumber(this.freeCanvasPaperWidth, 360));
    this.freeCanvasPaperHeight = Math.max(360, this.minNumber(this.freeCanvasPaperHeight, 360));
    this.onDraftChange();
  }

  selectFreeLayoutElement(id: string) {
    this.selectedFreeLayoutElementId = id;
  }

  onFreeLayoutElementMouseDown(event: MouseEvent, element: FreeLayoutElement) {
    if (element.locked) {
      this.selectedFreeLayoutElementId = element.id;
      this.statusText = 'Capa bloqueada. Desbloquea para mover.';
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest('input,textarea,select,button,a')) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectedFreeLayoutElementId = element.id;
    this.freeElementDragState = {
      id: element.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: element.x,
      startY: element.y,
    };
  }

  onFreeLayoutResizeHandleMouseDown(event: MouseEvent, element: FreeLayoutElement, handle: FreeResizeHandle) {
    if (element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectedFreeLayoutElementId = element.id;
    this.freeElementResizeState = {
      id: element.id,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: element.x,
      startY: element.y,
      startWidth: element.width,
      startHeight: element.height,
      aspectRatio: Math.max(0.01, (element.width || 1) / Math.max(1, element.height || 1)),
    };
  }

  onFreeLayoutRotateHandleMouseDown(event: MouseEvent, element: FreeLayoutElement) {
    if (element.locked) return;
    event.preventDefault();
    event.stopPropagation();
    this.selectedFreeLayoutElementId = element.id;
    const host = (event.currentTarget as HTMLElement).closest('.free-layout-el') as HTMLElement | null;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const centerClientX = rect.left + rect.width / 2;
    const centerClientY = rect.top + rect.height / 2;
    const startPointerAngle = (Math.atan2(event.clientY - centerClientY, event.clientX - centerClientX) * 180) / Math.PI;
    this.freeElementRotateState = {
      id: element.id,
      centerClientX,
      centerClientY,
      startPointerAngle,
      startRotation: element.rotation || 0,
    };
  }

  onFreeLayoutTextInput(event: Event, element: FreeLayoutElement) {
    const target = event.target as HTMLElement;
    const text = (target.innerText || '').replace(/\r/g, '');
    this.selectedFreeLayoutElementId = element.id;
    this.freeLayoutElements = this.freeLayoutElements.map((item) => (item.id === element.id ? { ...item, text } : item));
  }

  onFreeLayoutTextBlur() {
    this.statusText = 'Texto de capa actualizado';
    this.onDraftChange();
  }

  updateSelectedFreeLayoutElement(changes: Partial<FreeLayoutElement>) {
    if (!this.selectedFreeLayoutElementId) return;
    this.freeLayoutElements = this.freeLayoutElements.map((item) =>
      item.id === this.selectedFreeLayoutElementId ? { ...item, ...changes } : item,
    );
    this.onDraftChange();
  }

  copySelectedFreeLayoutStyle() {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    const {
      fontFamily,
      fontSize,
      fontWeight,
      textAlign,
      letterSpacing,
      lineHeight,
      color,
      background,
      borderColor,
      borderRadius,
      shadow,
      shapeKind,
      imageFit,
      opacity,
    } = active;
    this.freeLayoutStyleClipboard = {
      fontFamily,
      fontSize,
      fontWeight,
      textAlign,
      letterSpacing,
      lineHeight,
      color,
      background,
      borderColor,
      borderRadius,
      shadow,
      shapeKind,
      imageFit,
      opacity,
    };
    this.statusText = 'Estilo de capa copiado';
  }

  pasteStyleToSelectedFreeLayoutElement() {
    if (!this.freeLayoutStyleClipboard) {
      this.statusText = 'No hay estilo copiado';
      return;
    }
    if (!this.selectedFreeLayoutElement) return;
    this.updateSelectedFreeLayoutElement({ ...this.freeLayoutStyleClipboard });
    this.statusText = 'Estilo pegado en la capa';
  }

  duplicateSelectedFreeLayoutSeries(direction: 'row' | 'column') {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    const count = 3;
    const stepX = direction === 'row' ? Math.max(24, active.width + 16) : 0;
    const stepY = direction === 'column' ? Math.max(24, active.height + 14) : 0;
    const clones: FreeLayoutElement[] = Array.from({ length: count }, (_, idx) => ({
      ...structuredClone(active),
      id: `fle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${idx}`,
      x: active.x + stepX * (idx + 1),
      y: active.y + stepY * (idx + 1),
      zIndex: (active.zIndex || 1) + idx + 1,
    }));
    this.freeLayoutElements = [...this.freeLayoutElements, ...clones];
    this.selectedFreeLayoutElementId = clones[clones.length - 1]?.id ?? this.selectedFreeLayoutElementId;
    this.statusText = `Serie ${direction === 'row' ? 'fila' : 'columna'} creada`;
    this.onDraftChange();
  }

  fitSelectedFreeLayoutTextBox() {
    const active = this.selectedFreeLayoutElement;
    if (!active || active.type === 'image' || active.type === 'shape') return;
    const text = (active.text || '').trim();
    const fontSize = active.fontSize ?? 16;
    const lineHeight = active.lineHeight ?? 1.2;
    const charsPerLine = Math.max(12, Math.floor((active.width || 240) / Math.max(6, fontSize * 0.58)));
    const lines = Math.max(
      1,
      text
        ? text.split('\n').reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / charsPerLine)), 0)
        : 1,
    );
    const nextHeight = Math.max(28, Math.ceil(lines * fontSize * lineHeight + 18));
    this.updateSelectedFreeLayoutElement({ height: nextHeight });
    this.statusText = 'Caja de texto autoajustada';
  }

  runAiSelectedLayerTextBoost() {
    const active = this.selectedFreeLayoutElement;
    if (!active || active.type === 'shape' || active.type === 'image') {
      this.statusText = 'Selecciona una capa de texto o label para IA texto capa.';
      return;
    }
    const baseText = (active.text || '').trim() || 'Bloque premium';
    const context = `${this.draftName} ${this.draftDescription} ${(this.sections[0]?.title || '')}`.toLowerCase();
    let text = baseText;
    if (active.type === 'label') {
      if (/presupuesto|budget/.test(context)) text = 'CONTROL FINANCIERO';
      else if (/invitad|guest|rsvp/.test(context)) text = 'EXPERIENCIA INVITADOS';
      else if (/proveedor|vendor/.test(context)) text = 'VENDOR OPS';
      else text = 'WEDDING PLANNER PREMIUM';
      this.updateSelectedFreeLayoutElement({ text, letterSpacing: 1.2, fontWeight: 800 });
    } else {
      if (/lujo|premium|editorial/.test((this.quickAiPrompt + ' ' + this.draftDescription).toLowerCase())) {
        text = `Dossier premium para ${this.draftName || 'wedding planner'} con estructura visual editable, foco en experiencia y control operativo.`;
      } else if (/cliente|pareja/.test(context)) {
        text = 'Documento visual para revisar decisiones clave, avances y siguientes pasos con la pareja de forma clara.';
      } else {
        text = 'Bloque visual editable para notas, aprobaciones, decisiones y seguimiento operativo del evento.';
      }
      this.updateSelectedFreeLayoutElement({ text });
      this.fitSelectedFreeLayoutTextBox();
    }
    this.aiCopilotNote = 'IA Texto Capa: copy aplicado segun contexto del template.';
    this.onDraftChange();
  }

  runAiFreeLayoutAutoComplete() {
    if (!this.freeLayoutElements.length) {
      this.generateAiPremiumFreeLayout();
      return;
    }
    const activeTextLayers = this.freeLayoutElements.filter((el) => el.type !== 'shape' && el.type !== 'image');
    if (!activeTextLayers.length) {
      this.addFreeLayoutPresetElement('textBlock');
      this.addFreeLayoutPresetElement('button');
    }
    if (!this.freeLayoutElements.some((el) => el.type === 'shape' && (el.height ?? 0) > 80)) {
      this.addFreeLayoutPresetElement('card');
    }
    if (!this.freeLayoutElements.some((el) => el.type === 'shape' && el.shapeKind === 'line')) {
      this.addFreeLayoutPresetElement('divider');
    }
    const titleLayer = this.freeLayoutElements.find((el) => el.type === 'text' && (el.fontSize ?? 0) >= 24);
    if (titleLayer) {
      this.selectedFreeLayoutElementId = titleLayer.id;
      this.runAiSelectedLayerTextBoost();
    }
    this.runAiVisualPolishPass();
    this.aiCopilotNote = 'IA Canvas Autocomplete: añadidos componentes visuales, copy y polish para seguir diseñando.';
    this.onDraftChange();
  }

  nudgeSelectedFreeLayoutElement(dx: number, dy: number) {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    this.updateSelectedFreeLayoutElement({ x: active.x + dx, y: active.y + dy });
  }

  nudgeSelectedFreeLayoutElementByStep(direction: 'left' | 'right' | 'up' | 'down', mode: 'fine' | 'normal' | 'grid') {
    const step =
      mode === 'fine'
        ? this.freeLayerFineNudgeStep
        : mode === 'grid'
          ? (this.canvasSnapToGrid ? this.canvasGridSnapSize : 1)
          : this.freeLayerNudgeStep;
    const amount = Math.max(1, Number(step) || 1);
    if (direction === 'left') this.nudgeSelectedFreeLayoutElement(-amount, 0);
    if (direction === 'right') this.nudgeSelectedFreeLayoutElement(amount, 0);
    if (direction === 'up') this.nudgeSelectedFreeLayoutElement(0, -amount);
    if (direction === 'down') this.nudgeSelectedFreeLayoutElement(0, amount);
    this.statusText = `Nudge ${mode === 'fine' ? 'fino' : mode === 'normal' ? 'principal' : 'grid'}: ${amount}px`;
  }

  rotateSelectedFreeLayoutElement(delta: number) {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    this.updateSelectedFreeLayoutElement({ rotation: (active.rotation || 0) + delta });
  }

  duplicateSelectedFreeLayoutElement() {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    const clone: FreeLayoutElement = {
      ...structuredClone(active),
      id: `fle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: active.x + 18,
      y: active.y + 18,
      zIndex: active.zIndex + 1,
    };
    this.freeLayoutElements = [...this.freeLayoutElements, clone];
    this.selectedFreeLayoutElementId = clone.id;
    this.onDraftChange();
  }

  duplicateSelectedFreeLayoutElementOffset(dx: number, dy: number) {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    const clone: FreeLayoutElement = {
      ...structuredClone(active),
      id: `fle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      x: active.x + dx,
      y: active.y + dy,
      zIndex: (active.zIndex || 1) + 1,
    };
    this.freeLayoutElements = [...this.freeLayoutElements, clone];
    this.selectedFreeLayoutElementId = clone.id;
    this.onDraftChange();
  }

  resizeSelectedFreeLayoutElement(dw: number, dh: number) {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    this.updateSelectedFreeLayoutElement({
      width: Math.max(20, active.width + dw),
      height: Math.max(20, active.height + dh),
    });
  }

  centerSelectedFreeLayoutElementOnPaper() {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    const paperW = this.freeCanvasPaperWidth;
    const paperH = this.freeCanvasPaperHeight;
    this.updateSelectedFreeLayoutElement({
      x: Math.max(0, Math.round((paperW - active.width) / 2)),
      y: Math.max(0, Math.round((paperH - active.height) / 2)),
    });
  }

  fitSelectedFreeLayoutElementToPaper(mode: 'width' | 'height') {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    if (mode === 'width') {
      this.updateSelectedFreeLayoutElement({
        x: 24,
        width: Math.max(40, this.freeCanvasPaperWidth - 48),
      });
      return;
    }
    this.updateSelectedFreeLayoutElement({
      y: 24,
      height: Math.max(40, this.freeCanvasPaperHeight - 48),
    });
  }

  mirrorSelectedFreeLayoutElement(axis: 'x' | 'y') {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    if (axis === 'x') {
      this.updateSelectedFreeLayoutElement({ x: Math.max(0, this.freeCanvasPaperWidth - active.x - active.width) });
      return;
    }
    this.updateSelectedFreeLayoutElement({ y: Math.max(0, this.freeCanvasPaperHeight - active.y - active.height) });
  }

  snapSelectedFreeLayoutElementToSafeMargins() {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    const margin = 22;
    this.updateSelectedFreeLayoutElement({
      x: Math.min(Math.max(active.x, margin), Math.max(margin, this.freeCanvasPaperWidth - active.width - margin)),
      y: Math.min(Math.max(active.y, margin), Math.max(margin, this.freeCanvasPaperHeight - active.height - margin)),
    });
    this.statusText = 'Capa ajustada a margenes seguros';
  }

  toggleFreeLayoutLayerVisibility(id: string) {
    this.freeLayoutElements = this.freeLayoutElements.map((item) =>
      item.id === id ? { ...item, visible: item.visible === false ? true : false } : item,
    );
    this.onDraftChange();
  }

  toggleFreeLayoutLayerLock(id: string) {
    this.freeLayoutElements = this.freeLayoutElements.map((item) =>
      item.id === id ? { ...item, locked: !item.locked } : item,
    );
    this.onDraftChange();
  }

  moveFreeLayoutLayerOrder(id: string, direction: -1 | 1) {
    const current = [...this.freeLayoutElements];
    const index = current.findIndex((item) => item.id === id);
    if (index === -1) return;
    const target = index + direction;
    if (target < 0 || target >= current.length) return;
    const [moved] = current.splice(index, 1);
    current.splice(target, 0, moved);
    this.freeLayoutElements = current.map((item, idx) => ({ ...item, zIndex: idx + 1 }));
    this.onDraftChange();
  }

  normalizeFreeLayoutLayerZ() {
    this.freeLayoutElements = [...this.freeLayoutElements]
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      .map((item, index) => ({ ...item, zIndex: index + 1 }));
    this.onDraftChange();
  }

  sortFreeLayoutLayersByPosition() {
    this.freeLayoutElements = [...this.freeLayoutElements]
      .sort((a, b) => (a.y - b.y) || (a.x - b.x))
      .map((item, index) => ({ ...item, zIndex: index + 1 }));
    this.onDraftChange();
  }

  distributeFreeLayoutElements(mode: 'horizontal' | 'vertical') {
    const movable = [...this.freeLayoutElements]
      .filter((el) => el.visible !== false && !el.locked)
      .sort((a, b) => (mode === 'horizontal' ? a.x - b.x : a.y - b.y));
    if (movable.length < 3) {
      this.statusText = 'Necesitas al menos 3 capas visibles y desbloqueadas para distribuir.';
      return;
    }
    const start = mode === 'horizontal' ? movable[0].x : movable[0].y;
    const end = mode === 'horizontal' ? movable[movable.length - 1].x : movable[movable.length - 1].y;
    const step = (end - start) / (movable.length - 1);
    const nextPos = new Map(movable.map((el, i) => [el.id, Math.round(start + step * i)]));
    this.freeLayoutElements = this.freeLayoutElements.map((el) =>
      nextPos.has(el.id)
        ? { ...el, [mode === 'horizontal' ? 'x' : 'y']: nextPos.get(el.id) as number }
        : el,
    );
    this.statusText = `Capas distribuidas en ${mode === 'horizontal' ? 'horizontal' : 'vertical'}`;
    this.onDraftChange();
  }

  buildFreeLayoutFromVisibleSections() {
    this.canvasFreeMode = true;
    this.canvasBlankPaperMode = false;
    const baseCards = this.filteredPreviewSections.slice(0, 6).map((section, index) => ({
      id: `fle_sec_${Date.now()}_${index}`,
      type: 'shape' as const,
      text: undefined,
      x: 28 + (index % 2) * 340,
      y: 220 + Math.floor(index / 2) * 180,
      width: 320,
      height: 150,
      rotation: 0,
      zIndex: index + 1,
      opacity: 1,
      background: 'rgba(255,255,255,.88)',
      borderColor: 'rgba(203,213,225,.5)',
      borderRadius: 16,
      shadow: '0 14px 28px rgba(15,23,42,.08)',
      visible: true,
      locked: false,
      shapeKind: 'rect' as const,
    }));
    const labels = this.filteredPreviewSections.slice(0, 6).map((section, index) => ({
      id: `fle_lbl_${Date.now()}_${index}`,
      type: 'text' as const,
      text: section.title,
      x: 44 + (index % 2) * 340,
      y: 236 + Math.floor(index / 2) * 180,
      width: 280,
      height: 42,
      rotation: 0,
      zIndex: index + 20,
      opacity: 1,
      fontFamily: "'Montserrat', 'Segoe UI', sans-serif",
      fontSize: 18,
      fontWeight: 700,
      color: '#0f172a',
      background: 'transparent',
      borderColor: 'transparent',
      borderRadius: 0,
      shadow: 'none',
      visible: true,
      locked: false,
      textAlign: 'left' as const,
      letterSpacing: 0,
      lineHeight: 1.2,
    }));
    this.freeLayoutElements = [...this.freeLayoutElements, ...baseCards, ...labels];
    this.normalizeFreeLayoutLayerZ();
    this.aiCopilotNote = 'IA/Visual: secciones visibles convertidas en tarjetas editables del canvas.';
    this.onDraftChange();
  }

  deleteSelectedFreeLayoutElement() {
    if (!this.selectedFreeLayoutElementId) return;
    this.freeLayoutElements = this.freeLayoutElements.filter((item) => item.id !== this.selectedFreeLayoutElementId);
    this.selectedFreeLayoutElementId = this.freeLayoutElements[0]?.id ?? '';
    this.onDraftChange();
  }

  freeColorInput(value: string | undefined, fallback: string) {
    return this.extractHexColor(value || '', fallback);
  }

  numberOr(value: unknown, fallback: number) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  minFloat(value: unknown, min: number) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, n);
  }

  minNumber(value: unknown, min: number) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, n);
  }

  roundInt(value: number) {
    return Math.round(Number(value || 0));
  }

  alignSelectedFreeLayoutElement(mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    const canvasW = this.freeCanvasPaperWidth;
    const canvasH = this.freeCanvasPaperHeight;
    if (mode === 'left') this.updateSelectedFreeLayoutElement({ x: 24 });
    if (mode === 'center') this.updateSelectedFreeLayoutElement({ x: Math.round((canvasW - active.width) / 2) });
    if (mode === 'right') this.updateSelectedFreeLayoutElement({ x: Math.max(0, canvasW - active.width - 24) });
    if (mode === 'top') this.updateSelectedFreeLayoutElement({ y: 24 });
    if (mode === 'middle') this.updateSelectedFreeLayoutElement({ y: Math.round((canvasH - active.height) / 2) });
    if (mode === 'bottom') this.updateSelectedFreeLayoutElement({ y: Math.max(0, canvasH - active.height - 24) });
  }

  bringSelectedFreeLayoutElement(direction: 'front' | 'back') {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    const maxZ = this.freeLayoutElements.reduce((acc, item) => Math.max(acc, item.zIndex || 0), 1);
    const minZ = this.freeLayoutElements.reduce((acc, item) => Math.min(acc, item.zIndex || 0), 1);
    this.updateSelectedFreeLayoutElement({
      zIndex: direction === 'front' ? maxZ + 1 : Math.max(1, minZ - 1),
    });
  }

  toggleLockSelectedFreeLayoutElement() {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    this.updateSelectedFreeLayoutElement({ locked: !active.locked });
  }

  toggleVisibilitySelectedFreeLayoutElement() {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    this.updateSelectedFreeLayoutElement({ visible: active.visible === false ? true : false });
  }

  cycleSelectedFreeLayoutLayer(direction: -1 | 1) {
    if (!this.freeLayoutElements.length) return;
    const ordered = [...this.freeLayoutElements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    const currentIndex = Math.max(0, ordered.findIndex((el) => el.id === this.selectedFreeLayoutElementId));
    const nextIndex = Math.min(ordered.length - 1, Math.max(0, currentIndex + direction));
    this.selectedFreeLayoutElementId = ordered[nextIndex]?.id ?? this.selectedFreeLayoutElementId;
    const selected = ordered[nextIndex];
    if (selected) {
      this.statusText = `Capa seleccionada: ${selected.type} · z${selected.zIndex}`;
    }
  }

  applySelectedFreeLayoutStylePreset(preset: 'title' | 'chip' | 'glass') {
    const active = this.selectedFreeLayoutElement;
    if (!active) return;
    if (preset === 'title') {
      this.updateSelectedFreeLayoutElement({
        fontFamily: "'Playfair Display', 'Georgia', serif",
        fontSize: 34,
        fontWeight: 700,
        color: '#0f172a',
        background: 'transparent',
        borderColor: 'transparent',
        shadow: 'none',
        letterSpacing: 0,
        lineHeight: 1.15,
      });
      return;
    }
    if (preset === 'chip') {
      this.updateSelectedFreeLayoutElement({
        fontFamily: "'Montserrat', 'Segoe UI', sans-serif",
        fontSize: 12,
        fontWeight: 800,
        textAlign: 'center',
        color: this.designPrimaryColor,
        background: `${this.designPrimaryColor}14`,
        borderColor: `${this.designPrimaryColor}66`,
        borderRadius: 999,
        letterSpacing: 1.1,
        lineHeight: 1,
      });
      return;
    }
    this.updateSelectedFreeLayoutElement({
      background: 'rgba(255,255,255,.65)',
      borderColor: 'rgba(255,255,255,.5)',
      shadow: '0 18px 40px rgba(15,23,42,.12)',
      borderRadius: 18,
    });
  }

  applySelectedGradientPreset(preset: '' | 'softMint' | 'editorialRose' | 'nightGlass') {
    if (!preset) return;
    if (preset === 'softMint') {
      this.updateSelectedFreeLayoutElement({
        background: 'linear-gradient(135deg, rgba(236,253,245,.95), rgba(240,249,255,.92))',
        borderColor: 'rgba(45,212,191,.35)',
      });
      return;
    }
    if (preset === 'editorialRose') {
      this.updateSelectedFreeLayoutElement({
        background: 'linear-gradient(135deg, rgba(253,242,248,.95), rgba(238,242,255,.92))',
        borderColor: 'rgba(244,114,182,.35)',
      });
      return;
    }
    this.updateSelectedFreeLayoutElement({
      background: 'linear-gradient(135deg, rgba(15,23,42,.72), rgba(30,41,59,.62))',
      borderColor: 'rgba(148,163,184,.35)',
      color: '#f8fafc',
    });
  }

  applySelectedShadowPreset(preset: '' | 'soft' | 'deep' | 'none') {
    if (!preset) return;
    const map = {
      soft: '0 10px 24px rgba(15,23,42,.08)',
      deep: '0 22px 46px rgba(15,23,42,.18)',
      none: 'none',
    } as const;
    this.updateSelectedFreeLayoutElement({ shadow: map[preset] });
  }

  addFreeLayoutKit(kind: 'hero' | 'stats' | 'cta' | 'signature') {
    this.canvasFreeMode = true;
    this.canvasBlankPaperMode = true;
    if (kind === 'hero') {
      this.addFreeLayoutElement('shape');
      this.updateSelectedFreeLayoutElement({
        x: 28,
        y: 24,
        width: 670,
        height: 180,
        background:
          this.designHeroImageUrl?.trim()
            ? `url(${this.designHeroImageUrl.trim()}) center/cover no-repeat`
            : `linear-gradient(150deg, ${this.designPrimaryColor}22, ${this.designAccentColor}22)`,
        borderColor: 'rgba(255,255,255,.45)',
        borderRadius: 18,
      });
      this.addFreeLayoutElement('text');
      this.updateSelectedFreeLayoutElement({
        text: this.draftName || 'Wedding template premium',
        x: 52,
        y: 78,
        width: 520,
        height: 68,
        color: '#ffffff',
        fontFamily: "'Playfair Display', 'Georgia', serif",
        fontSize: 34,
        fontWeight: 700,
        borderColor: 'transparent',
        background: 'transparent',
        shadow: 'none',
      });
    } else if (kind === 'stats') {
      ['Tipo', 'Secciones', 'Campos', 'Score'].forEach((label, index) => {
        this.addFreeLayoutElement('shape');
        this.updateSelectedFreeLayoutElement({
          x: 36 + index * 168,
          y: 230,
          width: 152,
          height: 86,
          background: 'rgba(255,255,255,.94)',
          borderColor: 'rgba(203,213,225,.55)',
          borderRadius: 14,
        });
        this.addFreeLayoutElement('label');
        this.updateSelectedFreeLayoutElement({
          text: label,
          x: 46 + index * 168,
          y: 242,
          width: 110,
          height: 22,
          background: 'transparent',
          borderColor: 'transparent',
          color: this.designAccentColor,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 1,
        });
      });
    } else if (kind === 'cta') {
      this.addFreeLayoutElement('shape');
      this.updateSelectedFreeLayoutElement({
        x: 60,
        y: 350,
        width: 300,
        height: 72,
        background: `linear-gradient(135deg, ${this.designPrimaryColor}, ${this.designAccentColor})`,
        borderColor: 'transparent',
        borderRadius: 16,
        shadow: '0 18px 34px rgba(15,23,42,.16)',
      });
      this.addFreeLayoutElement('label');
      this.updateSelectedFreeLayoutElement({
        text: 'Aprobacion cliente',
        x: 92,
        y: 373,
        width: 230,
        height: 28,
        color: '#ffffff',
        background: 'transparent',
        borderColor: 'transparent',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: 16,
      });
    } else {
      this.addFreeLayoutElement('text');
      this.updateSelectedFreeLayoutElement({
        text: 'Wedding Planner Signature',
        x: 420,
        y: 620,
        width: 260,
        height: 42,
        rotation: -3,
        fontFamily: "'Cormorant Garamond', 'Georgia', serif",
        fontSize: 22,
        color: this.designPrimaryColor,
        background: 'transparent',
        borderColor: 'transparent',
      });
    }
    this.statusText = `Kit visual ${kind} aplicado`;
    this.onDraftChange();
  }

  runAiNeedBasedTemplateBoost(mode: 'operativa' | 'cliente' | 'lujo') {
    if (mode === 'operativa') {
      this.runAiAdminOpsBoost();
      this.runAiVendorContractPack();
      this.runAiCeremonyFlowPack();
      this.addFreeLayoutKit('stats');
      this.aiCopilotNote = 'IA Need Operativa: reforzada con control, vendors, cues y panel visual KPI.';
      return;
    }
    if (mode === 'cliente') {
      this.runAiClientExperienceBoost();
      this.generateClientChecklist();
      this.addFreeLayoutKit('cta');
      this.aiCopilotNote = 'IA Need Cliente: checklist claro, CTA y copy simplificado para validacion.';
      return;
    }
    this.runAiWeddingLuxuryNarrativePack();
    this.generateAiPremiumFreeLayout();
    this.addFreeLayoutKit('signature');
    this.aiCopilotNote = 'IA Need Lujo: narrativa, composicion premium y firma visual.';
  }

  runAiVisualPolishPass() {
    if (!this.freeLayoutElements.length) {
      this.generateAiPremiumFreeLayout();
      return;
    }
    const accent = this.designAccentColor;
    this.freeLayoutElements = this.freeLayoutElements.map((el, idx) => ({
      ...el,
      borderRadius: el.borderRadius ?? (el.type === 'label' ? 999 : 14),
      shadow:
        el.shadow && el.shadow !== 'none'
          ? el.shadow
          : el.type === 'shape' || el.type === 'image'
            ? '0 18px 32px rgba(15,23,42,.10)'
            : 'none',
      letterSpacing:
        el.type === 'label'
          ? (el.letterSpacing ?? 0.8)
          : el.letterSpacing ?? 0,
      borderColor:
        el.borderColor && el.borderColor !== 'transparent'
          ? el.borderColor
          : el.type === 'label'
            ? `${accent}66`
            : el.borderColor,
      lineHeight: el.lineHeight ?? 1.2,
      zIndex: el.zIndex || idx + 1,
    }));
    this.aiCopilotNote = 'IA Visual Polish: capas suavizadas, jerarquia y acabado premium aplicados.';
    this.onDraftChange();
  }

  runAiAutoCompleteFromPromptContext() {
    const prompt = (this.quickAiPrompt || '').toLowerCase();
    const joined = `${prompt} ${this.draftName} ${this.draftDescription}`.toLowerCase();
    if (!joined.trim()) {
      this.statusText = 'Escribe un brief o descripcion para IA Prompt Context.';
      return;
    }
    if (/(lujo|premium|editorial|signature)/.test(joined)) {
      this.runAiNeedBasedTemplateBoost('lujo');
      this.addFreeLayoutKit('hero');
      this.applyPdfExportPreset('luxury');
    }
    if (/(cliente|novia|novio|pareja|guest|rsvp)/.test(joined)) {
      this.runAiNeedBasedTemplateBoost('cliente');
      if (!this.sections.some((s) => s.title.toLowerCase().includes('rsvp'))) this.addGuestRsvpPack();
    }
    if (/(operativa|planner|proveedor|dia b|logistica|timeline)/.test(joined)) {
      this.runAiNeedBasedTemplateBoost('operativa');
      this.autoArrangeCanvasLayout();
    }
    if (/(pdf|dossier|presentacion|impresion)/.test(joined)) {
      this.pdfShowToc = true;
      this.pdfShowDesignSheet = true;
      this.pdfShowGeneratedStamp = true;
      this.pdfLayoutMode = 'cards';
      this.pdfDensity = 'comfortable';
    }
    this.aiCopilotNote = 'IA Prompt Context: mejoras aplicadas segun brief, perfil y objetivo visual.';
    this.onDraftChange();
  }

  runAiLayoutVariant(mode: 'editorial' | 'report' | 'minimal') {
    if (!this.freeLayoutElements.length) this.generateAiPremiumFreeLayout();
    if (mode === 'editorial') {
      this.applyVisualStylePreset('luxe');
      this.applyPdfExportPreset('luxury');
      this.freeLayoutElements = this.freeLayoutElements.map((el) => ({
        ...el,
        rotation: el.type === 'label' ? -2 : el.rotation,
        borderRadius: el.type === 'shape' ? 18 : el.borderRadius,
      }));
      this.addFreeLayoutKit('signature');
      this.aiCopilotNote = 'IA Layout Editorial: composición con acentos premium y firma visual.';
    } else if (mode === 'report') {
      this.applyVisualStylePreset('modern');
      this.applyPdfExportPreset('signature');
      this.buildFreeLayoutFromVisibleSections();
      this.sortFreeLayoutLayersByPosition();
      this.aiCopilotNote = 'IA Layout Report: tarjetas legibles y jerarquía clara para dossier operativo.';
    } else {
      this.applyVisualStylePreset('modern');
      this.applyPdfExportPreset('minimal');
      this.freeLayoutElements = this.freeLayoutElements.map((el) => ({
        ...el,
        background: el.type === 'shape' ? 'rgba(255,255,255,.95)' : el.background,
        borderColor: el.type === 'shape' ? 'rgba(203,213,225,.45)' : el.borderColor,
        shadow: el.type === 'shape' ? '0 8px 18px rgba(15,23,42,.06)' : el.shadow,
        rotation: 0,
      }));
      this.aiCopilotNote = 'IA Layout Minimal: limpieza visual, menos ruido y lectura más clara.';
    }
    this.onDraftChange();
  }

  generateAiPremiumFreeLayout() {
    this.canvasFreeMode = true;
    this.canvasBlankPaperMode = true;
    const primary = this.designPrimaryColor;
    const accent = this.designAccentColor;
    const title = this.draftName || 'Wedding template premium';
    const subtitle = this.draftDescription || 'Documento visual premium editable';
    const base: FreeLayoutElement[] = [
      {
        id: `fle_${Date.now()}_label`,
        type: 'label',
        text: `${this.toLabel(this.draftType)} PREMIUM`,
        x: 48,
        y: 36,
        width: 220,
        height: 34,
        rotation: 0,
        zIndex: 2,
        opacity: 1,
        fontFamily: "'Montserrat', 'Segoe UI', sans-serif",
        fontSize: 12,
        fontWeight: 800,
        color: primary,
        background: 'rgba(255,255,255,.92)',
        borderColor: 'rgba(148,163,184,.2)',
        borderRadius: 12,
        shadow: '0 6px 14px rgba(15,23,42,.06)',
      },
      {
        id: `fle_${Date.now()}_title`,
        type: 'text',
        text: title,
        x: 48,
        y: 84,
        width: 560,
        height: 76,
        rotation: 0,
        zIndex: 3,
        opacity: 1,
        fontFamily: "'Playfair Display', 'Georgia', serif",
        fontSize: 34,
        fontWeight: 700,
        color: '#0f172a',
        background: 'transparent',
        borderColor: 'transparent',
        borderRadius: 0,
        shadow: 'none',
      },
      {
        id: `fle_${Date.now()}_sub`,
        type: 'text',
        text: subtitle,
        x: 52,
        y: 156,
        width: 620,
        height: 54,
        rotation: 0,
        zIndex: 3,
        opacity: 0.9,
        fontFamily: "'Poppins', 'Segoe UI', sans-serif",
        fontSize: 15,
        fontWeight: 500,
        color: '#475569',
        background: 'transparent',
        borderColor: 'transparent',
        borderRadius: 0,
        shadow: 'none',
      },
      {
        id: `fle_${Date.now()}_panel`,
        type: 'shape',
        x: 46,
        y: 236,
        width: 680,
        height: 180,
        rotation: 0,
        zIndex: 1,
        opacity: 1,
        background: 'linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,250,252,.92))',
        borderColor: 'rgba(203,213,225,.45)',
        borderRadius: 18,
        shadow: '0 16px 34px rgba(15,23,42,.07)',
      },
      {
        id: `fle_${Date.now()}_score`,
        type: 'label',
        text: `Score ${this.completenessScore}/100`,
        x: 72,
        y: 260,
        width: 170,
        height: 38,
        rotation: -2,
        zIndex: 4,
        opacity: 1,
        fontFamily: "'Montserrat', 'Segoe UI', sans-serif",
        fontSize: 13,
        fontWeight: 700,
        color: '#111827',
        background: `${accent}22`,
        borderColor: `${accent}`,
        borderRadius: 12,
        shadow: '0 8px 20px rgba(15,23,42,.08)',
      },
    ];
    this.freeLayoutElements = base;
    this.selectedFreeLayoutElementId = base[1].id;
    this.applyVisualStylePreset('luxe');
    this.applyPdfExportPreset('luxury');
    this.aiCopilotNote = 'IA Layout Director: portada premium editable generada en hoja blanca.';
    this.onDraftChange();
  }

  exportCurrentTemplatePdf() {
    openTemplatePdfPreview({
      title: this.draftName || 'Template wedding',
      subtitle: this.draftDescription || 'Documento exportado desde el editor premium.',
      theme: this.pdfThemeForType(this.draftType),
      design: this.currentDesignSettings,
      exportOptions: this.currentPdfExportSettings,
      freeLayout: this.currentFreeLayoutSettings,
      meta: [
        { label: 'Tipo', value: this.toLabel(this.draftType) },
        { label: 'Secciones', value: this.sections.length },
        { label: 'Campos', value: this.totalFields },
        { label: 'Score', value: `${this.completenessScore}/100` },
      ],
      sections: this.filteredPreviewSections.map((section) => ({
        title: section.title,
        description: section.description,
        fields: section.fields.map((field) => ({ label: field.label, type: field.type })),
      })),
    });
  }

  get currentDesignSettings(): PdfDesign {
    return {
      fontFamily: this.designFontFamily,
      titleFontFamily: this.designTitleFontFamily,
      primaryColor: this.designPrimaryColor,
      accentColor: this.designAccentColor,
      pageBackground: this.designPageBackground,
      heroImageUrl: this.designHeroImageUrl?.trim() || undefined,
      logoImageUrl: this.designLogoImageUrl?.trim() || undefined,
      compactMode: this.designCompactMode,
    };
  }

  get currentVisualStyleSettings(): TemplateVisualStyleSettings {
    return {
      preset: this.visualStylePreset,
      surfaceBackground: this.visualSurfaceBackground.trim(),
      textColor: this.visualTextColor,
      mutedTextColor: this.visualMutedTextColor,
      cardBackground: this.visualCardBackground.trim(),
      cardBorderColor: this.visualCardBorderColor,
      heroOverlay: this.visualHeroOverlay.trim(),
      borderRadius: this.visualBorderRadius,
      cardRadius: this.visualCardRadius,
      cardGap: this.visualCardGap,
      cardShadow: this.visualCardShadow.trim(),
      viewportCss: this.visualViewportCss.trim(),
      cardCss: this.visualCardCss.trim(),
      heroCss: this.visualHeroCss.trim(),
    };
  }

  get currentPdfExportSettings() {
    return {
      preset: this.pdfExportPreset,
      layoutMode: this.pdfLayoutMode,
      showToc: this.pdfShowToc,
      showWatermark: this.pdfShowWatermark,
      showDesignSheet: this.pdfShowDesignSheet,
      showGeneratedStamp: this.pdfShowGeneratedStamp,
      watermarkText: this.pdfWatermarkText.trim(),
      footerText: this.pdfFooterText.trim(),
      pageFormat: this.pdfPageFormat,
      density: this.pdfDensity,
    };
  }

  get currentCanvasLayoutSettings(): CanvasLayoutSettings {
    return {
      freeMode: this.canvasFreeMode,
      showGrid: this.canvasShowGrid,
      showSafeMargins: this.canvasShowSafeMargins,
      zoom: this.canvasZoom,
      gridSnapSize: this.canvasGridSnapSize,
      sectionSnapSize: this.canvasSectionSnapSize,
      centerGuideTolerance: this.canvasCenterGuideTolerance,
      positions: this.canvasSectionPositions,
    };
  }

  get currentFreeLayoutSettings(): FreeLayoutSettings {
    return {
      blankPaperMode: this.canvasBlankPaperMode,
      paperPreset: this.freeCanvasPaperPreset,
      paperWidth: this.freeCanvasPaperWidth,
      paperHeight: this.freeCanvasPaperHeight,
      showRulers: this.canvasShowRulers,
      showLayerLabels: this.canvasShowLayerLabels,
      keyboardNudgeStep: this.freeLayerNudgeStep,
      keyboardFineNudgeStep: this.freeLayerFineNudgeStep,
      elements: this.freeLayoutElements,
    };
  }

  get selectedFreeLayoutElement() {
    return this.freeLayoutElements.find((item) => item.id === this.selectedFreeLayoutElementId) ?? null;
  }

  get previewLayerStack() {
    return [...this.freeLayoutElements].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  }

  get previewCanvasStyle() {
    return {
      '--design-primary': this.designPrimaryColor,
      '--design-accent': this.designAccentColor,
      '--design-font': this.designFontFamily,
      '--design-title-font': this.designTitleFontFamily,
    } as Record<string, string>;
  }

  get previewViewportStyle() {
    return {
      ...this.previewCanvasStyle,
      color: this.visualTextColor,
      background: this.visualSurfaceBackground,
      borderRadius: `${this.visualBorderRadius}px`,
      gap: `${this.visualCardGap}px`,
      ...this.parseCssDeclarations(this.visualViewportCss),
    } as Record<string, string>;
  }

  get previewCardStyle() {
    return {
      color: this.visualTextColor,
      background: this.visualCardBackground,
      border: `1px solid ${this.visualCardBorderColor}`,
      borderRadius: `${this.visualCardRadius}px`,
      boxShadow: this.visualCardShadow,
      ...this.parseCssDeclarations(this.visualCardCss),
    } as Record<string, string>;
  }

  get previewStackStyle() {
    return {
      gap: `${this.visualCardGap}px`,
    } as Record<string, string>;
  }

  get canvasMainCardStyle() {
    return {
      color: this.visualTextColor,
      background: this.visualSurfaceBackground,
      borderRadius: `${Math.max(this.visualBorderRadius, 18)}px`,
      ...this.parseCssDeclarations(this.visualViewportCss),
    } as Record<string, string>;
  }

  get canvasSectionCardStyle() {
    return this.previewCardStyle;
  }

  get canvasBodyStyle() {
    if (!this.canvasFreeMode) {
      return {
        gap: `${this.visualCardGap}px`,
      } as Record<string, string>;
    }
    return {
      position: 'relative',
      minHeight: `${Math.max(this.freeCanvasPaperHeight + 40, this.sections.length * 120)}px`,
      display: 'block',
      backgroundImage: this.canvasShowGrid
        ? 'linear-gradient(rgba(148,163,184,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,.12) 1px, transparent 1px)'
        : 'none',
      backgroundSize: this.canvasShowGrid ? '24px 24px' : 'auto',
      borderRadius: '14px',
      transform: `scale(${this.canvasZoom / 100})`,
      transformOrigin: 'top left',
      width: `${10000 / this.canvasZoom}%`,
    } as Record<string, string>;
  }

  get canvasPaperStyle() {
    return {
      position: 'relative',
      background: '#ffffff',
      border: '1px solid rgba(148,163,184,.24)',
      borderRadius: '16px',
      width: `${this.freeCanvasPaperWidth}px`,
      minHeight: `${this.freeCanvasPaperHeight}px`,
      height: `${this.freeCanvasPaperHeight}px`,
      boxShadow: '0 20px 40px rgba(15,23,42,.08)',
      overflow: 'hidden',
    } as Record<string, string>;
  }

  get canvasSafeMarginsStyle() {
    return {
      position: 'absolute',
      inset: '22px',
      border: `1px dashed ${this.designAccentColor}55`,
      borderRadius: '12px',
      pointerEvents: 'none',
      zIndex: '0',
    } as Record<string, string>;
  }

  get canvasRulerTopStyle() {
    return {
      position: 'absolute',
      left: '0',
      top: '0',
      right: '0',
      height: '16px',
      background:
        'linear-gradient(90deg, rgba(148,163,184,.16) 1px, transparent 1px), linear-gradient(180deg, rgba(248,250,252,.92), rgba(241,245,249,.88))',
      backgroundSize: '24px 16px, auto',
      borderBottom: '1px solid rgba(148,163,184,.15)',
      pointerEvents: 'none',
      zIndex: '3',
    } as Record<string, string>;
  }

  get canvasRulerLeftStyle() {
    return {
      position: 'absolute',
      left: '0',
      top: '0',
      bottom: '0',
      width: '16px',
      background:
        'linear-gradient(rgba(148,163,184,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(248,250,252,.92), rgba(241,245,249,.88))',
      backgroundSize: '16px 24px, auto',
      borderRight: '1px solid rgba(148,163,184,.15)',
      pointerEvents: 'none',
      zIndex: '3',
    } as Record<string, string>;
  }

  get canvasGuideVerticalStyle() {
    return {
      position: 'absolute',
      top: '0',
      bottom: '0',
      left: `${this.canvasGuideX ?? 0}px`,
      width: '1px',
      background: `${this.designAccentColor}`,
      opacity: '0.7',
      pointerEvents: 'none',
      zIndex: '999',
    } as Record<string, string>;
  }

  get canvasGuideHorizontalStyle() {
    return {
      position: 'absolute',
      left: '0',
      right: '0',
      top: `${this.canvasGuideY ?? 0}px`,
      height: '1px',
      background: `${this.designAccentColor}`,
      opacity: '0.7',
      pointerEvents: 'none',
      zIndex: '999',
    } as Record<string, string>;
  }

  get canvasHeroStyle() {
    return {
      ...this.previewCanvasStyle,
      color: '#ffffff',
      ...this.parseCssDeclarations(this.visualHeroCss),
    } as Record<string, string>;
  }

  canvasSectionCardStyleFor(section: TemplateSection, sectionIndex: number) {
    if (!this.canvasFreeMode) return this.canvasSectionCardStyle;
    const key = this.canvasSectionLayoutKey(section, sectionIndex);
    const pos = this.canvasPositionFor(section, sectionIndex);
    return {
      ...this.canvasSectionCardStyle,
      position: 'absolute',
      left: `${pos.x}px`,
      top: `${pos.y}px`,
      width: '320px',
      cursor: 'move',
      userSelect: 'none',
    } as Record<string, string>;
  }

  freeLayoutElementStyle(element: FreeLayoutElement) {
    const isSelected = this.selectedFreeLayoutElementId === element.id;
    const isLine = element.type === 'shape' && element.shapeKind === 'line';
    const borderWidth = Math.max(0, Number(element.borderWidth ?? 1));
    const radius =
      element.type === 'shape' && element.shapeKind === 'pill'
        ? 999
        : isLine
          ? 2
          : (element.borderRadius ?? 12);
    return {
      position: 'absolute',
      left: `${element.x}px`,
      top: `${element.y}px`,
      width: `${element.width}px`,
      height: `${element.height}px`,
      transform: `rotate(${element.rotation}deg)`,
      zIndex: String(element.zIndex),
      opacity: String(element.opacity),
      color: element.color || '#0f172a',
      background: element.background || (element.type === 'text' ? 'transparent' : 'rgba(255,255,255,.5)'),
      border: `${borderWidth}px solid ${element.borderColor || 'rgba(148,163,184,.3)'}`,
      borderRadius: `${radius}px`,
      boxShadow: element.shadow || 'none',
      mixBlendMode: element.blendMode || 'normal',
      backdropFilter: element.backdropBlur ? `blur(${element.backdropBlur}px)` : 'none',
      fontFamily: element.fontFamily || "'Poppins', 'Segoe UI', sans-serif",
      fontSize: `${element.fontSize ?? 16}px`,
      fontWeight: String(element.fontWeight ?? 500),
      textAlign: element.textAlign || 'left',
      letterSpacing: `${element.letterSpacing ?? 0}px`,
      lineHeight: String(element.lineHeight ?? 1.2),
      cursor: 'move',
      display: 'flex',
      alignItems: 'center',
      justifyContent: element.type === 'label' ? 'center' : 'flex-start',
      padding: element.type === 'shape' ? '0' : '8px 10px',
      overflow: 'hidden',
      userSelect: 'none',
      whiteSpace: element.type === 'text' ? 'pre-wrap' : 'normal',
      outline: isSelected ? `2px solid ${this.designAccentColor}` : 'none',
      outlineOffset: isSelected ? '1px' : '0',
      pointerEvents: element.visible === false ? 'none' : 'auto',
      minHeight: isLine ? '2px' : undefined,
    } as Record<string, string>;
  }

  freeLayoutResizeHandleStyle(handle: FreeResizeHandle) {
    const common = {
      position: 'absolute',
      width: '12px',
      height: '12px',
      borderRadius: '999px',
      border: `2px solid ${this.designAccentColor}`,
      background: '#ffffff',
      zIndex: '10',
      padding: '0',
      minWidth: '12px',
      minHeight: '12px',
    } as Record<string, string>;
    if (handle === 'nw') return { ...common, left: '-7px', top: '-7px', cursor: 'nwse-resize' };
    if (handle === 'ne') return { ...common, right: '-7px', top: '-7px', cursor: 'nesw-resize' };
    if (handle === 'sw') return { ...common, left: '-7px', bottom: '-7px', cursor: 'nesw-resize' };
    return { ...common, right: '-7px', bottom: '-7px', cursor: 'nwse-resize' };
  }

  freeLayoutMiniToolbarStyle(_: FreeLayoutElement) {
    return {
      position: 'absolute',
      left: '0',
      bottom: 'calc(100% + 8px)',
      display: 'flex',
      gap: '4px',
      zIndex: '11',
      pointerEvents: 'auto',
    } as Record<string, string>;
  }

  freeLayoutRotateGuideStyle() {
    return {
      position: 'absolute',
      top: '-28px',
      left: '50%',
      width: '2px',
      height: '20px',
      background: `${this.designAccentColor}`,
      transform: 'translateX(-50%)',
      opacity: '0.7',
      zIndex: '9',
      pointerEvents: 'none',
    } as Record<string, string>;
  }

  freeLayoutRotateHandleStyle() {
    return {
      position: 'absolute',
      top: '-42px',
      left: '50%',
      width: '14px',
      height: '14px',
      borderRadius: '999px',
      border: `2px solid ${this.designAccentColor}`,
      background: '#ffffff',
      transform: 'translateX(-50%)',
      cursor: 'grab',
      zIndex: '10',
      padding: '0',
      minWidth: '14px',
      minHeight: '14px',
    } as Record<string, string>;
  }

  freeLayoutImageInnerStyle(element: FreeLayoutElement) {
    return {
      width: '100%',
      height: '100%',
      objectFit: element.imageFit || 'cover',
      borderRadius: 'inherit',
      display: 'block',
    } as Record<string, string>;
  }

  freeLayoutLayerLabelStyle(_: FreeLayoutElement) {
    return {
      position: 'absolute',
      top: '-18px',
      left: '0',
      borderRadius: '999px',
      background: 'rgba(15,23,42,.76)',
      color: '#ffffff',
      fontSize: '10px',
      lineHeight: '1',
      padding: '3px 6px',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      zIndex: '2',
    } as Record<string, string>;
  }

  get visualCardBackgroundColor() {
    return this.extractHexColor(this.visualCardBackground, '#ffffff');
  }

  get canvasHeroImage() {
    if (this.designHeroImageUrl?.trim()) {
      return `${this.visualHeroOverlay || 'linear-gradient(150deg, rgba(15,23,42,.35), rgba(15,118,110,.25))'}, url(${this.designHeroImageUrl.trim()})`;
    }
    return this.canvasCover;
  }

  applyDesignPreset(preset: DesignPreset) {
    if (preset === 'minimal') {
      this.designFontFamily = "'Montserrat', 'Segoe UI', sans-serif";
      this.designTitleFontFamily = "'Libre Baskerville', 'Georgia', serif";
      this.designPrimaryColor = '#0f172a';
      this.designAccentColor = '#0e7490';
      this.designPageBackground = 'linear-gradient(180deg,#f8fafc,#eef2f7)';
      this.designCompactMode = true;
    } else if (preset === 'night') {
      this.designFontFamily = "'Poppins', 'Segoe UI', sans-serif";
      this.designTitleFontFamily = "'Cormorant Garamond', 'Georgia', serif";
      this.designPrimaryColor = '#0f766e';
      this.designAccentColor = '#38bdf8';
      this.designPageBackground =
        'radial-gradient(circle at 12% 0%,rgba(15,118,110,.2),transparent 36%),linear-gradient(180deg,#0f172a,#1e293b)';
      this.designCompactMode = false;
    } else {
      this.designFontFamily = "'Poppins', 'Segoe UI', sans-serif";
      this.designTitleFontFamily = "'Playfair Display', 'Georgia', serif";
      this.designPrimaryColor = '#be185d';
      this.designAccentColor = '#0e7490';
      this.designPageBackground =
        'radial-gradient(circle at 10% 0%,rgba(244,114,182,.16),transparent 34%),radial-gradient(circle at 90% 12%,rgba(14,165,233,.12),transparent 42%),linear-gradient(180deg,#fff8fb,#f8fbff 60%,#f3f6fb)';
      this.designCompactMode = false;
    }
    this.onDraftChange();
  }

  clearDesignImages() {
    this.designHeroImageUrl = '';
    this.designLogoImageUrl = '';
    this.onDraftChange();
  }

  applyVisualStylePreset(preset: VisualStylePreset) {
    this.visualStylePreset = preset;
    if (preset === 'luxe') {
      this.visualSurfaceBackground =
        'radial-gradient(circle at 8% 0%, rgba(217,119,6,.12), transparent 36%), linear-gradient(180deg, rgba(255,251,235,.9), rgba(255,255,255,.92))';
      this.visualTextColor = '#1f2937';
      this.visualMutedTextColor = '#6b7280';
      this.visualCardBackground = 'rgba(255,255,255,.9)';
      this.visualCardBorderColor = 'rgba(217,119,6,.24)';
      this.visualHeroOverlay = 'linear-gradient(155deg, rgba(17,24,39,.46), rgba(217,119,6,.24))';
      this.visualBorderRadius = 24;
      this.visualCardRadius = 20;
      this.visualCardGap = 16;
      this.visualCardShadow = '0 26px 60px rgba(31,41,55,.16)';
    } else if (preset === 'botanical') {
      this.visualSurfaceBackground =
        'radial-gradient(circle at 90% 8%, rgba(34,197,94,.1), transparent 35%), linear-gradient(180deg, rgba(248,250,252,.92), rgba(240,253,244,.88))';
      this.visualTextColor = '#14532d';
      this.visualMutedTextColor = '#3f6212';
      this.visualCardBackground = 'rgba(255,255,255,.88)';
      this.visualCardBorderColor = 'rgba(34,197,94,.22)';
      this.visualHeroOverlay = 'linear-gradient(155deg, rgba(20,83,45,.44), rgba(34,197,94,.22))';
      this.visualBorderRadius = 20;
      this.visualCardRadius = 16;
      this.visualCardGap = 14;
      this.visualCardShadow = '0 20px 48px rgba(20,83,45,.12)';
    } else if (preset === 'modern') {
      this.visualSurfaceBackground =
        'linear-gradient(180deg, rgba(241,245,249,.95), rgba(226,232,240,.9))';
      this.visualTextColor = '#0f172a';
      this.visualMutedTextColor = '#334155';
      this.visualCardBackground = 'rgba(255,255,255,.82)';
      this.visualCardBorderColor = 'rgba(15,23,42,.12)';
      this.visualHeroOverlay = 'linear-gradient(155deg, rgba(15,23,42,.5), rgba(14,165,233,.25))';
      this.visualBorderRadius = 16;
      this.visualCardRadius = 12;
      this.visualCardGap = 12;
      this.visualCardShadow = '0 16px 36px rgba(15,23,42,.12)';
    } else {
      this.visualSurfaceBackground = 'linear-gradient(180deg, rgba(255,255,255,.88), rgba(248,250,252,.9))';
      this.visualTextColor = '#0f172a';
      this.visualMutedTextColor = '#475569';
      this.visualCardBackground = 'rgba(255,255,255,.84)';
      this.visualCardBorderColor = 'rgba(148,163,184,.28)';
      this.visualHeroOverlay = 'linear-gradient(150deg, rgba(15,23,42,.42), rgba(15,118,110,.24))';
      this.visualBorderRadius = 22;
      this.visualCardRadius = 18;
      this.visualCardGap = 14;
      this.visualCardShadow = '0 22px 50px rgba(15,23,42,.14)';
    }
    this.onDraftChange();
  }

  setVisualCardBackgroundFromColor(color: string) {
    this.visualCardBackground = color;
    this.onDraftChange();
  }

  resetVisualStyleBuilder() {
    this.visualViewportCss = '';
    this.visualCardCss = '';
    this.visualHeroCss = '';
    this.applyVisualStylePreset('editorial');
  }

  private pdfThemeForType(type: TemplateType): PdfTheme {
    if (type === 'TIMELINE') return 'timeline';
    if (type === 'BUDGET') return 'budget';
    if (type === 'GUEST_LIST') return 'guest';
    if (type === 'VENDOR_LIST') return 'vendor';
    return 'checklist';
  }

  private getRealFieldSeed(sectionTitle: string, fieldIndex: number): TemplateField {
    const catalog: TemplateField[] = [
      { key: 'responsable_principal', label: 'Responsable principal del bloque', type: 'text' },
      { key: 'fecha_confirmacion', label: 'Fecha de confirmacion', type: 'date' },
      { key: 'estado_avance', label: 'Estado de avance', type: 'select' },
      { key: 'riesgo_mitigacion', label: 'Riesgo y plan de mitigacion', type: 'textarea' },
      { key: 'aprobacion_cliente', label: 'Aprobacion del cliente', type: 'checkbox' },
      { key: 'observaciones_operativas', label: 'Observaciones operativas', type: 'textarea' },
    ];
    const seed = catalog[fieldIndex % catalog.length];
    const block = this.slugify(sectionTitle || 'bloque');
    return { ...seed, key: `${seed.key}_${block}_${fieldIndex + 1}` };
  }

  private toProfessionalFieldLabel(label: string, sectionTitle: string) {
    const clean = (label || '').trim().toLowerCase();
    const section = (sectionTitle || '').toLowerCase();
    const map: Record<string, string> = {
      responsable: 'Responsable asignado del bloque',
      estado: 'Estado de avance operativo',
      pago: 'Estado de pago y vencimiento',
      notas: 'Observaciones operativas',
      tarea: 'Tarea principal del bloque',
      fecha: 'Fecha de compromiso',
      invitado: 'Datos de invitado',
      proveedor: 'Proveedor responsable',
    };
    if (!clean) return 'Campo operativo';
    for (const key of Object.keys(map)) {
      if (clean.includes(key)) return map[key];
    }
    if (section.includes('timeline') && clean.includes('hora')) return 'Hora del hito en cronograma';
    if (section.includes('presupuesto') && clean.includes('importe')) return 'Importe de control financiero';
    return label;
  }

  autoFixDuplicateKeys() {
    this.pushHistorySnapshot();
    const used = new Set<string>();
    this.sections = this.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => {
        const base = this.slugify(field.key || field.label || 'campo');
        let candidate = base;
        let idx = 2;
        while (used.has(candidate)) {
          candidate = `${base}_${idx}`;
          idx += 1;
        }
        used.add(candidate);
        return { ...field, key: candidate };
      }),
    }));
    this.onDraftChange();
  }

  autoFillMissingLabels() {
    this.pushHistorySnapshot();
    this.sections = this.sections.map((section, sectionIndex) => ({
      ...section,
      fields: section.fields.map((field, fieldIndex) => {
        if (field.label.trim()) return field;
        const fallback = field.key.trim() || `campo_operativo_${sectionIndex + 1}_${fieldIndex + 1}`;
        const label = fallback
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
        return { ...field, label };
      }),
    }));
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

  triggerCanvasReveal() {
    this.canvasReveal = true;
    if (this.revealTimer) clearTimeout(this.revealTimer);
    this.revealTimer = setTimeout(() => {
      this.canvasReveal = false;
    }, 850);
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

  private extractErrorMessage(error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof (error as { error?: unknown }).error === 'object'
    ) {
      const payload = (error as { error?: { message?: unknown } }).error;
      if (Array.isArray(payload?.message)) return payload.message.join(', ');
      if (typeof payload?.message === 'string') return payload.message;
    }
    return 'revisa conexion o backend';
  }

  private readSettings(schemaJson: Record<string, unknown>) {
    const settings = (schemaJson['settings'] as Record<string, unknown> | undefined) ?? {};
    const options = (settings['options'] as Record<string, unknown> | undefined) ?? {};
    const design = (settings['design'] as Record<string, unknown> | undefined) ?? {};
    const visualStyle = (settings['visualStyle'] as Record<string, unknown> | undefined) ?? {};
    const pdfExport = (settings['pdfExport'] as Record<string, unknown> | undefined) ?? {};
    const canvasLayout = (settings['canvasLayout'] as Record<string, unknown> | undefined) ?? {};
    const freeLayout = (settings['freeLayout'] as Record<string, unknown> | undefined) ?? {};
    this.templatePhase = (settings['phase'] as TemplatePhase | undefined) ?? 'PRE_BODA';
    this.estimatedMinutes = Number(settings['estimatedMinutes'] ?? 120);
    this.tagsInput = Array.isArray(settings['tags']) ? (settings['tags'] as string[]).join(', ') : '';
    this.quickAiPrompt = (settings['aiPrompt'] as string | undefined) ?? '';
    this.enableBudgetAlerts = Boolean(options['budgetAlerts'] ?? true);
    this.enableGuestCare = Boolean(options['guestCare'] ?? true);
    this.enableVendorOps = Boolean(options['vendorOps'] ?? true);
    this.designFontFamily =
      (design['fontFamily'] as string | undefined) ?? this.designFontFamily;
    this.designTitleFontFamily =
      (design['titleFontFamily'] as string | undefined) ?? this.designTitleFontFamily;
    this.designPrimaryColor =
      (design['primaryColor'] as string | undefined) ?? this.designPrimaryColor;
    this.designAccentColor =
      (design['accentColor'] as string | undefined) ?? this.designAccentColor;
    this.designPageBackground =
      (design['pageBackground'] as string | undefined) ?? this.designPageBackground;
    this.designHeroImageUrl =
      (design['heroImageUrl'] as string | undefined) ?? this.designHeroImageUrl;
    this.designLogoImageUrl =
      (design['logoImageUrl'] as string | undefined) ?? this.designLogoImageUrl;
    this.designCompactMode = Boolean(design['compactMode'] ?? this.designCompactMode);
    this.visualStylePreset =
      (visualStyle['preset'] as VisualStylePreset | undefined) ?? this.visualStylePreset;
    this.visualSurfaceBackground =
      (visualStyle['surfaceBackground'] as string | undefined) ?? this.visualSurfaceBackground;
    this.visualTextColor = (visualStyle['textColor'] as string | undefined) ?? this.visualTextColor;
    this.visualMutedTextColor =
      (visualStyle['mutedTextColor'] as string | undefined) ?? this.visualMutedTextColor;
    this.visualCardBackground =
      (visualStyle['cardBackground'] as string | undefined) ?? this.visualCardBackground;
    this.visualCardBorderColor =
      (visualStyle['cardBorderColor'] as string | undefined) ?? this.visualCardBorderColor;
    this.visualHeroOverlay =
      (visualStyle['heroOverlay'] as string | undefined) ?? this.visualHeroOverlay;
    this.visualBorderRadius = Number(visualStyle['borderRadius'] ?? this.visualBorderRadius);
    this.visualCardRadius = Number(visualStyle['cardRadius'] ?? this.visualCardRadius);
    this.visualCardGap = Number(visualStyle['cardGap'] ?? this.visualCardGap);
    this.visualCardShadow = (visualStyle['cardShadow'] as string | undefined) ?? this.visualCardShadow;
    this.visualViewportCss = (visualStyle['viewportCss'] as string | undefined) ?? this.visualViewportCss;
    this.visualCardCss = (visualStyle['cardCss'] as string | undefined) ?? this.visualCardCss;
    this.visualHeroCss = (visualStyle['heroCss'] as string | undefined) ?? this.visualHeroCss;
    this.pdfExportPreset = (pdfExport['preset'] as PdfExportPreset | undefined) ?? this.pdfExportPreset;
    this.pdfLayoutMode = (pdfExport['layoutMode'] as 'cards' | 'list' | undefined) ?? this.pdfLayoutMode;
    this.pdfShowToc = Boolean(pdfExport['showToc'] ?? this.pdfShowToc);
    this.pdfShowWatermark = Boolean(pdfExport['showWatermark'] ?? this.pdfShowWatermark);
    this.pdfShowDesignSheet = Boolean(pdfExport['showDesignSheet'] ?? this.pdfShowDesignSheet);
    this.pdfShowGeneratedStamp = Boolean(pdfExport['showGeneratedStamp'] ?? this.pdfShowGeneratedStamp);
    this.pdfWatermarkText = (pdfExport['watermarkText'] as string | undefined) ?? this.pdfWatermarkText;
    this.pdfFooterText = (pdfExport['footerText'] as string | undefined) ?? this.pdfFooterText;
    this.pdfPageFormat = (pdfExport['pageFormat'] as 'A4' | 'Letter' | undefined) ?? this.pdfPageFormat;
    this.pdfDensity = (pdfExport['density'] as 'comfortable' | 'compact' | undefined) ?? this.pdfDensity;
    this.canvasFreeMode = Boolean(canvasLayout['freeMode'] ?? this.canvasFreeMode);
    this.canvasShowGrid = Boolean(canvasLayout['showGrid'] ?? this.canvasShowGrid);
    this.canvasShowSafeMargins = Boolean(canvasLayout['showSafeMargins'] ?? this.canvasShowSafeMargins);
    this.canvasZoom = Number(canvasLayout['zoom'] ?? this.canvasZoom);
    this.canvasGridSnapSize = Number(canvasLayout['gridSnapSize'] ?? this.canvasGridSnapSize);
    this.canvasSectionSnapSize = Number(canvasLayout['sectionSnapSize'] ?? this.canvasSectionSnapSize);
    this.canvasCenterGuideTolerance = Number(canvasLayout['centerGuideTolerance'] ?? this.canvasCenterGuideTolerance);
    this.canvasSectionPositions =
      (canvasLayout['positions'] as Record<string, CanvasSectionPosition> | undefined) ?? this.canvasSectionPositions;
    this.canvasBlankPaperMode = Boolean(freeLayout['blankPaperMode'] ?? this.canvasBlankPaperMode);
    this.freeCanvasPaperPreset =
      (freeLayout['paperPreset'] as 'a4p' | 'a4l' | 'square' | 'tall' | 'custom' | undefined) ?? this.freeCanvasPaperPreset;
    this.freeCanvasPaperWidth = Number(freeLayout['paperWidth'] ?? this.freeCanvasPaperWidth);
    this.freeCanvasPaperHeight = Number(freeLayout['paperHeight'] ?? this.freeCanvasPaperHeight);
    this.canvasShowRulers = Boolean(freeLayout['showRulers'] ?? this.canvasShowRulers);
    this.canvasShowLayerLabels = Boolean(freeLayout['showLayerLabels'] ?? this.canvasShowLayerLabels);
    this.freeLayerNudgeStep = Number(freeLayout['keyboardNudgeStep'] ?? this.freeLayerNudgeStep);
    this.freeLayerFineNudgeStep = Number(freeLayout['keyboardFineNudgeStep'] ?? this.freeLayerFineNudgeStep);
    this.freeLayoutElements =
      (freeLayout['elements'] as FreeLayoutElement[] | undefined)?.map((item, index) => ({
        ...item,
        id: item.id || `free_${index + 1}`,
      })) ?? this.freeLayoutElements;
    this.selectedFreeLayoutElementId = this.freeLayoutElements[0]?.id ?? '';
    this.onCanvasAssistSettingChange();
  }

  private handleFreeLayoutKeyboardShortcuts(event: KeyboardEvent) {
    if (!this.showPreviewCanvas || !this.canvasFreeMode || !this.selectedFreeLayoutElement) return false;
    const target = event.target as HTMLElement | null;
    const isTyping =
      !!target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable);
    const key = event.key;

    if (!isTyping && event.ctrlKey && key.toLowerCase() === 'd') {
      event.preventDefault();
      this.duplicateSelectedFreeLayoutElement();
      return true;
    }
    if (!isTyping && !event.ctrlKey && !event.metaKey && (key === 'Delete' || key === 'Backspace')) {
      event.preventDefault();
      this.deleteSelectedFreeLayoutElement();
      this.statusText = 'Capa eliminada';
      return true;
    }
    if (!isTyping && !event.ctrlKey && !event.metaKey && key.toLowerCase() === 'l') {
      event.preventDefault();
      this.toggleLockSelectedFreeLayoutElement();
      return true;
    }
    if (!isTyping && !event.ctrlKey && !event.metaKey && key.toLowerCase() === 'h') {
      event.preventDefault();
      this.toggleVisibilitySelectedFreeLayoutElement();
      return true;
    }
    if (!isTyping && !event.ctrlKey && !event.metaKey && key === '[') {
      event.preventDefault();
      this.cycleSelectedFreeLayoutLayer(-1);
      return true;
    }
    if (!isTyping && !event.ctrlKey && !event.metaKey && key === ']') {
      event.preventDefault();
      this.cycleSelectedFreeLayoutLayer(1);
      return true;
    }
    if (!isTyping && !event.ctrlKey && !event.metaKey) {
      const mode: 'fine' | 'normal' | 'grid' =
        event.altKey && !event.shiftKey ? 'fine' : event.shiftKey ? 'normal' : 'grid';
      if (key === 'ArrowLeft') {
        event.preventDefault();
        this.nudgeSelectedFreeLayoutElementByStep('left', mode);
        return true;
      }
      if (key === 'ArrowRight') {
        event.preventDefault();
        this.nudgeSelectedFreeLayoutElementByStep('right', mode);
        return true;
      }
      if (key === 'ArrowUp') {
        event.preventDefault();
        this.nudgeSelectedFreeLayoutElementByStep('up', mode);
        return true;
      }
      if (key === 'ArrowDown') {
        event.preventDefault();
        this.nudgeSelectedFreeLayoutElementByStep('down', mode);
        return true;
      }
    }
    return false;
  }

  private parseCssDeclarations(input: string) {
    const style: Record<string, string> = {};
    for (const row of input.split(';')) {
      const line = row.trim();
      if (!line || line.includes('{') || line.includes('}')) continue;
      const colonIndex = line.indexOf(':');
      if (colonIndex <= 0) continue;
      const prop = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      if (!prop || !value) continue;
      style[prop] = value;
    }
    return style;
  }

  private extractHexColor(source: string, fallback: string) {
    const match = source.match(/#(?:[0-9a-fA-F]{3}){1,2}\b/);
    return match?.[0] ?? fallback;
  }

  private canvasSectionLayoutKey(section: TemplateSection, sectionIndex: number) {
    return `${sectionIndex}_${this.slugify(section.title || 'seccion')}`;
  }

  private canvasPositionFor(section: TemplateSection, sectionIndex: number): CanvasSectionPosition {
    const key = this.canvasSectionLayoutKey(section, sectionIndex);
    const current = this.canvasSectionPositions[key];
    if (current) return current;
    const col = sectionIndex % 2;
    const row = Math.floor(sectionIndex / 2);
    return { x: col * 360, y: row * 230 };
  }

  private makeSection(title: string, fields: string[]): TemplateSection {
    return {
      title,
      description: 'Bloque premium con datos reales para ejecucion wedding planner.',
      fields: fields.map((label, index) => ({
        key: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${index + 1}`,
        label,
        type: this.inferTypeFromLabel(label),
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

  private inferTypeFromLabel(label: string): string {
    const clean = (label || '').toLowerCase();
    if (/(fecha|vencimiento)/.test(clean)) return 'date';
    if (/(hora|timing)/.test(clean)) return 'time';
    if (/(coste|importe|pago|presupuesto)/.test(clean)) return 'currency';
    if (/(estado|prioridad|menu|rsvp)/.test(clean)) return 'select';
    if (/(nota|observacion|guion|comentario)/.test(clean)) return 'textarea';
    if (/(confirmad|aprobacion|check|riesgo|plan)/.test(clean)) return 'checkbox';
    return 'text';
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
        { key: 'importe_previsto_aprobado', label: 'Importe previsto aprobado', type: 'currency', required: true },
        { key: 'importe_real_facturado', label: 'Importe real facturado', type: 'currency', required: true },
        { key: 'desviacion_presupuestaria', label: 'Desviacion presupuestaria', type: 'currency', required: false },
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
      { key: 'responsable_asignado', label: 'Responsable asignado', type: 'text', required: true },
      { key: 'fecha_compromiso', label: 'Fecha compromiso', type: 'date', required: false },
      { key: 'estado_avance', label: 'Estado de avance', type: 'select', required: false },
    ];
  }

  private readSections(schemaJson: Record<string, unknown>) {
    const raw = (schemaJson['sections'] as TemplateSection[] | undefined) ?? [];
    if (!raw.length) {
      return [
        {
          title: 'Coordinacion principal',
          fields: [{ key: 'responsable_principal_evento', label: 'Responsable principal del evento', type: 'text' }],
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
