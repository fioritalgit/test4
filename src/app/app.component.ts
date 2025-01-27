/*

- differenziata altezza righe grouping
- aggiunta libreria per hot-key e logica search & focus a giro


*/

import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { SAPconnectorService } from './services/sapconnector.service';
import { ColDef, IRowNode } from 'ag-grid-enterprise';
import { AgGridAngular } from 'ag-grid-angular';

import { HotkeysService, Hotkey } from 'angular2-hotkeys';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {

  @ViewChild('agGrid') grid!: AgGridAngular;
  @ViewChild('ipt') ipt!: any;

  public lastSearchString: string = ''
  public searchIndex: number = 0
  public searchTargets: Array<IRowNode> = [];

  // Row Data: The data to be displayed.
  rowData = [
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
    { make: "Tesla", model: "Model Y", price: 64950, electric: true },
    { make: "Ford", model: "F-Series", price: 33850, electric: false },
    { make: "Toyota", model: "Corolla", price: 29600, electric: false },
  ];

  // Column Definitions: Defines the columns to be displayed.
  colDefs: ColDef[] = [
    { field: "make", rowGroup: true },
    { field: "model" },
    { field: "price" },
    { field: "electric" }
  ];

  constructor(private SAP: SAPconnectorService, private hotkeysService: HotkeysService) {
    //--> inject services
  }

  public getRowHeight(params: any) {
    if (params.node.group) {
      return 50
    } else {
      return 30
    }
  }

  public goCallSap() {

    this.SAP.clearParameters('gr');
    this.SAP.callFunction('gr', 'INIT', 'SYNC1').then((data) => {

    }).catch((err) => {
      console.log('Error calling SAP')
    })

  }

  public goToCell() {
    this.grid.api.ensureNodeVisible(this.grid.api.getRowNode('14'), "middle")
    setTimeout(() => {
      this.grid.api.setFocusedCell(14, 'make');
    }, 0);
  }

  private _gotoCell(node: IRowNode) {

    //--> ensure parent node is expanded
    if (node.parent?.expanded){      
      this.grid.api.ensureNodeVisible(node, "middle")
      this.grid.api.flashCells({ rowNodes: [node], columns: ['make'] })
    }else{
      node.parent?.setExpanded(true)
      setTimeout(() => {
        this.grid.api.ensureNodeVisible(node, "middle")
        this.grid.api.flashCells({ rowNodes: [node], columns: ['make'] })     
      }, 0);
    }



    /*setTimeout(() => {
       if (node.rowIndex !== null){
         this.grid.api.setFocusedCell(node.rowIndex, 'make');
       }        
     }, 0);*/
  }

  public onSearchKeyDown(evt: any) {

    //--> go search with "enter' key
    if (evt.code === 'Enter') {

      if (this.lastSearchString !== this.ipt.elementRef.nativeElement.value) {

        //---> new search index
        this.searchTargets = []
        this.grid.api.forEachNodeAfterFilter((rnode: IRowNode, idx: number) => {
          if (!rnode.group) {
            if (rnode.data.make.toUpperCase().includes(this.ipt.elementRef.nativeElement.value.toUpperCase())) {
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

  public onSearchKeyFocusOut() {

  }







  ngAfterViewInit(): void {

    this.ipt.elementRef.nativeElement.addEventListener('keydown', this.onSearchKeyDown.bind(this));
    this.ipt.elementRef.nativeElement.addEventListener('focusin', this.onSearchKeyFocusIn.bind(this));
    this.ipt.elementRef.nativeElement.addEventListener('focusout', this.onSearchKeyFocusOut.bind(this));

    //---> manage the search input filed focus
    this.hotkeysService.add(
      new Hotkey('ctrl+f', (event: KeyboardEvent): boolean => {

        this.ipt.elementRef.nativeElement.focus()

        event.preventDefault(); // Prevent default browser behavior (e.g., opening search bar)
        return false; // Prevent further propagation
      })
    );


    //--> load UI5 and authenticate to one SAP url (can be same as service); leave version undefined to take last from CDN
    this.SAP.activateSAPconnection(undefined, 'https://wd.fiorital.com:4301/sap/opu/odata4/sap/zretail/default/sap/zmm_gr_list/0001/?sap-client=200', 'BPINST', 'Welcome1', true)

    //--> enqueue model connection request
    this.SAP.addRemoteService("gr", "https://wd.fiorital.com:4301/sap/opu/odata4/sap/zretail/default/sap/zmm_gr_list/0001/?sap-client=200", "../assets/models.XML", false)
      .then((ref) => {
        //--> single service ready
      })

    this.SAP.setAPCparameters('https://wd.fiorital.com:4301/sap/opu/odata4/sap/zfiov4/default/sap/zfioapi/0001/Ysocket', '') //<-- used to get sockets ID and appID (in this case not specific)
    this.SAP.connectAllRemoteServices().then((ref) => {
      //--> all services loaded and ready!
      console.log('done SAP');
    });

  }

  title = 'test4';

}
