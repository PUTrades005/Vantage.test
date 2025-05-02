import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent }, // Home page
  { path: 'dashboard', component: DashboardComponent }, // /dashboard path
];
