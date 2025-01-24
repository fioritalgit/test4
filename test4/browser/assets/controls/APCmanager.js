/* eslint-disable sap-no-hardcoded-url */
/* eslint no-undef: 0 */

sap.ui.define([
	"sap/ui/base/ManagedObject",
	"it/fiorital/fioritalui5lib/controls/FioritalMessageStrip",
	"sap/ui/core/ws/WebSocket",
	"it/fiorital/fioritalui5lib/libs/pako",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel"
], function (ManagedObject, FioritalMessageStrip, WS, GZIP, messageBox, JSONModel) {
	"use strict";
	return ManagedObject.extend("it.fiorital.fioritalui5lib.controls.APCmanager", {

		metadata: {
			properties: {

			},
			events: {
				onAPCmessage: {
					parameters: {
						message: {
							type: "object"
						},
						isBroadcastMessage: {
							type: "boolean"
						}
					}
				}
			}
		},

		messageStrip: FioritalMessageStrip,
		GZIP: GZIP,
		messageBox: messageBox,
		
		__internal_set_header: function(componentRef,hdrPar,hdrVal){
			
			var obj = {};
			obj[hdrPar] = hdrVal;
			
			
			//--> install special header over odata models
			var modelsTarget = {urls: []};
			for (var key in componentRef.getManifest()['sap.app'].dataSources) {
				modelsTarget.urls.push(componentRef.getManifest()['sap.app'].dataSources[key].uri);
			}
			
			modelsTarget.hdrPar = hdrPar;
			modelsTarget.hdrVal = hdrVal;
			
			
			//--> pre process all 
			$.ajaxPrefilter(function( options, originalOptions, jqXHR ) {
					
					var fnd = this.urls.find(function(surl){
						if (options.url.search(surl) > -1){
							return true;	
						}else{
							return false; 
						}
					});
					
					//--> url of model add header
					if (fnd !== undefined){
						jqXHR.setRequestHeader(this.hdrPar, this.hdrVal);	
					}
			        
			}.bind(modelsTarget));
			
		},
		
		getRandomInt: function(min, max) {
		    min = Math.ceil(min);
		    max = Math.floor(max);
		    return Math.floor(Math.random() * (max - min + 1)) + min;
		},

		constructor: function (componentRef, apcBaseUrl, appId) {

			this.connected = false;

			this.appId = appId;
			this.__internal_set_header(componentRef,'fioritalapp',this.appId);


			this.listeners = []; //<-- internal listner queue

			ManagedObject.prototype.constructor.apply(this, undefined);

			this.jsonYsocket = new JSONModel();
			this.jsonYsocket.attachRequestCompleted(function (evt) {

				var ysondata = this.jsonYsocket.getData().value;

				//--> handshake (fixed)
				ysondata.forEach(function (sdata) {

					if (sdata.parname === 'YSOCKET_HANDSHAKE' && this.urlHandShake === '') {
						this.urlHandShake = sdata.parvalue;
					}

				}.bind(this));

				if (this.randomAPC) {  //<-- random APC channel selection 
				
					//--> websocket endpoint (round robin)
					var apsc =[]; 
					ysondata.forEach(function (sdata) {
						if (sdata.parname === 'YSOCKET_WSS' && roundrobin === 'X' && this.urlWebSocket === '') {
							apcs.push(sdata);
						}
					}.bind(this));
					
					//--> have some APC in round ? if not take standard
					if (apcs.length === 0) {
						ysondata.forEach(function (sdata) {
							if (sdata.parname === 'YSOCKET_WSS' && this.urlWebSocket === '') {
								this.urlWebSocket = sdata.parvalue;
							}
						}.bind(this));
					}else{
						
						//--> random select of round robin APC
						var rnd = this.getRandomInt(0,apsc.length-1);
						this.urlWebSocket = apcs[rnd].parvalue;
						this.__internal_set_header(componentRef,'specificapc',apcs[rnd].apcid);
						
					}
				

				} else {

					//--> websocket endpoint (app based)
					var fndSpecific = false;
					ysondata.forEach(function (sdata) {
						if (sdata.parname === 'YSOCKET_WSS' && sdata.appid === this.appId && this.urlWebSocket === '') {
							this.urlWebSocket = sdata.parvalue;
							fndSpecific = true;
						}
					}.bind(this));

					//--> websocket endpoint (generic in case app based not availabl)
					if (fndSpecific === false) {
						ysondata.forEach(function (sdata) {
							if (sdata.parname === 'YSOCKET_WSS' && this.urlWebSocket === '') {
								this.urlWebSocket = sdata.parvalue;
							}
						}.bind(this));
					}

				}

				//--> initiate connections
				this.__internal_setup_channel();
			}.bind(this));

			this.jsonYsocket.loadData(apcBaseUrl);

		},

		deleteAllListeners: function () {
			this.listeners = [];
		},

		deleteListenersByTypeAndId1: function (id1, contextType) {

			do {
				var fnd = this.listeners.find(function (sitem) {
					return (sitem.Id1 === id1 && sitem.contextType === contextType);
				});

				if (fnd !== undefined) {
					this.listeners.splice(this.listeners.indexOf(fnd), 1);
				}

			} while (fnd !== undefined);

		},

		deleteListenersByid1: function (id1) {

			do {
				var fnd = this.listeners.find(function (sitem) {
					return (sitem.Id1 === id1);
				});

				if (fnd !== undefined) {
					this.listeners.splice(this.listeners.indexOf(fnd), 1);
				}

			} while (fnd !== undefined);

		},

		addListenerPermanent: function (contextId, contextType, callBack, showMessageStrip) {
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

			if ((showMessageStrip == undefined) || (showMessageStrip == true)) {
				listener.showMessageStrip = true;
			} else {
				listener.showMessageStrip = false;
			}

			this.listeners.push(listener);
		},

		addListenerSingle: function (contextId, contextType, callBack, showMessageStrip) {
			var listener = new Object();
			listener.permanent = false;
			listener.contextType = contextType;

			if (typeof contextId == 'object') {
				listener.Id1 = contextId.id1;
				listener.Id2 = contextId.id2;
				listener.Id3 = contextId.id3;
				listener.Id4 = contextId.id4;
				listener.Id5 = contextId.id5;
			} else if ((typeof contextId == 'object') && (contextId.length !== undefined)) {
				try {
					listener.Id1 = contextId[0];
					listener.Id2 = contextId[1];
					listener.Id3 = contextId[2];
					listener.Id4 = contextId[3];
					listener.Id5 = contextId[4];
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

			if ((showMessageStrip == undefined) || (showMessageStrip == true)) {
				listener.showMessageStrip = true;
			} else {
				listener.showMessageStrip = false;
			}

			this.listeners.push(listener);
		},

		__internal_setup_channel: function () {

			$.ajax(this.urlHandShake, // request url
				{
					timeout: 10000,
					error: function () {
						this.messageBox.show(
							"RICARICARE PAGINA AL PIU PRESTO,SE IL PROBLEMA PERSISTE CONTATTARE REPARTO IT", {
								icon: this.messageBox.Icon.ERROR,
								title: "ATTENZIONE!!! CONNESSIONE AL SERVER NON CONFERMATA!",
								actions: [this.messageBox.Action.YES]
							}
						);
					}.bind(this),

					success: function (data, status, xhr) {

						this.connection = new WS(this.urlWebSocket);

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

									//---> broadcasted messages must be handled in event function !!
									this.fireEvent("onAPCmessage", {
										message: APCMessage,
										isBroadcastMessage: true
									});

								} else {

									for (var idx = 0; idx < this.listeners.length; idx++) {
										var isRelevantMessage = true;

										if (this.listeners[idx].contextType === '' || this.listeners[idx].contextType === '*' || this.listeners[idx].contextType === APCMessage.CONTEXT_TYPE) {

											if ((this.listeners[idx].Id1 !== undefined) && (this.listeners[idx].Id1 !== APCMessage.CONTEXT)) {
												isRelevantMessage = false;
											}

											if (this.listeners[idx].Id2 !== '' && this.listeners[idx].Id2 !== undefined && this.listeners[idx].Id2 !== APCMessage.CONTEXT_P1) {
												isRelevantMessage = false;
											}

											if (this.listeners[idx].Id3 !== '' && this.listeners[idx].Id3 !== undefined && this.listeners[idx].Id3 !== APCMessage.CONTEXT_P2) {
												isRelevantMessage = false;
											}

											if (this.listeners[idx].Id4 !== '' && this.listeners[idx].Id4 !== undefined && this.listeners[idx].Id4 !== APCMessage.CONTEXT_P3) {
												isRelevantMessage = false;
											}

											if (this.listeners[idx].Id5 !== '' && this.listeners[idx].Id5 !== undefined && this.listeners[idx].Id5 !== APCMessage.CONTEXT_P4) {
												isRelevantMessage = false;
											}

											//---> relevant message ? handle it
											if (isRelevantMessage === true) {

												this.fireEvent("onAPCmessage", {
													message: APCMessage,
													isBroadcastMessage: false
												});

												//--> show message ?
												if (this.listeners[idx].showMessageStrip === true) {

													var status = '';

													//--> check message type (set default if not provided)
													if (APCMessage.MESSAGE_TYPE == undefined || APCMessage.MESSAGE_TYPE == '') {
														APCMessage.MESSAGE_TYPE = 'I';
													}

													if (APCMessage.MESSAGE_ICON == undefined || APCMessage.MESSAGE_ICON == '') {
														APCMessage.MESSAGE_ICON = 'sap-icon://sys-enter';
													}

													switch (APCMessage.MESSAGE_TYPE) {
													case 'I':
														status = 'info';
														break;
													case 'W':
														status = 'warning';
														break;
													case 'E':
														status = 'error';
														break;
													default:
													}

													//---> fire the toast message
													new FioritalMessageStrip(APCMessage.MESSAGE, {
														status: status,
														icon: APCMessage.MESSAGE_ICON,
														timeout: 8000
													});

												}

												//--> call the callback
												if (this.listeners[idx].callBack !== undefined) {
													try {
														this.listeners[idx].callBack.bind(this);
														this.listeners[idx].callBack(APCMessage); //----> delegated callback
													} catch (exccallback) {
														//---> bad handling!
													}
												}

												//---> delete if not permanent
												if (this.listeners[idx].permanent === false) {
													this.listeners.splice(idx, 1);
												}

											} //<-- righe message to handle

										} //<-- right context type

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

							this.messageBox.show(
								"RICARICARE PAGINA AL PIU PRESTO,SE IL PROBLEMA PERSISTE CONTATTARE REPARTO IT", {
									icon: this.messageBox.Icon.ERROR,
									title: "ATTENZIONE!!! CONNESSIONE AL SERVER NON CONFERMATA!",
									actions: [this.messageBox.Action.YES]
								}
							);
							
							this.isMasterFail = true;

						}.bind(this));

						//--> onConnectionClose
						this.connection.attachClose(function (oControlEvent) {
							
							if (this.isMasterFail){
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

	});

}, true);