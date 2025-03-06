import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  OnDestroy,
  Renderer2,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { filter, Subject, takeUntil } from 'rxjs';
import { SharedModule } from './components/shared/shared.module';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    InputTextModule,
    ButtonModule,
    MessageModule,
    FormsModule,
    ToggleButtonModule,
    FluidModule,
    SharedModule,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
})
export class AppComponent implements OnDestroy {
  private renderer = inject(Renderer2);
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  private currentRoute = '';

  isDarkModeEnabled = signal(false);
  darkModeIcon = computed(() =>
    this.isDarkModeEnabled() ? 'pi pi-sun' : 'pi pi-moon',
  );

  title = 'Plejlista357';
  text = '';
  msg = '';

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe((event) => {
        if (event instanceof NavigationEnd) {
          this.currentRoute = event.urlAfterRedirects || event.url;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isNotNotFoundPage(): boolean {
    console.log(this.currentRoute);

    return this.currentRoute === '/404';
  }

  onClick() {
    this.msg = 'Welcome ' + this.text;
  }

  toggleTheme() {
    if (this.isDarkModeEnabled()) {
      this.renderer.removeClass(document.documentElement, 'app-dark');
    } else {
      this.renderer.addClass(document.documentElement, 'app-dark');
    }

    this.isDarkModeEnabled.update((mode) => !mode);
  }
}
