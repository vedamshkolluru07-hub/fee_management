import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniformCreate } from './uniform-create';

describe('UniformCreate', () => {
  let component: UniformCreate;
  let fixture: ComponentFixture<UniformCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniformCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(UniformCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
