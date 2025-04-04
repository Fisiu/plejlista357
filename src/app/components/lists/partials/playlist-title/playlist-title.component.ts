import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { DialogData } from 'src/app/services/spotify-playlist.model';

@Component({
  selector: 'app-playlist-title',
  imports: [FormsModule, InputTextModule],
  templateUrl: './playlist-title.component.html',
  styleUrl: './playlist-title.component.scss',
})
export class PlaylistTitleComponent {
  private readonly config = inject(DynamicDialogConfig);

  playlistName = signal<string>('');

  constructor() {
    const data: DialogData = this.config.data;
    this.playlistName.set(data.chartTitle);
  }
}
