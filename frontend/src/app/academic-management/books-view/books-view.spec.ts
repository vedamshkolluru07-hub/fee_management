import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BooksView } from './books-view';

describe('BooksView', () => {
  let component: BooksView;
  let fixture: ComponentFixture<BooksView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BooksView],
    }).compileComponents();

    fixture = TestBed.createComponent(BooksView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
