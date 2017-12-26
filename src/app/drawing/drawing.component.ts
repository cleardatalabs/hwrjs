import { Point } from '../domain/point';
import { Sample } from '../domain/sample';
import { SampleGroup } from '../domain/samplegroup';
import { SamplesService } from '../services/samples.service';
import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';

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

  constructor(private samplesService: SamplesService) { }

  ngOnInit() {
    this.fitToContainer(this.canvasRef.nativeElement);
    this.cx = this.canvasRef.nativeElement.getContext('2d');
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
    // alert(letter + ' ' + this.points.length + ' ' + this.samplesService.sampleGroups.length);
  }
}
