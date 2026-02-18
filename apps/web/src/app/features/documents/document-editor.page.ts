import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-document-editor-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="document-editor-view" *ngIf="sections.length; else loadingTpl">
      <header class="page-head">
        <div>
          <p class="kicker">Document studio</p>
          <h1>{{ title }}</h1>
          <p class="muted-copy">Rellena y guarda automaticamente cada bloque de la plantilla.</p>
        </div>
        <div class="head-stat" [class.warn]="saveState !== 'Guardado'">
          <span>Estado</span>
          <strong>{{ saveState }}</strong>
        </div>
      </header>

      <form [formGroup]="form" class="document-editor-grid panel-card">
        <section *ngFor="let section of sections" class="editor-section-card">
          <header class="section-header">
            <h3>{{ section.title }}</h3>
            <span>{{ section.fields.length }} campos</span>
          </header>

          <div class="document-fields-grid">
            <div *ngFor="let field of section.fields" class="field-row">
              <label>{{ field.label }}</label>

              <ng-container [ngSwitch]="field.type">
                <input *ngSwitchCase="'text'" [formControlName]="field.key" type="text" />
                <input *ngSwitchCase="'currency'" [formControlName]="field.key" type="number" />
                <input *ngSwitchCase="'time'" [formControlName]="field.key" type="time" />
                <input *ngSwitchCase="'date'" [formControlName]="field.key" type="date" />
                <input *ngSwitchCase="'number'" [formControlName]="field.key" type="number" />
                <textarea *ngSwitchCase="'textarea'" [formControlName]="field.key" rows="3"></textarea>
                <select *ngSwitchCase="'select'" [formControlName]="field.key">
                  <option value="">Selecciona estado</option>
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="done">Completado</option>
                </select>
                <label *ngSwitchCase="'checkbox'" class="check-row">
                  <input [formControlName]="field.key" type="checkbox" />
                  <span>Completado</span>
                </label>
                <input *ngSwitchDefault [formControlName]="field.key" type="text" />
              </ng-container>
            </div>
          </div>
        </section>
      </form>
    </section>

    <ng-template #loadingTpl>
      <section class="empty-state">
        <h3>Cargando documento...</h3>
      </section>
    </ng-template>
  `,
})
export class DocumentEditorPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  documentId = '';
  title = 'Document';
  saveState = 'Cargando...';
  sections: Array<{ title: string; fields: Array<{ key: string; label: string; type: string }> }> = [];

  form: FormGroup<Record<string, FormControl<unknown>>> = this.fb.group({});

  ngOnInit() {
    this.documentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<any>(`http://localhost:3000/api/v1/documents/${this.documentId}`).subscribe((doc) => {
      this.title = doc.name;

      const schema = (doc.template?.schemaJson ?? { sections: [] }) as {
        sections: Array<{ title: string; fields: Array<{ key: string; label: string; type: string }> }>;
      };

      this.sections = schema.sections ?? [];
      const controls: Record<string, FormControl<unknown>> = {};

      for (const section of this.sections) {
        for (const field of section.fields) {
          const initialValue = doc.dataJson?.[field.key] ?? this.defaultValueForType(field.type);
          controls[field.key] = new FormControl(initialValue);
        }
      }

      this.form = this.fb.group(controls);
      this.setupAutosave();
      this.saveState = 'Guardado';
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupAutosave() {
    this.form.valueChanges
      .pipe(debounceTime(800), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => {
        this.saveState = 'Guardando...';
        this.http
          .patch(`http://localhost:3000/api/v1/documents/${this.documentId}`, {
            dataJson: value,
          })
          .subscribe({
            next: () => (this.saveState = 'Guardado'),
            error: () => (this.saveState = 'Error al guardar'),
          });
      });
  }

  private defaultValueForType(type: string) {
    if (type === 'checkbox') {
      return false;
    }
    return '';
  }
}
