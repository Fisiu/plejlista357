import { TestBed } from '@angular/core/testing';

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Chart, ChartSummary } from './radio-chart.model';
import { RadioChartService } from './radio-chart.service';

describe('RadioChartService', () => {
  let service: RadioChartService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(), provideHttpClientTesting(), RadioChartService],
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

  describe('getLatestChartNumber', () => {
    const mockResponse: ChartSummary[] = [
      {
        no: '123',
        published_at: '2023-10-01 17:00:00',
        published_at_date: '2023-10-01',
      },
      {
        no: '122',
        published_at: '2023-09-24 127:00:00',
        published_at_date: '2023-09-24',
      },
    ];

    it('should return the latest chart number', () => {
      service.getLatestChartNumber().subscribe((number) => {
        expect(number).toBe(123);
        expect(service.latestWeeklyChartNumber()).toBe(123);
      });

      const req = httpMock.expectOne(`${service.baseUrl}/lista/all`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle an empty response', () => {
      const mockResponse: ChartSummary[] = [];

      service.getLatestChartNumber().subscribe((number) => {
        expect(number).toBe(NaN); // or whatever your service returns when array is empty.
        expect(service.latestWeeklyChartNumber()).toBe(NaN);
      });

      const req = httpMock.expectOne(`${service.baseUrl}/lista/all`); // Replace service['apiUrl'] with the actual URL used in getAllChartSummaries
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('getChartByNumber', () => {
    it('should return the chart data and update latestWeeklyChartText and weeklyChart', () => {
      const chartNumber = 123;
      const mockResponse: Chart = {
        results: {
          mainChart: {
            items: [
              {
                artist: 'Artist1',
                name: 'Song1',
                id: 1,
                change: 2,
                is_new: false,
                position: 1,
                times_on_chart: 3,
                last_position: 3,
              },
              {
                artist: 'Artist2',
                name: 'Song2',
                id: 1,
                change: 2,
                is_new: false,
                position: 1,
                times_on_chart: 3,
                last_position: 3,
              },
            ],
          },
          waitingRoom: {
            items: [],
            label: 'Poczekalnia',
          },
        },
        summary: {
          new: 2,
          up: 1,
          down: 1,
          same: 0,
          max_times_on_chart: 5,
        },
        name: 'Weekly Top 10',
        no: '123',
        previous_no: '122',
        next_no: '124',
        published_at_date: '2023-10-27',
        document: 'document123.pdf',
        title: 'Weekly Chart #123',
        title_template: 'Weekly Chart #{no}',
      };

      service.getChartByNumber(chartNumber).subscribe((response) => {
        expect(response).toEqual(mockResponse);
        expect(service.weeklyChart()).toEqual(mockResponse);
        expect(service.latestWeeklyChartText()).toEqual(['Artist2 - Song2', 'Artist1 - Song1']);
      });

      const req = httpMock.expectOne(`${service['baseUrl']}/lista/${chartNumber}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  // describe('getLatestChartNumber', () => {
  //   const mockChartItems = [
  //     { artist: 'Artist1', name: 'Song1' },
  //     { artist: 'Artist2', name: 'Song2' },
  //   ];
  //   const expectedChartData = ['Artist2 - Song2', 'Artist1 - Song1'];

  //   it('should return the latest chart as a string array', () => {
  //     service.getLatestChart().subscribe((chartData) => {
  //       expect(chartData).toEqual(expectedChartData);
  //     });

  //     const req = httpMock.expectOne(`${service.baseUrl}/lista/all`);
  //     expect(req.request.method).toBe('GET');
  //     req.flush({
  //       results: { mainChart: { items: mockChartItems } },
  //     });
  //   });
  // });
});
