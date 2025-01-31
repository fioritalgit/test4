import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-enterprise';

@Component({
  selector: 'app-value-cell-renderer',
  standalone: false,
  
  templateUrl: './value-cell-renderer.component.html',
  styleUrl: './value-cell-renderer.component.css'
})
export class ValueCellRendererComponent implements ICellRendererAngularComp{
  public params: ICellRendererParams | undefined
  
  agInit(params: ICellRendererParams): void {
    this.params = params;
}

refresh(params: ICellRendererParams) {
    return false;
}
}
