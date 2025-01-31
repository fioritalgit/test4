import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ValueCellRendererComponent } from './value-cell-renderer.component';

describe('ValueCellRendererComponent', () => {
  let component: ValueCellRendererComponent;
  let fixture: ComponentFixture<ValueCellRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ValueCellRendererComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValueCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
