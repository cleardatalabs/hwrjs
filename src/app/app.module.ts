import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { DrawingComponent } from './drawing/drawing.component';
import { SamplesService } from './services/samples.service';
import { TrainingService } from './services/training.service';
import { TrainingComponent } from './training/training.component';

@NgModule({
  declarations: [
    AppComponent,
    DrawingComponent,
    TrainingComponent
  ],
  imports: [
    BrowserModule,
    FormsModule
  ],
  providers: [SamplesService, TrainingService],
  bootstrap: [AppComponent]
})
export class AppModule { }
