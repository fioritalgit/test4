import { AfterViewInit, Component } from '@angular/core';
import { SAPconnectorService } from './services/sapconnector.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {

  constructor(private SAP: SAPconnectorService) {
    //--> inject services
   }

  public goCallSap(){
    debugger;

    this.SAP.clearParameters('gr');
    this.SAP.callFunction('gr','INIT','SYNC1').then((data)=>{
      debugger;
    }).catch((err)=>{
      console.log('Error calling SAP')
    })

  }

  ngAfterViewInit(): void {
    
    //--> load UI5 and authenticate to one SAP url (can be same as service); leave version undefined to take last from CDN
    this.SAP.activateSAPconnection(undefined,'https://wd.fiorital.com:4301/sap/opu/odata4/sap/zretail/default/sap/zmm_gr_list/0001/?sap-client=200','BPINST','Welcome1',true)

    //--> enqueue model connection request
    this.SAP.addRemoteService("gr","https://wd.fiorital.com:4301/sap/opu/odata4/sap/zretail/default/sap/zmm_gr_list/0001/?sap-client=200","../assets/models.XML",false)
    .then((ref)=>{
        //--> single service ready
    })

    debugger;
    
    this.SAP.setAPCparameters('https://wd.fiorital.com:4301/sap/opu/odata4/sap/zfiov4/default/sap/zfioapi/0001/Ysocket','') //<-- used to get sockets ID and appID (in this case not specific)
    this.SAP.connectAllRemoteServices().then((ref)=>{
      //--> all services loaded and ready!
      console.log('done SAP');
    });

  }

  title = 'test4';

}
