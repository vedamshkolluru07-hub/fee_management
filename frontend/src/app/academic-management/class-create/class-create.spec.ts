import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassCreate } from './class-create';

describe('ClassCreate', () => {
  let component: ClassCreate;
  let fixture: ComponentFixture<ClassCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(ClassCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
