import { TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ChartSummary } from './radio-chart.model';
import { RadioChartService } from './radio-chart.service';

describe('RadioChartService', () => {
  let service: RadioChartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RadioChartService,
      ],
    });
    service = TestBed.inject(RadioChartService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAllChartSummaries', () => {
    const mockChartSummaries: ChartSummary[] = [
      {
        no: '1',
        published_at: '2023-10-01 17:00:00',
        published_at_date: '2023-10-01',
      },
      {
        no: '2',
        published_at: '2023-09-24 127:00:00',
        published_at_date: '2023-09-24',
      },
    ];

    it('should return an Observable of ChartSummary array', () => {
      service.getAllChartSummaries().subscribe((summaries) => {
        expect(summaries).toEqual(mockChartSummaries);
      });

      const req = httpMock.expectOne(`${service.baseUrl}/lista/all`);
      expect(req.request.method).toBe('GET');
      req.flush(mockChartSummaries);
    });
  });

  describe('getLatestChart', () => {
    const mockChartItems = [
      { artist: 'Artist1', name: 'Song1' },
      { artist: 'Artist2', name: 'Song2' },
    ];
    const expectedChartData = ['Artist2 - Song2', 'Artist1 - Song1'];

    it('should return the latest chart as a string array', () => {
      service.getLatestChart().subscribe((chartData) => {
        expect(chartData).toEqual(expectedChartData);
      });

      const req = httpMock.expectOne(`${service.baseUrl}/lista/all`);
      expect(req.request.method).toBe('GET');
      req.flush({
        results: { mainChart: { items: mockChartItems } },
      });
    });
  });
});
