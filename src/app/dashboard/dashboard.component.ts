import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, inject } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);
import { CommonModule } from '@angular/common';
import { environment } from '../../environments/environment';
import { ApiService, TimeSeriesDaily } from '../services/api.service';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SMA, EMA, RSI, MACD, BollingerBands } from 'technicalindicators';

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
  public searchSymbol: string = '';
  public selectedIndicators: string[] = [];

  private symbols = ['AAPL', 'GOOG', 'MSFT'];
  private api = inject(ApiService);

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {}

  private initChart(): void {
    const canvas = this.chartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.error = 'Unable to initialize chart context';
      return;
    }

    if (this.chart) {
      this.chart.destroy();
    }

    const labels = this.series.map(s => s.date).reverse();
    const prices = this.series.map(s => s.close).reverse();

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: `${this.symbol} Closing Price`,
          data: prices,
          borderColor: 'blue',
          fill: false
        }]
      },
      options: {
        responsive: true,
        plugins: {
          tooltip: {
            mode: 'index',
            intersect: false
          },
          legend: {
            display: true
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Date'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Price ($)'
            },
            ticks: {
              callback: value => `$${value}`
            }
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
    this.addIndicators();
  }

  private addIndicators(): void {
    const closingPrices = this.series.map(s => s.close);
    const high = this.series.map(s => s.high);
    const low = this.series.map(s => s.low);
    const volume = this.series.map(s => s.volume);

    if (this.selectedIndicators.includes('SMA')) {
      const sma = SMA.calculate({ period: 10, values: closingPrices });
      const padded = Array(closingPrices.length - sma.length).fill(null).concat(sma);
      this.chart.data.datasets.push({ label: '10-day SMA', data: padded, borderColor: 'orange', borderDash: [5, 5], fill: false });
    }

    if (this.selectedIndicators.includes('EMA')) {
      const ema = EMA.calculate({ period: 10, values: closingPrices });
      const padded = Array(closingPrices.length - ema.length).fill(null).concat(ema);
      this.chart.data.datasets.push({ label: '10-day EMA', data: padded, borderColor: 'green', borderDash: [3, 3], fill: false });
    }

    if (this.selectedIndicators.includes('RSI')) {
      const rsi = RSI.calculate({ values: closingPrices, period: 14 });
      const padded = Array(closingPrices.length - rsi.length).fill(null).concat(rsi);
      this.chart.data.datasets.push({ label: 'RSI', data: padded, borderColor: 'purple', borderDash: [2, 4], fill: false });
    }

    if (this.selectedIndicators.includes('MACD')) {
      const macd = MACD.calculate({ values: closingPrices, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
      const macdLine = macd.map(m => m.MACD);
      const signalLine = macd.map(m => m.signal);
      const histogram = macd.map(m => m.histogram);
      const pad = closingPrices.length - macdLine.length;
      this.chart.data.datasets.push({ label: 'MACD Line', data: Array(pad).fill(null).concat(macdLine), borderColor: 'red', fill: false });
      this.chart.data.datasets.push({ label: 'MACD Signal', data: Array(pad).fill(null).concat(signalLine), borderColor: 'pink', borderDash: [1, 3], fill: false });
      this.chart.data.datasets.push({ label: 'MACD Histogram', data: Array(pad).fill(null).concat(histogram), borderColor: 'gray', borderDash: [4, 2], fill: false });
    }

    if (this.selectedIndicators.includes('BollingerBands')) {
      const bb = BollingerBands.calculate({ period: 20, stdDev: 2, values: closingPrices });
      const upper = Array(closingPrices.length - bb.length).fill(null).concat(bb.map(b => b.upper));
      const lower = Array(closingPrices.length - bb.length).fill(null).concat(bb.map(b => b.lower));
      this.chart.data.datasets.push({ label: 'Upper BB', data: upper, borderColor: 'cyan', borderDash: [6, 2], fill: false });
      this.chart.data.datasets.push({ label: 'Lower BB', data: lower, borderColor: 'cyan', borderDash: [6, 2], fill: false });
    }

    this.chart.update();
  }

  public toggleFullScreen(): void {
    const el = this.chartCanvas.nativeElement;
    if (el.requestFullscreen) el.requestFullscreen();
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
        console.log('API data:', data);
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
