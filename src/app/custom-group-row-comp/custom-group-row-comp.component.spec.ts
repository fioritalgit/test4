import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomGroupRowCompComponent } from './custom-group-row-comp.component';

describe('CustomGroupRowCompComponent', () => {
  let component: CustomGroupRowCompComponent;
  let fixture: ComponentFixture<CustomGroupRowCompComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CustomGroupRowCompComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomGroupRowCompComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
