// @ts-nocheck
import { Injectable } from '@angular/core';
import { map as asyncMap } from 'async';

@Injectable({
  providedIn: 'root'
})
export class SAPconnectorService {

  sapConnections: Array<object> = []
  enqueueServiceStartup: Array<object> = []
  loadPromise: Promise
  UY5CORE: any
  APCmanager: any
  APCmanagerClass: any
  APCurl: string = ''
  appId: string = ''

  constructor() { }

  getSAPconnection(serviceId: string) {
    return sap = this.sapConnections.find((ssap) => {
      return (ssap.modelName === serviceId)
    })
  }

  clearParameters(serviceId: string) {
    let sap = this.getSAPconnection(serviceId);
    if (sap !== undefined) {
      sap.uy5.clearParameters();
    }
  }

  addParameters(serviceId: string, paramName: string, paramValue: string) {

    let sap = this.getSAPconnection(serviceId);
    if (sap !== undefined) {
      sap.uy5.addSinglePar(paramName, paramValue);
    }

  }

  callFunction(serviceId: string, functionMame: string, syncGroup: string) {

    return new Promise((resolve, reject) => {
      let sap = this.getSAPconnection(serviceId);
      if (sap !== undefined) {
        sap.uy5.callFunction(functionMame,
          function (data) {
            resolve(data);
          },
          function (err) {
            reject(err);
          },
          syncGroup
        );
      } else {
        reject();
      }
    })

  }

  addRemoteService(modelName: string, sapUrl: string, xmlModel: string, direct: boolean = false) {

    if (direct) {

      return new Promise((resolve, reject) => {

        var refData = { sapUrl: sapUrl, xmlModel: xmlModel, modelName: modelName, sapConnections: this.sapConnections, that: this }
        this.loadPromise.then(function () {

          console.log('>>> attaching to model:' + this.sapUrl + ' / ' + this.xmlModel)
          var sapConn = { modelName: this.modelName }

          //--> istantiate odataV4 model
          sapConn.odv4 = new window.sap.ui.model.odata.v4.ODataModel({
            serviceUrl: this.sapUrl,
            synchronizationMode: 'None',
            groupId: '$direct',
            odataVersion: '4.0'
          })

          //--> get XCRF token
          sapConn.odv4.initializeSecurityToken();

          //--> load UY5 fiorital framework
          sapConn.uy5 = new window.UY5CORE(this.modelName, sapConn.odv4, this.xmlModel)
          this.sapConnections.push(sapConn)

          //--> expose also as direct attributes 
          this.that[this.modelName] = sapConn.uy5
          window[this.modelName] = sapConn.uy5

          //--> bootstrap
          sapConn.uy5.getXMLModels(() => {
            resolve({ sapConn: sapConn.uy5, service: this.that });
          },
            () => {
              reject()
            })

        }.bind(refData))

      })

    } else {
      return new Promise((resolve, reject) => {
        let startup = {}
        startup.resolve = resolve;
        startup.modelName = modelName
        startup.sapUrl = sapUrl
        startup.xmlModel = xmlModel
        startup.sapConnections = this.sapConnections
        startup.that = this
        this.enqueueServiceStartup.push(startup)
      })

    }

  }

  connectAllRemoteServices() {

    return new Promise((resolve, reject) => {

    asyncMap(this.enqueueServiceStartup, function (sapObj, callback) {

      var refData = {
        sapUrl: sapObj.sapUrl, xmlModel: sapObj.xmlModel, modelName: sapObj.modelName, sapConnections: sapObj.sapConnections,
        that: sapObj.that, resolve: sapObj.resolve, callback: callback
      }

      sapObj.that.loadPromise.then(function () {

        console.log('>>> attaching to model:' + this.sapUrl + ' / ' + this.xmlModel)
        var sapConn = { modelName: this.modelName }

        //--> istantiate odataV4 model
        sapConn.odv4 = new window.sap.ui.model.odata.v4.ODataModel({
          serviceUrl: this.sapUrl,
          synchronizationMode: 'None',
          groupId: '$direct',
          odataVersion: '4.0'
        })

        //--> get XCRF token
        sapConn.odv4.initializeSecurityToken();

        //--> load UY5 fiorital framework
        sapConn.uy5 = new window.UY5CORE(this.modelName, sapConn.odv4, this.xmlModel)
        this.sapConnections.push(sapConn)

        //--> expose also as direct attributes 
        this.that[this.modelName] = sapConn.uy5
        window[this.modelName] = sapConn.uy5

        //--> bootstrap
        sapConn.uy5.getXMLModels(() => {
          this.resolve({ sapConn: sapConn.uy5, service: this.that });

          setTimeout(() => {
            this.callback(null, sapObj);
          }, 1)

        },
          () => {
            reject()
          })

      }.bind(refData))

    }, function (err, result) {
      console.log('>>>> all SAP service loaded')
      resolve({service: result[0].that});
    });

  });

  }

