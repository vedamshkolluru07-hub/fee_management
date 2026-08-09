import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniformView } from './uniform-view';

describe('UniformView', () => {
  let component: UniformView;
  let fixture: ComponentFixture<UniformView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniformView],
    }).compileComponents();

    fixture = TestBed.createComponent(UniformView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
