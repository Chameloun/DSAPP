import {Component, OnInit, ViewChild} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {NgForOf, NgIf} from "@angular/common";
import {BaseChartDirective} from "ng2-charts";
import { ChartConfiguration, ChartOptions, ChartType } from "chart.js";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgIf, NgForOf, BaseChartDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'DSAPP';
  serialSupported = false;
  protected port: any;
  protected state: string;
  data: {time: string, data: number}[] = [];
  reader: any;
  reading: boolean = false;

  // @ts-ignore
  protected protected serial = navigator.serial;

  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: [
      {
        data: [],
        label: "Diameter [mm]",
        tension: 0.5,
        animation: false,
        pointRadius: 0,
      }
    ]
  };
  public lineChartOptions: ChartOptions<'line'> = {
    responsive: false,
  };
  public lineChartLegend = true;

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
                    time: (new Date()).toLocaleTimeString(),
                    data: +data
                  }));

                  newData.pop();

                  this.data.push(...newData);

                  this.lineChartData.labels = this.data.map(item => item.time);
                  this.lineChartData.datasets[0].data = this.data.map(item => item.data);

                  this.chart?.update();

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

    this.lineChartData.labels = [];
    this.lineChartData.datasets[0].data = [];
    this.data = [];

  }

}