  setAPCparameters(url: string,appId: string){
    this.APCurl = url;
    this.appId = appId;
  }

  activateSAPconnection(version, logonServiceUrl,userName: string,password: string, APCactive: boolean) {

    this.loadPromise = new Promise((resolve, reject) => {

      //--> version management from CDN
      if (version === undefined) {
        var ui5address = 'https://openui5.hana.ondemand.com/resources/sap-ui-core.js'
      } else {
        var ui5address = 'https://openui5.hana.ondemand.com/' + version + '/resources/sap-ui-core.js'
      }

      //--> inject UI5 bootstrap
      const ui5ScriptTag = document.createElement('script');
      ui5ScriptTag.src = ui5address;
      ui5ScriptTag.id = 'sap-ui-bootstrap';
      ui5ScriptTag.setAttribute('data-sap-ui-libs', 'sap.ui.commons,sap.ui.ux3,sap.m,sap.uxap,sap.tnt');
      ui5ScriptTag.setAttribute('data-sap-ui-theme', 'sap_bluecrystal');
      const bodyElememt = document.getElementsByTagName('body')[0];


      //--> wait for tag loading
      ui5ScriptTag.onload = function () {

        //--> wait for UI5 ready state
        const oCore = window.sap.ui.getCore();
        oCore.attachInit(() => {

          //--> set UI5 modules references to local directories
          window.jQuery.sap.registerModulePath("fioritalframework", "/assets");
          window.jQuery.sap.registerModulePath("it/fiorital/fioritalui5lib/framework", "/assets");
          window.jQuery.sap.registerModulePath("it/fiorital/fioritalui5lib/libs", "/assets/libs");
          window.jQuery.sap.registerModulePath("it/fiorital/fioritalui5lib/controls", "/assets/controls");

          //--> load required modules (UI5)
          window.sap.ui.require(['sap/ui/model/json/JSONModel', 'fioritalframework/uy5/helper/UY5CORE','it/fiorital/fioritalui5lib/controls/APCmanager','sap/ui/core/ws/WebSocket','it/fiorital/fioritalui5lib/controls/FioritalMessageStrip'],
            function (JSONModel, UY5CORE,APCmanager,WS,messageBox) {

              debugger;

              //--> store globally the constructor              
              window.UY5CORE = UY5CORE

              //--> setup APC manager 
              if (APCactive && this.APCurl !== ''){
               



              }else{
                if (this.APCurl === ''){
                  console.log('>>> attention! APC can be activted only specifing APC urls via function setAPCparameters()')
                }
              }
              

              //--> handle authentication requests with cookies
              window.jQuery.ajaxSetup({
                beforeSend: function (jqXHR, settings) {
                  if (settings.url.includes('wd.fiorital.com')) {
                    settings.xhrFields = { withCredentials: true }
                    settings.crossDomain = true
                  }
                }
              });

              //--> authenticate first time (with credentials)
              window.jQuery.ajax({
                type: "GET",
                contentType: "application/json",
                crossDomain: true,
                url: logonServiceUrl,
                headers: {
                  "Authorization": "Basic " + btoa(userName + ":" + password),
                },
                success: function (data, textStatus, jqXHR) {
                  console.log('SAP authentication OK')
                  resolve()
                },
                error: function (oError) {
                  console.log('>>> no connection to SAP server <<<')
                  reject()
                }

              });

            }.bind(this));

        });

      }.bind(this)

      bodyElememt.appendChild(ui5ScriptTag); //<-- inject tag to page

    });

  }
}
