import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AcademicYearsCreate } from './academic-years-create';

describe('AcademicYearsCreate', () => {
  let component: AcademicYearsCreate;
  let fixture: ComponentFixture<AcademicYearsCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AcademicYearsCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(AcademicYearsCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
