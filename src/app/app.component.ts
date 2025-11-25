
import { Component, computed, inject, OnDestroy, Renderer2, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { filter, Subject, takeUntil } from 'rxjs';
import { FooterComponent } from './components/shared/footer/footer.component';
import { HeaderComponent } from './components/shared/header/header.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    InputTextModule,
    ButtonModule,
    MessageModule,
    FormsModule,
    ToggleButtonModule,
    FluidModule,
    ToastModule,
    HeaderComponent,
    FooterComponent
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  providers: [MessageService],
})
export class AppComponent implements OnDestroy {
  private renderer = inject(Renderer2);
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  private currentRoute = '';

  isDarkModeEnabled = signal(false);
  darkModeIcon = computed(() => (this.isDarkModeEnabled() ? 'pi pi-sun' : 'pi pi-moon'));

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
