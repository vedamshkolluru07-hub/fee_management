import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateStudent } from './update-student';

describe('UpdateStudent', () => {
  let component: UpdateStudent;
  let fixture: ComponentFixture<UpdateStudent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateStudent],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateStudent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
