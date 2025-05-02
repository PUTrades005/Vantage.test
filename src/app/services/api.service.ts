import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TimeSeriesDaily {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  getDailyTimeSeries(symbol: string): Observable<TimeSeriesDaily[]> {
    const url = `${environment.apiUrl}/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${environment.alphaVantageKey}`;
    return this.http.get<any>(url).pipe(
      map(response => {
        const series = response['Time Series (Daily)'];
        if (!series) return [];
        return Object.entries(series).map(([date, values]: [string, any]) => ({
          date,
          open: +values['1. open'],
          high: +values['2. high'],
          low: +values['3. low'],
          close: +values['4. close'],
          volume: +values['5. volume'],
        }));
      })
    );
  }
}
