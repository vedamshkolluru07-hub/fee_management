import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BooksCreate } from './books-create';

describe('BooksCreate', () => {
  let component: BooksCreate;
  let fixture: ComponentFixture<BooksCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BooksCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(BooksCreate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
