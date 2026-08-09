import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentModel } from './student-model';

describe('StudentModel', () => {
  let component: StudentModel;
  let fixture: ComponentFixture<StudentModel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StudentModel],
    }).compileComponents();

    fixture = TestBed.createComponent(StudentModel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
