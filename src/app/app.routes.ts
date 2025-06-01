import { Routes } from '@angular/router';
import { CallbackComponent } from './components/callback/callback.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

export const routes: Routes = [
  {
    path: '',
    title: 'Hello',
    pathMatch: 'full',
    redirectTo: '/weekly',
  },
  { path: 'callback', component: CallbackComponent },
  {
    path: 'weekly',
    title: 'Lista Piosenek 357',
    loadComponent: () =>
      import('./components/lists/generic-chart/generic-chart.component').then((c) => c.GenericChartComponent),
    data: { chartType: 'weekly' },
  },
  {
    path: 'top',
    title: 'Top Radia 357',
    loadComponent: () =>
      import('./components/lists/generic-chart/generic-chart.component').then((c) => c.GenericChartComponent),
    data: { chartType: 'top' },
  },
  {
    path: 'top-pl',
    title: 'Polski Top Radia 357',
    loadComponent: () =>
      import('./components/lists/generic-chart/generic-chart.component').then((c) => c.GenericChartComponent),
    data: { chartType: 'top-pl' },
  },
  { path: '404', component: NotFoundComponent },
  { path: '**', redirectTo: '/404' },
];
