import { Point } from '../domain/point';
import { SampleGroup } from '../domain/samplegroup';
import { SamplesService } from '../services/samples.service';
import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { NgFor } from '@angular/common';
import { TrainingService } from '../services/training.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-drawing',
  standalone: true,
  imports: [NgFor],
  templateUrl: './drawing.component.html',
  styleUrls: ['./drawing.component.css']
})
export class DrawingComponent implements OnInit, OnDestroy {

  @ViewChild('canvas', { static: true }) canvasRef: ElementRef;
  private cx: CanvasRenderingContext2D;
  private isDrawing = false;
  private lastPoint: Point | null = null;
  private resultSubscription: Subscription;

  sampleGroups: SampleGroup[] = [];

  constructor(private samplesService: SamplesService, private trainingService: TrainingService) { }

  ngOnInit() {
    this.fitToContainer();
    this.cx = this.canvasRef.nativeElement.getContext('2d');

    this.resultSubscription = this.trainingService.result$.subscribe(res => {
      this.onClear();
      this.drawChar(res);
      setTimeout(() => {
        this.onClear();
      }, 1500);
    });
  }

  ngOnDestroy() {
    this.resultSubscription.unsubscribe();
  }

  fitToContainer() {
    const canvas = this.canvasRef.nativeElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    if (canvas.width !== canvas.offsetWidth) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
  }

  onDown() {
    this.isDrawing = true;
  }

  onUp() {
    this.isDrawing = false;
    this.lastPoint = null;
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
    this.cx.lineWidth = 10;
    this.cx.lineCap = 'round';

    if (this.lastPoint) {
      this.cx.moveTo(this.lastPoint.x, this.lastPoint.y);
    }

    this.cx.lineTo(point.x, point.y);
    this.lastPoint = point;

    this.cx.stroke();
  }

  onTouchMove(src: TouchEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    this.draw({
      x: src.touches.item(0).clientX - rect.left,
      y: src.touches.item(0).clientY - rect.top
    });

    src.preventDefault();
  }

  onClear() {
    this.samplesService.points = [];
    this.cx.clearRect(0, 0, this.canvasRef.nativeElement.width, this.canvasRef.nativeElement.height);

    for (let i = 0; i < this.sampleGroups.length; i++) {
      this.sampleGroups[i].out = 0;
    }
  }

  addSample(letter: string) {
    this.samplesService.addSample({ letter: letter, points: this.samplesService.points });
    this.onClear();
    this.sampleGroups = this.samplesService.sampleGroups;
  }

  drawChar(letter: string) {
    this.cx.textBaseline = 'middle';
    this.cx.textAlign = 'center';
    this.cx.font = Math.floor(this.cx.canvas.height * 0.75) + 'px Arial';
    this.cx.fillText(letter, this.cx.canvas.width / 2, this.cx.canvas.height / 2);

    for (let i = 0; i < this.sampleGroups.length; i++) {
      this.sampleGroups[i].out = 100 *
        this.trainingService.net.layers[this.trainingService.net.layers.length - 1].getOutputs()[i];
    }
  }
}
