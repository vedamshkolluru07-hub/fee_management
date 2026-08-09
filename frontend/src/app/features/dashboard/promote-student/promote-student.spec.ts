import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PromoteStudent } from './promote-student';

describe('PromoteStudent', () => {
  let component: PromoteStudent;
  let fixture: ComponentFixture<PromoteStudent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PromoteStudent],
    }).compileComponents();

    fixture = TestBed.createComponent(PromoteStudent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
