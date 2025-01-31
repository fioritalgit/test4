import { Component, ElementRef, ViewChild, viewChild } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams, IRowNode } from 'ag-grid-community';

import { SAPconnectorService } from '../services/sapconnector.service';
import { GlobalcontextService } from '../services/globalcontext.service';



@Component({
  selector: 'app-custom-group-row-comp',
  standalone: false,
  
  templateUrl: './custom-group-row-comp.component.html',
  styleUrl: './custom-group-row-comp.component.css'
})
export class CustomGroupRowCompComponent implements ICellRendererAngularComp{

  @ViewChild('iptsearch') searchRef!: any;

  public params!: ICellRendererParams;
  public paddingLeft!: number;
  public isGroup!: boolean;
  public rotation!: string;
  public rowData: any;


  constructor(private globalContext: GlobalcontextService){
    this.globalContext = globalContext
  }

  agInit(params: ICellRendererParams): void {

      //--> store reference to global data (get from API)
      this.rowData = params.api.getGridOption('rowData')

      this.params = params;
      this.paddingLeft = params.node.level * 15;
      this.isGroup = !!params.node.group;
      this.rotation = params.node.expanded ? 'rotate(90deg)' : 'rotate(0deg)';

      this.params.node.addEventListener('expandedChanged', this.onExpand);
  }

  setFiltering(){

    debugger

    //--> handle specific fields filtering
    var filterId = ''
    if (this.searchRef.elementRef.nativeElement.getAttribute('filterId') !== null){
      filterId = this.searchRef.elementRef.nativeElement.getAttribute('filterId')
    }

    
    //---> get data from first child row
    if (this.params.node.allLeafChildren !== null){
        var rowData = this.params.node.allLeafChildren[0].data        
        
        this.globalContext.addSearchReference({rowType: rowData.rowType, searchTerm: this.searchRef.elementRef.nativeElement.value, filterId: filterId})
        this.globalContext.setFilterProperties(this.rowData)

        this.params.api.onFilterChanged()
    }else{
      return
    }
    
  }

  refresh(params: ICellRendererParams) {
      return false;
  }

  destroy() {
      this.params.node.removeEventListener('expandedChanged', this.onExpand);
  }

  onClick() {
      this.params.node.setExpanded(!this.params.node.expanded);
  }

  onExpand = () => {
      this.rotation = this.params.node.expanded ? 'rotate(90deg)' : 'rotate(0deg)';
  };
}
