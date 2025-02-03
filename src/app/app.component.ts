/*
- differenziata altezza righe grouping
- aggiunta libreria per hot-key e logica search & focus a giro
- componente custom per renderer valori con CSS note e classe sfondo per stato confermato
- hide columns >>> per day (partial)

- matchcode
- validation
- copia riga sopra / copia riga sotto
*/

import { pivotData } from './pivotdata';
import { pivotData2 } from './pivotdata2';
import { AfterViewInit, Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { SAPconnectorService } from './services/sapconnector.service';
import { ColDef, IRowNode, RowGroupingDisplayType } from 'ag-grid-enterprise';
import { AgGridAngular } from 'ag-grid-angular';
import { HotkeysService, Hotkey } from 'angular2-hotkeys';
import { CustomGroupRowCompComponent } from './custom-group-row-comp/custom-group-row-comp.component';
import { GlobalcontextService, tFilterFunction } from './services/globalcontext.service';
import { ValueCellRendererComponent } from './value-cell-renderer/value-cell-renderer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit, OnInit {

  @ViewChild('agGrid') grid!: AgGridAngular;
  @ViewChild('agGrid2') grid2!: AgGridAngular;
  @ViewChild('ipt') ipt!: any;

  public groupDisplayType: RowGroupingDisplayType = "groupRows";
  public groupRowRenderer: any = CustomGroupRowCompComponent;
  public lastSearchString: string = ''
  public searchIndex: number = 0
  public searchTargets: Array<IRowNode> = [];
  
  //---> pivot data from sample data files
  rowData: any = pivotData;
  rowData2: any = pivotData2;

  //---> DEFINE CUSTOM FILTER FUNCTIONS
  private filterFunctionExample: tFilterFunction = (sdata: any, searchTerm: string) => {
    return sdata.model.toUpperCase().includes(searchTerm.toUpperCase())
  }


  //---> Column Definitions: Defines the columns to be displayed.
  colDefs: ColDef[] = [
    {
      field: "rowType", rowGroup: true, valueGetter: (p: any) => {
        p.data.rowRef = p.node //<-- store row ref
        return p.data.rowType
      }
    },
    { field: "model" },
    {
      field: "price",
      cellRenderer: ValueCellRendererComponent  //<-- custom component for value renderer
    },
    { field: "electric" }
  ];


  @HostListener('window:beforeunload', ['$event'])
  async handleBeforeUnload(event: Event) {
    console.log('>>>>> leaving <<<<<<<')
  }

  constructor(private SAP: SAPconnectorService, private hotkeysService: HotkeysService ,private globalContext: GlobalcontextService) {
    //--> inject services
    this.globalContext = globalContext
  }

  ngOnInit(): void {

  }

  //---> filtering
  doesExternalFilterPass = (node: IRowNode<any>): boolean => {
    return this.globalContext.testNode(node) //<-- delegate filtering
  };

  isExternalFilterPresent = (): boolean => {
    return true;
  };


  getRowStyle(params: any) {
    if (params.node.group) {
      return { background: '#317ca41a' };
    } else {
      return
    }
  }

  public getRowHeight(params: any) {
    if (params.node.group) {
      return 50
    } else {
      return 30
    }
  }

  public hideColumns() {

    //--> get the state ol ALL columns
    var st = this.grid.api.getColumnState()

    //---> set visibility (hide) for wanted columns
    st[1].hide = true

    //--> set the state for ALL columns (auto refresh)
    this.grid.api.applyColumnState({ state: st })
  }

  public goCallSap() {

    this.SAP.clearParameters('xpivot');
    this.SAP.callFunction('xpivot', 'GET_PIVOT_LIST', 'SYNC1').then((data) => {
      this.rowData[0].price = this.rowData[0].price + 1
      this.grid.api.refreshCells({ force: true, rowNodes: [this.rowData[0].rowRef], suppressFlash: false })
      this.grid.api.flashCells({ rowNodes: [this.rowData[0].rowRef] })
    }).catch((err) => {
      console.log('Error calling SAP')
    })

  }

  public clearAllFilters() {
    this.globalContext.clearAllRowTypeFilters()
  }

  public goToCell() {
    this.grid.api.ensureNodeVisible(this.grid.api.getRowNode('14'), "middle")
    setTimeout(() => {
      this.grid.api.setFocusedCell(14, 'rowType');
    }, 0);
  }

  private _gotoCell(node: IRowNode) {

    //--> ensure parent node is expanded
    if (node.parent?.expanded) {
      this.grid.api.ensureNodeVisible(node, "middle")
      this.grid.api.flashCells({ rowNodes: [node], columns: ['rowType'] })
    } else {
      node.parent?.setExpanded(true)
      setTimeout(() => {
        this.grid.api.ensureNodeVisible(node, "middle")
        this.grid.api.flashCells({ rowNodes: [node], columns: ['rowType'] })
      }, 0);
    }

  }

  public onSearchKeyDown(evt: any) {

    //--> go search with "enter' key
    if (evt.code === 'Enter') {

      if (this.lastSearchString !== this.ipt.elementRef.nativeElement.value) {

        //---> new search index
        this.searchTargets = []
        this.grid.api.forEachNodeAfterFilter((rnode: IRowNode, idx: number) => {
          if (!rnode.group) {
            if (rnode.data.rowType.toUpperCase().includes(this.ipt.elementRef.nativeElement.value.toUpperCase())) {
              this.searchTargets?.push(rnode)
            }
          }
        })

        //--> if found move to first!
        if (this.searchTargets.length > 0) {
          this._gotoCell(this.searchTargets[0])
        }

      } else {
        //---> continue with same search index
        this.searchIndex++

        //--> does search index exists? if at the end go back to first
        if (this.searchTargets.length - 1 >= this.searchIndex) {
          this._gotoCell(this.searchTargets[this.searchIndex])
        } else {
          this.searchIndex = 0
          this._gotoCell(this.searchTargets[this.searchIndex])
        }
      }

      this.lastSearchString = this.ipt.elementRef.nativeElement.value  //<--- store for next search
    }

  }

  public onSearchKeyFocusIn() {
    this.ipt.elementRef.nativeElement.value = ''
    this.lastSearchString = ''
    this.searchIndex = 0
  }

  //------------------------------------------------------------------------------------------------------------------------------------------------------------

  ngAfterViewInit(): void {

    //--> set Filtering functions '*' is valid for all groups! this function is called when inputbox of single group line is fired, '*' means valid for all row types
    this.globalContext.setAPI(this.grid.api)
    this.globalContext.setFilterFunction('*', this.filterFunctionExample, 'filtertype1')

    //--> manage the events of focus on global search field
    this.ipt.elementRef.nativeElement.addEventListener('keydown', this.onSearchKeyDown.bind(this));
    this.ipt.elementRef.nativeElement.addEventListener('focusin', this.onSearchKeyFocusIn.bind(this));

    //---> manage the search input filed focus
    this.hotkeysService.add(
      new Hotkey('ctrl+f', (event: KeyboardEvent): boolean => {
        this.ipt.elementRef.nativeElement.focus()
        event.preventDefault();
        return false;
      })
    );

    //--> load UI5 and authenticate to one SAP url (can be same as service); leave version undefined to take last from CDN
    this.SAP.activateSAPconnection(undefined, 'https://wd.fiorital.com:4302/sap/opu/odata4/sap/zmobile/default/sap/zangular_xpivot/0001/?sap-client=200', 'BPINST', 'Welcome1', true)

    //--> enqueue model connection request
    this.SAP.addRemoteService("xpivot", "https://wd.fiorital.com:4302/sap/opu/odata4/sap/zmobile/default/sap/zangular_xpivot/0001/?sap-client=200", "../assets/models.XML", false)
      .then((ref) => {
        //--> single service ready
    })

    this.SAP.setAPCparameters('https://wd.fiorital.com:4302/sap/opu/odata4/sap/zfiov4/default/sap/zfioapi/0001/Ysocket', 'apctestangular') //<-- used to get sockets ID and appID (in this case not specific)
    this.SAP.connectAllRemoteServices().then((ref) => {
      
      //--> all services loaded and ready!
      console.log('done SAP');
      this.SAP.addListenerPermanent('1234', 'TESTANGULAR', (evt: any, objRef: any) => {

      }, this); //<-- pass "this" as callback objRef

    })

  }

  title = 'test4';

}
