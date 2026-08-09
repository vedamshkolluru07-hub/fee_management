import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcademicYearsView } from './academic-years-view';

describe('AcademicYearsView', () => {
  let component: AcademicYearsView;
  let fixture: ComponentFixture<AcademicYearsView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicYearsView],
    }).compileComponents();

    fixture = TestBed.createComponent(AcademicYearsView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
