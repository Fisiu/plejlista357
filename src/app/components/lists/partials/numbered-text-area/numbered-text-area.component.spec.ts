import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NumberedTextAreaComponent } from './numbered-text-area.component';

describe('NumberedTextAreaComponent', () => {
  let component: NumberedTextAreaComponent;
  let fixture: ComponentFixture<NumberedTextAreaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NumberedTextAreaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NumberedTextAreaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
