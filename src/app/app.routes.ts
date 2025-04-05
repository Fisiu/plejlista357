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
    loadComponent: () => import('./components/lists/weekly/weekly.component').then((c) => c.WeeklyComponent),
  },
  {
    path: 'top',
    title: 'Top Wszechczasów',
    loadComponent: () => import('./components/lists/top/top.component').then((c) => c.TopComponent),
  },
  { path: '404', component: NotFoundComponent },
  { path: '**', redirectTo: '/404' },
];
