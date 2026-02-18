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
    <h1>{{ title }}</h1>
    <p>{{ saveState }}</p>

    <form [formGroup]="form" class="editor-grid" *ngIf="sections.length">
      <section *ngFor="let section of sections" class="editor-section">
        <h2>{{ section.title }}</h2>
        <div *ngFor="let field of section.fields" class="field-row">
          <label>{{ field.label }}</label>

          <input *ngIf="field.type === 'text'" [formControlName]="field.key" type="text" />
          <input *ngIf="field.type === 'currency'" [formControlName]="field.key" type="number" />
          <input *ngIf="field.type === 'time'" [formControlName]="field.key" type="time" />
          <input *ngIf="field.type === 'checkbox'" [formControlName]="field.key" type="checkbox" />
        </div>
      </section>
    </form>
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
