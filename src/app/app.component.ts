import {Component, OnInit, ViewChild} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {NgForOf, NgIf} from "@angular/common";
import {CanvasJSAngularChartsModule} from "@canvasjs/angular-charts";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgIf, NgForOf, CanvasJSAngularChartsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'DSAPP';
  serialSupported = false;
  protected port: any;
  protected state: string;
  data: {label: string, y: number}[] = [];
  reader: any;
  reading: boolean = false;

  // @ts-ignore
  protected protected serial = navigator.serial;

  chart: any;

  chartOptions = {
    zoomEnabled: true,
    exportEnabled: true,
    data: [{
      type: "line",
      dataPoints: []
    }]
  };

  constructor() {

    this.state = "DISCONNECTED";

  }

  ngOnInit(): void {

    console.log(this.serial);

    if (this.serial) this.serialSupported = true;

  }

  requestPort() {

    this.serial.requestPort().then(
      (port: any) => {
        this.state = "CONNECTABLE";
        this.port = port;
      }
    );

  }

  connectToPort() {

    let config = {
      baudRate: 4800,
      dataBits: 8,
      stopBits: 1,
      parity: "none"
    }

    if (this.port) {

      this.port.open(config).then(
        () => {
          this.state = "CONNECTED";

          this.reading = true;

          this.data = [];

          while (this.port.readable && this.reading) {
            this.reader = this.port.readable.getReader();
            const decoder = new TextDecoder('utf-8');

            const readLoop = () => {
              // @ts-ignore
              this.reader.read().then(({ value, done }) => {
                if (done || !this.reading) {

                  this.reader.releaseLock();
                  return;
                }
                if (value) {

                  let newData = decoder.decode(value.buffer).split("\r\n").map(data => ({
                    label: (new Date()).toLocaleTimeString(),
                    y: +data
                  }));

                  newData.pop();

                  this.data.push(...newData);

                  // @ts-ignore
                  this.chartOptions.data[0].dataPoints = this.data;

                  this.chart.render();

                }
                readLoop();
              }).catch((error: any) => {
                console.error(error);
              });
            }

            if (this.port.readable) {
              readLoop();
            }

          }

        }
      )

      this.port.addEventListener('disconnect', () => {
        this.handleDisconnect();
        this.state = "DISCONNECTED";
        this.port = undefined;
      });

    }
  }

  handleDisconnect() {

    this.reading = false;
    this.reader.releaseLock();
    this.reader.cancel();
    this.data = [];

  }

  disconnectFromPort() {
    if (this.port) {
      this.port.forget().then(
        () => {
          this.state = "DISCONNECTED";
          this.port = undefined;
          this.handleDisconnect();
          this.flushData();
        }
      );
    }
  }

  flushData() {

    this.data = [];
    this.chart.render();

  }

  getChartInstance(chart: object) {
    this.chart = chart;
  }
}
