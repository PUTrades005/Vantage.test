import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { ApiService, TimeSeriesDaily } from '../services/api.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas', { static: false }) private chartCanvas!: ElementRef<HTMLCanvasElement>;
  private chart!: Chart<'line'>;

  public loading = false;
  public error: string | null = null;
  public stocks: { symbol: string; price: number }[] = [];
  public failedSymbols: string[] = [];
  public series: TimeSeriesDaily[] = [];
  public symbol = 'MSFT';
  public searchSymbol: string = ''; // <-- Add this line

  private symbols = ['AAPL', 'GOOG', 'MSFT'];
  private api = inject(ApiService);

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
  }

  private initChart(): void {
    const canvas = this.chartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.error = 'Unable to initialize chart context';
      return;
    }
    const labels = this.series.map(s => s.date).reverse();
    const prices = this.series.map(s => s.close).reverse();
    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Stock Price',
          data: prices,
          borderColor: 'blue',
          fill: false
        }]
      },
      options: { responsive: true }
    };
    this.chart = new Chart(ctx, config);
  }

  public loadData(): void {
    this.loading = true;
    this.error = null;
    this.series = [];
    this.api.getDailyTimeSeries('MSFT').subscribe({
      next: (data: TimeSeriesDaily[]) => {
        this.series = data;
        this.loading = false;
        setTimeout(() => this.initChart());
      },
      error: () => {
        this.error = 'Failed to load data';
        this.loading = false;
      }
    });
  }

  public onSearch(): void {
    if (!this.searchSymbol.trim()) return;
    this.symbol = this.searchSymbol.trim().toUpperCase();
    this.loading = true;
    this.error = null;
    this.series = [];
    this.api.getDailyTimeSeries(this.symbol).subscribe({
      next: (data: TimeSeriesDaily[]) => {
        console.log('API data:', data); // <-- Add this line
        this.series = data;
        this.loading = false;
        setTimeout(() => this.initChart());
      },
      error: () => {
        this.error = 'Failed to load data';
        this.loading = false;
      }
    });
  }

  private checkDataLoaded(): void {
    if (this.stocks.length + this.failedSymbols.length === this.symbols.length) {
      this.loading = false;
      setTimeout(() => {
        if (this.stocks.length > 0) {
          if (!this.chart) {
            this.initChart();
          } else {
            this.updateChart();
          }
        }
      });
    }
  }

  private updateChart(): void {
    if (!this.chart) return;
    this.chart.data.labels = this.stocks.map(s => s.symbol);
    this.chart.data.datasets = [{
      label: 'Stock Price',
      data: this.stocks.map(s => s.price),
      borderColor: 'blue',
      fill: false
    }];
    this.chart.update();
  }

  public reloadData(): void {
    this.loadData();
  }
}
