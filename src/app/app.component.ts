import { CommonModule } from '@angular/common';
import { Component, computed, inject, Renderer2, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { FluidModule } from 'primeng/fluid';

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
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
})
export class AppComponent {
  private renderer = inject(Renderer2);

  isDarkModeEnabled = signal(false);
  darkModeIcon = computed(() =>
    this.isDarkModeEnabled() ? 'pi pi-sun' : 'pi pi-moon',
  );

  title = 'Plejlista357';
  text = '';
  msg = '';

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
