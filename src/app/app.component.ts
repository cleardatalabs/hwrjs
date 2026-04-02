import { Component } from '@angular/core';
import { DrawingComponent } from './drawing/drawing.component';
import { TrainingComponent } from './training/training.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DrawingComponent, TrainingComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
}
