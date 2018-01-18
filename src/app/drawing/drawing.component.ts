import { Point } from '../domain/point';
import { SampleGroup } from '../domain/samplegroup';
import { SamplesService } from '../services/samples.service';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import {TrainingService} from "../services/training.service";

@Component({
  selector: 'app-drawing',
  templateUrl: './drawing.component.html',
  styleUrls: ['./drawing.component.css']
})
export class DrawingComponent implements OnInit {

  @ViewChild('canvas') canvasRef: ElementRef;
  private cx: CanvasRenderingContext2D;
  private isDrawing: Boolean = false;

  sampleGroups: SampleGroup[] = [];

  constructor(private samplesService: SamplesService, private trainingService: TrainingService) { }

  ngOnInit() {
    this.fitToContainer(this.canvasRef.nativeElement);
    this.cx = this.canvasRef.nativeElement.getContext('2d');

    this.trainingService.result$.subscribe(res => {
        this.onClear();
        this.drawChar(res);
        setTimeout(() => {
            this.onClear()
        }, 1000);
    })
  }

  fitToContainer(canvas) {
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }

  onDown() {
    this.isDrawing = true;
  }

  onUp() {
    this.isDrawing = false;
  }

  onMove(src: MouseEvent) {
    if (!this.isDrawing) { return; }

    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    this.draw({
      x: src.clientX - rect.left,
      y: src.clientY - rect.top
    });
  }

  private draw(point: Point) {
    this.samplesService.points.push(point);

    this.cx.beginPath();
    this.cx.arc(point.x, point.y, 3, 0, 2 * Math.PI, false);
    this.cx.fillStyle = 'black';
    this.cx.fill();
  }

  onTouchMove(src: TouchEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    this.draw({
      x: src.touches.item(0).clientX - rect.left,
      y: src.touches.item(0).clientY - rect.top
    });
  }

  onClear() {
    this.samplesService.points = [];
    this.cx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);
  }

  addSample(letter: string) {
    this.samplesService.addSample({letter: letter, points: this.samplesService.points});
    this.onClear();
    this.sampleGroups = this.samplesService.sampleGroups;
  }

  drawChar(letter: string) {
      this.cx.textBaseline = 'middle';
      this.cx.textAlign = 'center';

      this.cx.canvas.height;
      this.cx.font = Math.floor(this.cx.canvas.height/2) + "px Arial";

      this.cx.fillText(letter, this.cx.canvas.width/2, this.cx.canvas.height/2);
  }
}
