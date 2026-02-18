import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginPageComponent } from './features/auth/login.page';
import { RegisterPageComponent } from './features/auth/register.page';
import { DashboardPageComponent } from './features/dashboard/dashboard.page';
import { DocumentEditorPageComponent } from './features/documents/document-editor.page';
import { EventDetailPageComponent } from './features/events/event-detail.page';
import { EventsPageComponent } from './features/events/events.page';
import { PrivateLayoutComponent } from './features/layout/private-layout.component';
import { TemplateEditorPageComponent } from './features/templates/template-editor.page';
import { TemplatesPageComponent } from './features/templates/templates.page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  {
    path: 'app',
    component: PrivateLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: DashboardPageComponent },
      {
        path: 'templates',
        component: TemplatesPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'templates/:id',
        component: TemplateEditorPageComponent,
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },
      { path: 'events', component: EventsPageComponent },
      { path: 'events/:id', component: EventDetailPageComponent },
      { path: 'documents/:id', component: DocumentEditorPageComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
