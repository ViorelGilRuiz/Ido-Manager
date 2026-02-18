import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { TemplateModel, TemplateType } from '../../shared/models';

type TemplateField = {
  key: string;
  label: string;
  type: string;
};

type TemplateSection = {
  title: string;
  fields: TemplateField[];
};

@Component({
  selector: 'app-template-editor-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="template-editor-view" *ngIf="loaded; else loadingTpl">
      <header class="page-head">
        <div>
          <p class="kicker">Editor</p>
          <h1>Diseno de template</h1>
          <p class="muted-copy">Edita estructura con guardado automatico cada 900ms.</p>
        </div>
        <div class="head-stat editor-status" [class.warn]="hasPendingChanges">
          <span>{{ hasPendingChanges ? 'Pendiente' : 'Estado' }}</span>
          <strong>{{ hasPendingChanges ? 'Sin guardar' : 'Al dia' }}</strong>
        </div>
      </header>

      <section class="editor-grid-layout">
        <article class="panel-card">
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
        </article>

        <article class="panel-card">
          <div class="panel-head">
            <h3>Estructura</h3>
            <button type="button" class="ghost-btn" (click)="addSection()">+ Seccion</button>
          </div>

          <section class="section-stack" *ngIf="sections.length; else noSections">
            <article class="section-card" *ngFor="let section of sections; let si = index">
              <div class="panel-head">
                <input [(ngModel)]="section.title" (ngModelChange)="onDraftChange()" placeholder="Titulo" />
                <div class="tiny-actions">
                  <button type="button" class="ghost-btn" (click)="moveSection(si, -1)" [disabled]="si===0">↑</button>
                  <button type="button" class="ghost-btn" (click)="moveSection(si, 1)" [disabled]="si===sections.length-1">↓</button>
                  <button type="button" class="ghost-btn" (click)="duplicateSection(si)">Dup</button>
                  <button type="button" class="ghost-btn" (click)="removeSection(si)">X</button>
                </div>
              </div>

              <div class="field-stack">
                <div class="field-row-builder" *ngFor="let field of section.fields; let fi = index">
                  <input [(ngModel)]="field.key" (ngModelChange)="onDraftChange()" placeholder="key" />
                  <input [(ngModel)]="field.label" (ngModelChange)="onDraftChange()" placeholder="label" />
                  <select [(ngModel)]="field.type" (ngModelChange)="onDraftChange()">
                    <option *ngFor="let ft of fieldTypes" [value]="ft">{{ ft }}</option>
                  </select>
                  <div class="tiny-actions">
                    <button type="button" class="ghost-btn" (click)="moveField(si, fi, -1)" [disabled]="fi===0">↑</button>
                    <button type="button" class="ghost-btn" (click)="moveField(si, fi, 1)" [disabled]="fi===section.fields.length-1">↓</button>
                    <button type="button" class="ghost-btn" (click)="duplicateField(si, fi)">+</button>
                    <button type="button" class="ghost-btn" (click)="removeField(si, fi)">-</button>
                  </div>
                </div>
              </div>

              <button type="button" class="ghost-btn" (click)="addField(si)">+ Campo</button>
            </article>
          </section>

          <ng-template #noSections>
            <p class="muted-copy">Aun no hay secciones.</p>
          </ng-template>
        </article>

        <article class="panel-card">
          <h3>Preview rapido</h3>
          <div class="preview-stack" *ngIf="sections.length">
            <div class="preview-section" *ngFor="let section of sections">
              <strong>{{ section.title || 'Seccion sin titulo' }}</strong>
              <ul>
                <li *ngFor="let field of section.fields">{{ field.label || 'Campo' }} · {{ field.type }}</li>
              </ul>
            </div>
          </div>
        </article>
      </section>

      <section class="actions-row">
        <button type="button" (click)="save()" [disabled]="saving">{{ saving ? 'Guardando...' : 'Guardar ahora' }}</button>
        <a routerLink="/app/templates" class="ghost-btn action-link">Volver</a>
        <span class="save-status" *ngIf="statusText">{{ statusText }}</span>
      </section>
    </section>

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

  loaded = false;
  saving = false;
  statusText = '';
  hasPendingChanges = false;
  templateId = '';

  types: TemplateType[] = ['CHECKLIST', 'TIMELINE', 'BUDGET', 'GUEST_LIST', 'VENDOR_LIST'];
  fieldTypes = ['text', 'checkbox', 'currency', 'time', 'number', 'textarea', 'date', 'select'];

  draftName = '';
  draftType: TemplateType = 'CHECKLIST';
  draftDescription = '';
  sections: TemplateSection[] = [];

  ngOnInit() {
    this.subscriptions.add(this.draftChanges$.pipe(debounceTime(900)).subscribe(() => this.save()));

    this.templateId = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<TemplateModel>(`http://localhost:3000/api/v1/templates/${this.templateId}`).subscribe({
      next: (template) => {
        this.draftName = template.name;
        this.draftType = template.type;
        this.draftDescription = template.description ?? '';
        this.sections = this.readSections(template.schemaJson);
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
  }

  onDraftChange() {
    if (!this.loaded) return;
    this.hasPendingChanges = true;
    this.statusText = 'Editando...';
    this.draftChanges$.next();
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

  addSection() {
    this.sections.push({ title: 'Nueva seccion', fields: [{ key: 'nuevo_campo', label: 'Nuevo campo', type: 'text' }] });
    this.onDraftChange();
  }

  duplicateSection(index: number) {
    const clone = structuredClone(this.sections[index]);
    clone.title = `${clone.title} copia`;
    this.sections.splice(index + 1, 0, clone);
    this.onDraftChange();
  }

  moveSection(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= this.sections.length) return;
    const [item] = this.sections.splice(index, 1);
    this.sections.splice(target, 0, item);
    this.onDraftChange();
  }

  removeSection(index: number) {
    this.sections.splice(index, 1);
    this.onDraftChange();
  }

  addField(sectionIndex: number) {
    this.sections[sectionIndex].fields.push({ key: `campo_${this.sections[sectionIndex].fields.length + 1}`, label: 'Campo', type: 'text' });
    this.onDraftChange();
  }

  duplicateField(sectionIndex: number, fieldIndex: number) {
    const clone = structuredClone(this.sections[sectionIndex].fields[fieldIndex]);
    clone.key = `${clone.key}_copy`;
    this.sections[sectionIndex].fields.splice(fieldIndex + 1, 0, clone);
    this.onDraftChange();
  }

  moveField(sectionIndex: number, fieldIndex: number, direction: -1 | 1) {
    const fields = this.sections[sectionIndex].fields;
    const target = fieldIndex + direction;
    if (target < 0 || target >= fields.length) return;
    const [item] = fields.splice(fieldIndex, 1);
    fields.splice(target, 0, item);
    this.onDraftChange();
  }

  removeField(sectionIndex: number, fieldIndex: number) {
    this.sections[sectionIndex].fields.splice(fieldIndex, 1);
    this.onDraftChange();
  }

  toLabel(value: string) {
    return value.replace('_', ' ');
  }

  private readSections(schemaJson: Record<string, unknown>) {
    const raw = (schemaJson['sections'] as TemplateSection[] | undefined) ?? [];
    if (!raw.length) {
      return [{ title: 'Seccion principal', fields: [{ key: 'campo_1', label: 'Campo 1', type: 'text' }] }];
    }
    return raw.map((section) => ({
      title: section.title,
      fields: (section.fields ?? []).map((field) => ({ key: field.key, label: field.label, type: field.type })),
    }));
  }
}
