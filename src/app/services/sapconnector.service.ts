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
  UI5WS: any
  urlHandShake: string = ''
  JSONModel: any
  UI5messageBox: any

  public APCparameters: {
    APCurl: string = ''
    appId: string = ''
  }


  constructor() {
    this.listeners = [] //<-- clear listeners array
  }

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

        //---> adjust calls for APC (set application id header), load WS endpoint list and start listening
        if (this.APCparameters !== undefined) {
          this.__internal_set_headerForAPC('fioritalapp', this.APCparameters.appId);
          this.__loadAPCservicelist();
        }

        //--> final resolve
        console.log('>>>> all SAP service loaded')
        resolve({ service: result[0].that });

      }.bind(this));

    });

  }

  __loadAPCservicelist() {

    return new Promise((resolve, reject) => {

      this.jsonYsocket = new this.JSONModel();
      this.jsonYsocket.attachRequestCompleted(function (evt) {

        var ysondata = this.jsonYsocket.getData().value;

        //--> handshake (fixed)
        ysondata.forEach(function (sdata) {

          if (sdata.parname === 'YSOCKET_HANDSHAKE' && this.urlHandShake === '') {
            this.urlHandShake = sdata.parvalue;
          }

        }.bind(this));


        //--> websocket endpoint (app based)
        var fndSpecific = false;
        ysondata.forEach(function (sdata) {
          if (sdata.parname === 'YSOCKET_WSS' && sdata.appid === this.APCparameters.appId && this.urlWebSocket === '') {
            this.urlWebSocket = sdata.parvalue;
            fndSpecific = true;
          }
        }.bind(this));

        //--> websocket endpoint (generic in case app based not availabl)
        if (fndSpecific === false) {
          ysondata.forEach(function (sdata) {
            if (sdata.parname === 'YSOCKET_WSS' && sdata.appid === '') {
              this.urlWebSocket = sdata.parvalue;
            }
          }.bind(this));
        }

        //--> initiate connections        
        this.__internal_setup_channel();

        resolve();
      }.bind(this));

      this.jsonYsocket.loadData(this.APCparameters.APCurl);

    });

  }

  __internal_setup_channel() {

    $.ajax(this.urlHandShake, // request url
      {
        timeout: 10000,
        error: function () {
          this.UI5messageBox.show(
            "RICARICARE PAGINA AL PIU PRESTO,SE IL PROBLEMA PERSISTE CONTATTARE REPARTO IT", {
            icon: this.UI5messageBox.Icon.ERROR,
            title: "ATTENZIONE!!! CONNESSIONE AL SERVER NON CONFERMATA!",
            actions: [this.UI5messageBox.Action.YES]
          }
          );
        }.bind(this),

        success: function (data, status, xhr) {

          this.connection = new this.UI5WS(this.urlWebSocket);

          //--> connection opened 
          this.connection.attachOpen(function (oControlEvent) {
            this.connected = true;
          }.bind(this));

          //--> server messages
          this.connection.attachMessage(function (oControlEvent) {

            //--> deserialize as json
            try {

              try {
                var APCMessage = jQuery.parseJSON(oControlEvent.getParameter('data'));
              } catch (exc) {

                var binary_string = window.atob(oControlEvent.getParameter('data'));
                var len = binary_string.length;

                var bytes = new Uint8Array(len);
                for (var i = 0; i < len; i++) {
                  bytes[i] = binary_string.charCodeAt(i);
                }

                pako.inflateRaw(bytes);
                var strJson = new TextDecoder("utf-8").decode(pako.inflateRaw(bytes));

                var APCMessage = JSON.parse(strJson);
                APCMessage.DATASTREAM = JSON.parse(window.atob(APCMessage.DATASTREAM));
              }

              try {
                APCMessage.DATASTREAM = JSON.parse(atob(APCMessage.DATASTREAM)); //<--- decode base64 and restore Json
              } catch (excbase64) {
                //---> wrong or no data stream
              }

              if (APCMessage.CONTEXT_TYPE === '*' || APCMessage.CONTEXT_TYPE === 'BROADCAST') {

                //--> ?

              } else {

                for (var idx = 0; idx < this.listeners.length; idx++) {

                  if (this.listeners[idx].contextType === '' || this.listeners[idx].contextType === '*' || this.listeners[idx].contextType === APCMessage.CONTEXT_TYPE) {

                    if (((this.listeners[idx].Id1 === undefined) || (this.listeners[idx].Id1 === APCMessage.CONTEXT)) &&
                      ((this.listeners[idx].Id2 === undefined) || (this.listeners[idx].Id2 === APCMessage.CONTEXT_P1)) &&
                      ((this.listeners[idx].Id3 === undefined) || (this.listeners[idx].Id3 === APCMessage.CONTEXT_P2)) &&
                      ((this.listeners[idx].Id4 === undefined) || (this.listeners[idx].Id4 === APCMessage.CONTEXT_P3)) &&
                      ((this.listeners[idx].Id5 === undefined) || (this.listeners[idx].Id5 === APCMessage.CONTEXT_P4))) {

                      //--> call the callback
                      if (this.listeners[idx].callBack !== undefined) {
                        try {
                          this.listeners[idx].callBack.bind(this.listeners[idx].callBackRef);
                          this.listeners[idx].callBack(APCMessage, this.listeners[idx].callBackRef); //----> delegated callback
                        } catch (exccallback) {
                          //---> bad handling!
                        }
                      }

                      //---> delete if not permanent
                      if (this.listeners[idx].permanent === false) {
                        this.listeners.splice(idx, 1);
                      }

                    } //<-- right context found?

                  } //<-- right context type?
                }

              } //<--- broadcast message ?

            } catch (exc) {
              //--> ?!?! discard message
            }

            /*   ABAP strucure foy YSocket framework
               BEGIN OF zysocket_message,
                     context      TYPE string,
                     context_type TYPE string,
                     message      TYPE string,
                     message_type TYPE string, <---- E,I,W
                     message_icon TYPE string, 
                     datastream   TYPE string,
                     CONTEXT_P1	  TYPE STRING,
                     CONTEXT_P2	  TYPE STRING,
                     CONTEXT_P3	  TYPE STRING,
                     CONTEXT_P4	  TYPE STRING,
                   END OF zysocket_message .*/

          }.bind(this));

          //--> error handling
          this.connection.attachError(function (oControlEvent) {
            this.isMasterFail = true;
          }.bind(this));

          //--> onConnectionClose
          this.connection.attachClose(function (oControlEvent) {

            if (this.isMasterFail) {
              return;
            }

            //---> retry connection after 1 second wait
            setTimeout(function () {
              this.__internal_setup_channel();
            }.bind(this), 1000);

          }.bind(this));

        }.bind(this)
      });


  }

  __internal_set_headerForAPC(hdrPar: string, hdrVal: string) {

    this.sapConnections.forEach((odataConnection) => {
      var hdrs = odataConnection.odv4.getHttpHeaders()
      hdrs[hdrPar] = hdrPar
      this.sapConnections[0].odv4.changeHttpHeaders(hdrs)
    })

  }

  deleteAllListeners() {
    this.listeners = [];
  }

  deleteListenersByTypeAndId1(id1, contextType) {
    do {
      var fnd = this.listeners.find(function (sitem) {
        return (sitem.Id1 === id1 && sitem.contextType === contextType);
      });

      if (fnd !== undefined) {
        this.listeners.splice(this.listeners.indexOf(fnd), 1);
      }

    } while (fnd !== undefined);
  }

  deleteListenersByid1(id1) {
    do {
      var fnd = this.listeners.find(function (sitem) {
        return (sitem.Id1 === id1);
      });

      if (fnd !== undefined) {
        this.listeners.splice(this.listeners.indexOf(fnd), 1);
      }

    } while (fnd !== undefined);
  }

  addListenerPermanent(contextId, contextType, callBack, callbackRef) {
    var listener = new Object();
    listener.permanent = true;
    listener.contextType = contextType;

    if (typeof contextId == 'object') {
      listener.Id1 = contextId.id1;
      listener.Id2 = contextId.id2;
      listener.Id3 = contextId.id3;
      listener.Id4 = contextId.id4;
    } else if ((typeof contextId == 'object') && (contextId.length !== undefined)) {
      try {
        listener.Id1 = contextId[0];
        listener.Id2 = contextId[1];
        listener.Id3 = contextId[2];
        listener.Id4 = contextId[3];
      } catch (exc) {

      }
    } else {
      //---> assume context1 provided
      listener.Id1 = contextId;
    }

    if (listener.Id2 === undefined) {
      listener.Id2 = '';
    }

    if (listener.Id3 === undefined) {
      listener.Id3 = '';
    }

    if (listener.Id4 === undefined) {
      listener.Id4 = '';
    }

    if (listener.Id5 === undefined) {
      listener.Id5 = '';
    }

    listener.callBack = callBack; //<--- callback after message from server
    listener.callBackRef = callbackRef;
    listener.showMessageStrip = false; //<-- not allowed in angular


    this.listeners.push(listener);
  }


  setAPCparameters(url: string, appId: string) {
    this.APCparameters = {
      APCurl: url,
      appId: appId
    }
  }

  activateSAPconnection(version, logonServiceUrl, userName: string, password: string, APCactive: boolean) {

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
          window.sap.ui.require(['sap/ui/model/json/JSONModel', 'fioritalframework/uy5/helper/UY5CORE', 'sap/ui/core/ws/WebSocket', 'it/fiorital/fioritalui5lib/controls/FioritalMessageStrip'],
            function (JSONModel, UY5CORE, UI5WS, UI5messageBox) {

              //--> store globally the constructor              
              window.UY5CORE = UY5CORE
              this.UI5WS = UI5WS
              this.JSONModel = JSONModel
              this.UI5messageBox = UI5messageBox

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
