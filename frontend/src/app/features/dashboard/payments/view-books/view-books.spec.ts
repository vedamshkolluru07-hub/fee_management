import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewBooks } from './view-books';

describe('ViewBooks', () => {
  let component: ViewBooks;
  let fixture: ComponentFixture<ViewBooks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewBooks],
    }).compileComponents();

    fixture = TestBed.createComponent(ViewBooks);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
