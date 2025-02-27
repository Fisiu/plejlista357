import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';

@Component({
  selector: 'app-header',
  imports: [MenubarModule, ButtonModule, CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit {
  menuItems: MenuItem[] = [];

  ngOnInit(): void {
    this.menuItems = [
      {
        label: 'Home',
        icon: 'pi pi-home',
        styleClass: 'font-medium text-gray-700 hover:text-primary',
      },
      {
        label: 'Features',
        icon: 'pi pi-star',
        styleClass: 'font-medium text-gray-700 hover:text-primary',
      },
      {
        label: 'Pricing',
        icon: 'pi pi-tag',
        styleClass: 'font-medium text-gray-700 hover:text-primary',
      },
      {
        label: 'About',
        icon: 'pi pi-info-circle',
        styleClass: 'font-medium text-gray-700 hover:text-primary',
      },
      {
        label: 'Contact',
        icon: 'pi pi-envelope',
        styleClass: 'font-medium text-gray-700 hover:text-primary',
      },
    ];
  }
}
