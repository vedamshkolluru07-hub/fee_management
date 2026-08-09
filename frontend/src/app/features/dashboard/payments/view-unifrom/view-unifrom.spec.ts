import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewUnifrom } from './view-unifrom';

describe('ViewUnifrom', () => {
  let component: ViewUnifrom;
  let fixture: ComponentFixture<ViewUnifrom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewUnifrom],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewUnifrom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
