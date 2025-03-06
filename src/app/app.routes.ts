import { Routes } from '@angular/router';
import { HelloComponent } from './components/hello/hello.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

export const routes: Routes = [
  {
    path: '',
    title: 'Hello',
    pathMatch: 'full',
    component: HelloComponent,
  },
  {
    path: 'weekly',
    title: 'Lista',
    loadComponent: () =>
      import('./components/lists/weekly/weekly.component').then(
        (c) => c.WeeklyComponent,
      ),
  },
  {
    path: 'top',
    title: 'Top',
    loadComponent: () =>
      import('./components/lists/top/top.component').then(
        (c) => c.TopComponent,
      ),
  },
  { path: '404', component: NotFoundComponent },
  { path: '**', redirectTo: '/404' },
];
