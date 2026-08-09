import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewTution } from './view-tution';

describe('ViewTution', () => {
  let component: ViewTution;
  let fixture: ComponentFixture<ViewTution>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewTution],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewTution);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
