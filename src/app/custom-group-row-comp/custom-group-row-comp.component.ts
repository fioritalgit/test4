import { Component, ElementRef, ViewChild, viewChild } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams, IRowNode } from 'ag-grid-community';
import { GlobalcontextService, tModifyFilterResult } from '../services/globalcontext.service';



@Component({
  selector: 'app-custom-group-row-comp',
  standalone: false,

  templateUrl: './custom-group-row-comp.component.html',
  styleUrl: './custom-group-row-comp.component.css'
})
export class CustomGroupRowCompComponent implements ICellRendererAngularComp {

  @ViewChild('iptsearch') searchInputRef!: any;

  public params!: ICellRendererParams;
  public paddingLeft!: number;
  public isGroup!: boolean;
  public rotation!: string;
  public rowData: any;
  public filterRes: tModifyFilterResult = { activeFilter: false, hasVisibleItems: false };


  constructor(private globalContext: GlobalcontextService) {
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

  setFiltering() {

    //--> handle specific fields filtering
    var filterId = ''
    if (this.searchInputRef.elementRef.nativeElement.getAttribute('filterId') !== null) {
      filterId = this.searchInputRef.elementRef.nativeElement.getAttribute('filterId')
    }

    //---> get data from first child row
    if (this.params.node.allLeafChildren !== null) {
      var rowData = this.params.node.allLeafChildren[0].data

      this.globalContext.addSearchReference({ rowType: rowData.rowType, searchTerm: this.searchInputRef.elementRef.nativeElement.value, filterId: filterId, groupComponentRef: this })
      this.filterRes = this.globalContext.setFilterProperties(this.rowData, rowData.rowType)

      this.params.api.onFilterChanged() //<--- trigger grid refresh!
    } else {
      return
    }

  }

  removeFilter() {
    
    //--> handle specific fields filtering
    var filterId = ''
    if (this.searchInputRef.elementRef.nativeElement.getAttribute('filterId') !== null) {
      filterId = this.searchInputRef.elementRef.nativeElement.getAttribute('filterId')
    }

    if (this.params.node.allLeafChildren) {
      var rowData = this.params.node.allLeafChildren[0].data

      //--> reset!
      this.searchInputRef.elementRef.nativeElement.value = ''
      this.globalContext.addSearchReference({ rowType: rowData.rowType, searchTerm: '', filterId: filterId, groupComponentRef: this })
      this.filterRes = this.globalContext.setFilterProperties(this.rowData, rowData.rowType)
    }

    this.params.api.onFilterChanged() //<--- trigger grid refresh!
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
