import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassView } from './class-view';

describe('ClassView', () => {
  let component: ClassView;
  let fixture: ComponentFixture<ClassView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassView],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
