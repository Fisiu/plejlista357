
import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-numbered-text-area',
  imports: [TextareaModule, ScrollPanelModule],
  templateUrl: './numbered-text-area.component.html',
  styleUrl: './numbered-text-area.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class NumberedTextAreaComponent implements OnInit {
  @Input() lines: string[] = [];

  ngOnInit(): void {
    if (this.lines.length === 0) {
      this.lines = [''];
    }
  }
}
