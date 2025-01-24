 /* eslint-disable */

 //----------------------------------------------------------------------------------------
 // DYNAMIC ODATA function call with DYNAMIC loaded models
 //----------------------------------------------------------------------------------------

 sap.ui.define(["sap/ui/base/ManagedObject", "sap/base/Log", "sap/m/MessageBox", "sap/ui/core/format/DateFormat",
 		"it/fiorital/fioritalui5lib/framework/uy5/helper/DYNMODEL",
 		"it/fiorital/fioritalui5lib/framework/uy5/model/json/JSONModel",
 		"it/fiorital/fioritalui5lib/libs/cryptojs"
 	],
 	function (ManagedObect, Log, MessageBox, DateFormat, DYNMODEL, JSONModelExt, cryptojs) {
 		"use strict";
 		return ManagedObect.extend('it.fiorital.fioritalui5lib.framework.uy5.helper.UY5CORE', {
 			metadata: {
 				properties: {}
 			},

 			sStreamParams: null,
 			sModel: null,
 			componentId: null,
 			component: null,
 			EXT_SuccessCall: null,
 			EXT_FailCall: null,
 			ResultRaw: null,
 			Result: null,
 			exceptionText: null,
 			ObjToPass: null,
 			SyncModels: [],
 			SAPmodels: [],
 			INTERNAL_getXMLsuccess: null,
 			INTERNAL_getXMLfail: null,
 			inCall: null,
 			modelDeferred: null,
 			DeferredArgsStack: null,
 			actbc: null,
 			disableRegexpOnJSONResults: false,

 			constructor: function (connectionName, modelRef, xmlModelPath, disableRegexpEscapigOnJSONResults, sendXsession) {
 				ManagedObect.call(this);

 				sap.UY5globalReference = this;

 				this.modelDeferred = $.Deferred(); //<-- global deferred object to wait for modal load
 				this.tokenDeferred = $.Deferred(); //<-- global deferred object to wait for modal load
 				this.DeferredArgsStack = [];

 				this.sStreamParams = [];
				this.connectionName = connectionName;
 				this.SyncModels = [];
 				this.sModel = modelRef;
 				this.component = undefined;
 				this.inCall = false;
				this.xmlModelPath = xmlModelPath;

 				this.lastCleared = true;
 				this.lastCalledFunction = '';

 				if (disableRegexpEscapigOnJSONResults !== null && disableRegexpEscapigOnJSONResults !== undefined) {
 					this.disableRegexpOnJSONResults = disableRegexpEscapigOnJSONResults;
 				}

 				//---> create unique sesion ID and cyper random keys
 				this.sessionId = this.uuidv4();
 				this.cypherIv = this.makeid(19);
 				this.cypherKey = this.makeid(32);

 				if (sendXsession === true) {
 					this.setXsessionData();
 				}

 			},

 			uuidv4: function () {
 				return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
 					(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
 				);
 			},

 			makeid: function (length) {
 				var result = '';
 				var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
 				var charactersLength = characters.length;
 				for (var i = 0; i < length; i++) {
 					result += characters.charAt(Math.floor(Math.random() *
 						charactersLength));
 				}
 				return result;
 			},

 			init: function () {},

 			_INTERNAL_stringToMode: function (modeStr) {
 				if (modeStr === "push") {
 					return 1;
 				}
 				if (modeStr === "pull") {
 					return 2;
 				}
 				if (modeStr === "twoway") {
 					return 3;
 				}
 			},

 			SyncModel: function (name) {

 				for (var idx = 0; idx < this.SyncModels.length; idx++) {
 					if (this.SyncModels[idx]['NAME'] == name) {
 						return this.SyncModels[idx];
 					}
 				}

 			},

 			_INTERNAL_getAutoMap: function (mElement) {

 			},

 			/**
 			 * Load XML models used by DYNAMIC function call.
 			 * @param oModel: ODATA model binded with DYN model
 			 */
 			loadXMLModels: function (oModel) {

 				if (oModel === null) {
 					Log.error("SAPdynCall NOT initialized: ODATA model to bind is null!");
 				}

 				var dynfCall = this;

 				//--> Initialize dynamic models manager
 				this.setModel(oModel);
 				oModel.attachMetadataLoaded(null, function () {

 					//--> Get XML models
 					dynfCall.getXMLModels(
 						function () { //<-- Success Callback
 							Log.info("SAPdynCall loaded XML models");
 						},
 						function () { //<-- Error Callback
 							MessageBox.alert("SAPdynCall FAILED to load XML models");
 						}
 					);

 				}, null); //<-- oModel.attachMetadataLoaded(null, function(){	

 			},

 			addParamField: function (field, as, FieldProperty) {
 				var fld = sap.ui.getCore().byId(field);

 				var value;
 				if (FieldProperty !== undefined) {
 					value = fld.getProperty(FieldProperty);
 				} else {
 					value = fld.getProperty("value");
 				}

 				this.addSinglePar(as, value);
 				return this;
 			},

 			addParamTable: function (as, varval) {
 				var value = btoa(JSON.stringify(varval));
 				this.addSinglePar(as, value);
 				return this;
 			},

 			addParamConstant: function (varval, as) {
 				var value = varval;
 				this.addSinglePar(as, value);
 				return this;
 			},

 			addParamVar: function (varname, as) {
 				var value = eval("window."+this.connectionName +'_' + varname);
 				this.addSinglePar(as, value);
 				return this;
 			},

 			addParamFieldRow: function (field, as, evt) {

 				var sPar = evt.getParameter('listItem');

 				if (sPar !== undefined) {
 					var context = evt.getParameter('listItem').getBindingContext();
 					var value = context.getProperty(field);
 					this.addSinglePar(as, value);
 				} else {
 					var model = evt.getSource().getModel();
 					var path = evt.getSource().getBindingContext().getPath();
 					var obj = model.getProperty(path);
 					this.addSinglePar(as, obj[field]);
 				}

 				return this;
 			},

 			setAutoMapFieldsForController: function (ctrl) {
 				var vw = ctrl.oView;
 				this._INTERNAL_getAutoMap(vw);
 			},

 			_INTERNAL_getXMLModelsAjax: function (xmlDoc) {

 				this.SAPmodels = [];

 				for (var idx = 0; idx < xmlDoc.documentElement.childNodes.length - 1; idx++) {
 					if (xmlDoc.documentElement.childNodes[idx].tagName !== undefined) {
 						this.SAPmodels.push(xmlDoc.documentElement.childNodes[idx]);
 					}
 				}

 				var SAPmodelsRequest = [];

 				//---> every child is a model; get list of SAP models to get
 				for (var idx = 0; idx < this.SAPmodels.length; idx++) {
 					if (this.SAPmodels[idx].tagName !== undefined && this.SAPmodels[idx].getAttribute("DDIC_type") !== null) {
 						var newSAPSyncModel = new Object();
 						newSAPSyncModel['NAME'] = this.SAPmodels[idx].getAttribute("name");
 						newSAPSyncModel['DATA'] = this.SAPmodels[idx].getAttribute("DDIC_type");
 						newSAPSyncModel['TYPE'] = this.SAPmodels[idx].getAttribute("type");
 						SAPmodelsRequest.push(newSAPSyncModel);
 					}

 					//--> local defintion
 					if (this.SAPmodels[idx].tagName !== undefined && this.SAPmodels[idx].getAttribute("DDIC_type") === null) {

 						var newSAPSyncModel = new Object();
 						newSAPSyncModel['NAME'] = this.SAPmodels[idx].getAttribute("name");

 						var local_DDIC = [];

 						for (var j = 0; j < this.SAPmodels[idx].getElementsByTagName("fields")[0].childNodes.length - 1; j++) {
 							if (this.SAPmodels[idx].getElementsByTagName("fields")[0].childNodes[j].tagName !== undefined) {
 								var localField = new Object();
 								localField["FIELDNAME"] = this.SAPmodels[idx].getElementsByTagName("fields")[0].childNodes[j].getAttribute("name");
 								local_DDIC.push(localField);
 							}
 						}

 						//--> get Syncgroups
 						var syncGroups = [];
 						if (this.SAPmodels[idx].getElementsByTagName("syncgroups").length > 0) {
 							for (var j = 0; j < this.SAPmodels[idx].getElementsByTagName("syncgroups")[0].childNodes.length - 1; j++) {
 								if (this.SAPmodels[idx].getElementsByTagName("syncgroups")[0].childNodes[j].tagName != undefined) {
 									syncGroups.push(this.SAPmodels[idx].getElementsByTagName("syncgroups")[0].childNodes[j].getAttribute("syncid"));
 								}
 							}
 						}

 						//--> get binders
 						var binders = [];
 						if (this.SAPmodels[idx].getElementsByTagName("binders").length > 0) {
 							for (var j = 0; j < this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes.length - 1; j++) {
 								if (this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].tagName != undefined) {
 									var bindObj = new Object();
 									bindObj["CTRLID"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("ctrlId");
 									bindObj["AGGREGATION"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("aggregation");
 									bindObj["FILTER"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("filter");
 									bindObj["LATE"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("late");
 									bindObj["binded"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("binded");
 									bindObj["NOAGGREGATIONMODEL"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute(
 										"noAggregationModel");
 									bindObj["LATEPATH"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("latePath");
 									binders.push(bindObj);
 								}
 							}
 						}

 						//--> create the JSON model & the wrapper
 						this.addSyncModel(this.SAPmodels[idx].getAttribute("name"), this._INTERNAL_stringToMode(this.SAPmodels[idx].getAttribute("mode")),
 							null,
 							local_DDIC, syncGroups, binders, this.SAPmodels[idx].getAttribute("type"));

 					}

 				}

 				//---> search stream param & set or replace
 				var found = 0;
 				for (var idx = 0; idx < this.sStreamParams.length; idx++) {
 					if (this.sStreamParams[idx]["Parid"] === "MODELS_MAP") {
 						found = 1;
 						this.sStreamParams[idx]['DATA'] = btoa(JSON.stringify(SAPmodelsRequest));
 					}
 				}

 				if (found === 0) {
 					var sParam = new Object();
 					sParam['PARID'] = "MODELS_MAP";
 					sParam['DATA'] = btoa(JSON.stringify(SAPmodelsRequest));
 					this.sStreamParams.push(sParam);
 				}

 				//---> push session and Cypher data
 				this.sStreamParams.push({
 					PARID: 'XSESSIONID',
 					DATA: this.sessionId
 				});
 				this.sStreamParams.push({
 					PARID: 'CYPHERIV',
 					DATA: this.cypherIv
 				});
 				this.sStreamParams.push({
 					PARID: 'CYPHERKEY',
 					DATA: this.cypherKey
 				});

 				//--> set the header
 				this.sModel.changeHttpHeaders({
 					XSESSIONID: this.sessionId
 				});

 				//---> special call to SAP to get DDIC models
 				this.callFunction("INTERNAL_GET_DDIC", function (dt) {

 						var baseModelsExists = false;

 						for (var key in dt) {
 							var DDIC = dt[key];

 							for (var idx = 0; idx <= this.SAPmodels.length - 1; idx++) {

 								if (this.SAPmodels[idx].getAttribute("DDIC_type") === key) {

 									var syncGroups = [];
 									if (this.SAPmodels[idx].getElementsByTagName("syncgroups").length > 0) {
 										for (var j = 0; j < this.SAPmodels[idx].getElementsByTagName("syncgroups")[0].childNodes.length - 1; j++) {
 											if (this.SAPmodels[idx].getElementsByTagName("syncgroups")[0].childNodes[j].tagName !== undefined) {
 												var singleSyncId = this.SAPmodels[idx].getElementsByTagName("syncgroups")[0].childNodes[j].getAttribute("syncid");
 												if (singleSyncId === 'BASE_MODELS') {
 													baseModelsExists = true;
 												}
 												syncGroups.push(singleSyncId);
 											}
 										}
 									}

 									//--> get binders
 									var binders = [];
 									if (this.SAPmodels[idx].getElementsByTagName("binders").length > 0) {
 										for (var j = 0; j < this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes.length - 1; j++) {
 											if (this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].tagName != undefined) {
 												var bindObj = new Object();
 												bindObj["CTRLID"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("ctrlId");
 												bindObj["AGGREGATION"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("aggregation");
 												bindObj["FILTER"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("filter");
 												bindObj["LATE"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("late");
 												bindObj["binded"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("binded");
 												bindObj["NOAGGREGATIONMODEL"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute(
 													"noAggregationModel");
 												bindObj["LATEPATH"] = this.SAPmodels[idx].getElementsByTagName("binders")[0].childNodes[j].getAttribute("latePath");
 												binders.push(bindObj);
 											}
 										}
 									}

 									//--> create the JSON model & the wrapper
 									this.addSyncModel(this.SAPmodels[idx].getAttribute("name"), this._INTERNAL_stringToMode(this.SAPmodels[idx].getAttribute(
 											"mode")),
 										null, DDIC, syncGroups, binders, this.SAPmodels[idx].getAttribute("type"));

 								} //<-- if (this.SAPmodels[idx].getAttribute("DDIC_type") == key) {

 							} //<-- for (var idx = 0; idx <= this.SAPmodels.length - 1; idx++) {

 						} //<-- for (var key in dt) {

 						//---> read from persistence original status
 						if (this.persisteModels === true) {
 							this.initLocalPersistence();
 						}

 						//---> auto load the base models
 						if (baseModelsExists === true) {

 							this.clearParameters();
 							this.callFunction("GET_BASE_MODELS",
 								function () {
 									this.INTERNAL_getXMLsuccess();
 									this.modelDeferred.resolveWith(this); //<--- resolve deferred object !	
 								},
 								function () {
 									//--->real shit man, should not happen....
 								}, "BASE_MODELS");

 						} else {
 							this.INTERNAL_getXMLsuccess();
 							this.modelDeferred.resolveWith(this); //<--- resolve deferred object !	
 						}

 					},
 					function () {
 						MessageBox.alert("Error reading SAP-DDIC structures!");
 					});

 			}, //<-- _INTERNAL_getXMLModelsAjax : function(xmlDoc) 

 			getXMLModels: function (success, fail, persisteModels) {

 				if (persisteModels === undefined) {
 					this.persisteModels = false;
 				} else {
 					this.persisteModels = persisteModels;
 				}

 				this.INTERNAL_getXMLsuccess = success;
 				this.INTERNAL_getXMLfail = fail;

 				var ajaxInternalCallback = this._INTERNAL_getXMLModelsAjax.bind(this);

 				//---> must get from namespace
 				var XMLurl = this.xmlModelPath;

 				//---> retrive XML document from server
 				$.ajax({
 					type: "GET",
 					url: XMLurl, //"./model/DYNM_SAP_models.xml"
 					cache: false,
 					dataType: "xml",
 					success: ajaxInternalCallback,
 					error: function (jqXHR, textStatus, errorThrown) {
 						MessageBox.alert("Error loading local XML defintion file for SAP-DDIC structures!");
 					}
 				});

 			},

 			_INTERNAL_getWrapper: function (modelName) {
 				for (var idx = 0; idx < this.SyncModels.length; idx++) {
 					if (this.SyncModels[idx]["NAME"] === modelName) {
 						return this.SyncModels[idx]["WRAPPER"];
 					}
 				}
 			},

 			_INTERNAL_bindExplicit: function (ctrlId, aggregation, filter, SyncModel, binded) {

 				//--> got it, now add binding in list and link with UI element
 				var bindObj = new Object();
 				bindObj["CTRLID"] = ctrlId;
 				bindObj["AGGREGATION"] = aggregation;
 				bindObj["FILTER"] = filter;
 				bindObj["binded"] = binded;
 				SyncModel['BINDERS'].push(bindObj);

 				this._INTERNAL_linkBinder(bindObj, SyncModel);

 			},

 			bindExplicit: function (modelName, ctrlId, aggregation, filter) {

 				for (var i = 0; i <= this.SyncModels.length - 1; i++) {
 					if (this.SyncModels[i]['NAME'] === modelName) {
 						this._INTERNAL_bindExplicit(ctrlId, aggregation, filter, this.SyncModels[i]);
 					}
 				}

 			},

 			lateBindModel: function (modelName) {

 				for (var idx = 0; idx < this.SyncModels.length; idx++) {
 					if (this.SyncModels[idx]["NAME"] === modelName) {
 						this._INTERNAL_linkBinders(this.SyncModels[idx].BINDERS, this.SyncModels[idx], true); //<--- late bind
 					}
 				}
 			},

 			lateBindAll: function (modelName) {

 				for (var idx = 0; idx < this.SyncModels.length; idx++) {
 					this._INTERNAL_linkBinders(this.SyncModels[idx].BINDERS, this.SyncModels[idx], true); //<--- late bind
 				}
 			},

 			addSyncModel: function (modelName, way, explicitModel, structure, syncGroups, binders, type) {

 				var newSyncModel = new Object();

 				newSyncModel['PARENT'] = this; //<---- reference to master object
 				newSyncModel['TYPE'] = type; //<---- table / structure / field
 				newSyncModel['NAME'] = modelName;
 				newSyncModel['MODE'] = way; //<--- it.fiorital.fioritalui5lib.framework.uy5.helper.DYNFCALL.ModelMode_xxx
 				newSyncModel['SYNCGROUPS'] = syncGroups;
 				newSyncModel['BINDERS'] = binders;
 				newSyncModel['STRUCTUREDATA'] = new Object(); //<--- used in case of structure mapping (no JSON model)
 				newSyncModel['FIELDDATA'] = null; //<--- used in case of field mapping (no JSON model)	

 				if (explicitModel === null) {
 					newSyncModel['JSMODEL'] = new JSONModelExt(undefined, newSyncModel);
 					//newSyncModel['JSMODEL'].setPagination(1);   //<--- HT TEST TEST
 					newSyncModel['JSMODEL'].setSizeLimit(100000);
 				} else {
 					newSyncModel['JSMODEL'] = explicitModel;
 				}

 				//---> model wrapper
 				newSyncModel['WRAPPER'] = new DYNMODEL(newSyncModel['JSMODEL'], structure, type);
 				newSyncModel['WRAPPER'].TYPE = type;
 				newSyncModel['WRAPPER'].parent = newSyncModel;

 				//---> access to wrapper from DYNFCALL class
 				var fct = new Function("return this._INTERNAL_getWrapper('" + modelName + "');");
 				Object.defineProperty(this, modelName, {
 					get: fct
 				});

 				//---> publish also as global var
 				eval("window."+this.connectionName +'_' + modelName + " = newSyncModel['WRAPPER'];");

 				this.SyncModels.push(newSyncModel);

 				//---> auto bind items (for Json models bind)
 				this._INTERNAL_linkBinders(binders, newSyncModel, false);

 			},

 			_INTERNAL_linkBinderTable: function (binder, SyncModel) {
				//--> DEPRECATED 
 			},

 			_INTERNAL_linkBinderStructure: function (binder, SyncModel) {
 				//--> DEPRECATED 
 			},

 			_INTERNAL_linkBinder: function (binder, SyncModel) {
 				//--> DEPRECATED 
 			},

 			_INTERNAL_linkBinders: function (binders, SyncModel, lateBinding) {
				//--> DEPRECATED 
 			},

 			_INTERNAL_getSAPPAR: function (syncGroup) {

 				var flds = [];

 				try {
 					flds = sap.ui.getCore().byFieldGroupId('SAPPAR');
 				} catch (err) {
 					//-->nothing to do  
 				}

 				var flds_final = [];

 				//---> remove childs....
 				for (var idx = 0; idx < flds.length; idx++) {

 					var found = false;
 					for (var j = 0; j < flds.length; j++) {
 						if (flds[idx].getParent() === flds[j]) {
 							found = true;
 						}
 					}

 					if (found === false) {
 						flds_final.push(flds[idx]);
 					}
 				}

 				//---> now get vars & map them
 				for (var idx = 0; idx < flds_final.length; idx++) {

 					//---> get the value to pick from other ids
 					var valType = flds_final[idx].getFieldGroupIds()[1];
 					if (valType !== undefined) {

 						var sParam = new Object();
 						sParam['PARID'] = flds_final[idx].getId().split("--")[flds_final[idx].getId().split("--").length - 1];

 						try {
 							sParam['DATA'] = flds_final[idx].getProperty(valType);
 						} catch (err) {
 							sParam['DATA'] = '';
 						}

 						this.sStreamParams.push(sParam);
 					}

 				}

 			},

 			_INTERNAL_getSAPMAP: function (syncGroup) {

 			},

 			_INTERNAL_getModelMapDirect: function (modelsList) {

 				var SyncStreamModels = [];

 				//--> loop on every requested model
 				modelsList.forEach(function (requestedModel) {

 					//--> identify model
 					var innerModel;
 					this.SyncModels.forEach(function (smodel) {

 						if (smodel['NAME'] === requestedModel.MODEL_NAME) {
 							innerModel = smodel;
 						}

 					}.bind(this));

 					var newSimpleSyncModel = new Object();
 					newSimpleSyncModel['NAME'] = requestedModel.MODEL_NAME;
 					newSimpleSyncModel['MODE'] = 3;

 					//--> Inner model 
 					if (innerModel != undefined && innerModel !== null) {

 						var jsonStr;
 						if (innerModel['TYPE'] === 'table') {
 							jsonStr = innerModel['JSMODEL'].getData();

 							if (jsonStr !== undefined) {
 								jsonStr.forEach(function (v) {
 									delete v.$loki;
 								}); //<-- remove local indexes used by lokiJs	
 							}

 						} else {
 							//jsonStr = innerModel['STRUCTUREDATA'];
 							jsonStr = innerModel['JSMODEL'].getData();
 						}

 						var encBase64 = btoa(JSON.stringify(jsonStr));
 						newSimpleSyncModel['DATA'] = encBase64;

 						SyncStreamModels.push(newSimpleSyncModel);

 					} else {
 						Log.error("UY5CORE: model undefined in XML template: " + requestedModel.MODEL_NAME);
 					}

 				}.bind(this));

 				//---> search stream param & set or replace
 				if (SyncStreamModels.length > 0) {

 					var found = 0;
 					for (var idx = 0; idx < this.sStreamParams.length; idx++) {
 						if (this.sStreamParams[idx]["Parid"] === "MODELS_MAP") {
 							found = 1;
 							this.sStreamParams[idx]['DATA'] = btoa(JSON.stringify(SyncStreamModels));
 						}
 					}

 					if (found === 0) {
 						var sParam = new Object();
 						sParam['PARID'] = "MODELS_MAP";
 						sParam['DATA'] = btoa(JSON.stringify(SyncStreamModels));
 						this.sStreamParams.push(sParam);
 					}

 				}

 			},

 			_INTERNAL_getModelMap: function (syncGroup) {

 				var ModelCount;
 				ModelCount = 0;

 				if (this.SyncModels.length > 0) {

 					var SyncStreamModels = [];

 					for (var idx = 0; idx < this.SyncModels.length; idx++) {

 						//---> model filter ???
 						var okModel = false;
 						if (syncGroup === "") {
 							okModel = true;
 						} else {
 							for (var j = 0; j < this.SyncModels[idx]["SYNCGROUPS"].length; j++) {
 								if (this.SyncModels[idx]["SYNCGROUPS"][j] === syncGroup) {
 									okModel = true;
 									break;
 								}
 							}
 						}

 						//---> ok push it to SAP
 						if (okModel === true) {

 							ModelCount++;
 							var newSimpleSyncModel = new Object();
 							newSimpleSyncModel['NAME'] = this.SyncModels[idx]['NAME'];
 							newSimpleSyncModel['MODE'] = this.SyncModels[idx]['MODE'];

 							//---> push data ?? 
 							if (this.SyncModels[idx]['MODE'] === 1 || this.SyncModels[idx]['MODE'] === 3) {

 								var jsonStr;
 								if (this.SyncModels[idx]['TYPE'] === 'table') {
 									jsonStr = this.SyncModels[idx]['JSMODEL'].getData();

 									if (jsonStr !== undefined) {
 										jsonStr.forEach(function (v) {
 											delete v.$loki;
 										}); //<-- remove local indexes used by lokiJs	
 									}

 								} else {
 									jsonStr = this.SyncModels[idx]['JSMODEL'].getData();
 								}

 								var encBase64 = btoa(JSON.stringify(jsonStr));

 								newSimpleSyncModel['DATA'] = encBase64;
 							} else {
 								newSimpleSyncModel['DATA'] = "";
 							}

 							SyncStreamModels.push(newSimpleSyncModel);

 						}

 					}

 					//---> search stream param & set or replace
 					if (ModelCount > 0) {

 						var found = 0;
 						for (var idx = 0; idx < this.sStreamParams.length; idx++) {
 							if (this.sStreamParams[idx]["Parid"] === "MODELS_MAP") {
 								found = 1;
 								this.sStreamParams[idx]['DATA'] = btoa(JSON.stringify(SyncStreamModels));
 							}
 						}

 						if (found === 0) {
 							var sParam = new Object();
 							sParam['PARID'] = "MODELS_MAP";
 							sParam['DATA'] = btoa(JSON.stringify(SyncStreamModels));
 							this.sStreamParams.push(sParam);
 						}

 					}

 				}

 			},

 			addSinglePar: function (parName, parValue) {

 				//--> Store single parmeter
 				var sParam = new Object();
 				sParam['PARID'] = parName;

 				if (parValue instanceof Date) {

 					try {
 						var options = {
 							pattern: "yyyyMMdd" //<-- Pattern for DATS parameters
 						};
 						var df = DateFormat.getDateInstance(options);
 						parValue = df.format(parValue);
 					} catch (ex) {
 						Log.error("Error converting INPUT parameter of type Date to SAP format!");
 					}

 				}

 				sParam['DATA'] = parValue;
 				this.sStreamParams.push(sParam);

 				return this;

 			},

 			addTablePar: function (parName, parValue) {

 				var encBase64 = btoa(JSON.stringify(parValue));

 				//--> Store single parmeter
 				var sParam = new Object();
 				sParam['PARID'] = parName;
 				sParam['DATA'] = encBase64;
 				this.sStreamParams.push(sParam);

 				return this;

 			},

 			addJsonModelPar: function (parName, jsonModel) {

 				//---> get data from jsonModel
 				var jsonStr = jsonModel.getJSON();
 				var encBase64 = btoa(JSON.stringify(jsonStr));

 				//---> store single parmeter
 				var sParam = new Object();
 				sParam['PARID'] = parName;
 				sParam['DATA'] = encBase64;
 				this.sStreamParams.push(sParam);

 				return this;

 			},

 			_ProcessObjectSingle: function (obj) {

 				for (var lclkey in obj) {

 					if (Object.prototype.toString.call(obj[lclkey]) === '[object Array]') {

 						this._ProcessObject(obj[lclkey]);

 					} else {
 						//--> processing block
 						if (lclkey.indexOf("_JS_") >= 0) {
 							var ops = lclkey.split("_JS_");

 							switch (ops[1]) {
 							case 'TIMESTAMP':
 								obj[lclkey] = new Date(obj[lclkey].substr(0, 4), obj[lclkey].substr(4, 2) - 1, obj[lclkey].substr(6, 2), obj[lclkey].substr(8,
 									2), obj[lclkey].substr(10, 2));
 								break;
 							case 'DATE':
 								obj[lclkey] = new Date(obj[lclkey].substr(0, 4), obj[lclkey].substr(4, 2) - 1, obj[lclkey].substr(6, 2));
 								break;
 							case 'BOOL':
 								if (obj[lclkey] === 'X') {
 									obj[lclkey] = true;
 								} else {
 									obj[lclkey] = false;
 								}
 								break;
 							case 'TIME':
 								break;
 							}

 						}
 					}
 				}

 			},

 			_ProcessObject: function (obj) {

 				if (Object.prototype.toString.call(obj) === '[object Array]') {

 					//---> post process based on standard field values...
 					for (var lclidx = 0; lclidx < obj.length; lclidx++) {
 						this._ProcessObjectSingle(obj[lclidx]);
 					}

 				} else {
 					this._ProcessObjectSingle(obj);
 				}

 			},

 			/**
 			 * Automatically refresh binding of controls/aggregations specified on DYNFCALL instantiation.
 			 */
 			_RefreshAndClean: function () {

 				//--> Refresh aggregation bindings	
 				if (this.aggrToRefresh !== undefined && this.aggrToRefresh.length > 0) {

 					for (var i = 0; i < this.aggrToRefresh.length; i++) {

 						try {

 							var multiItemsControl = null; //<-- Multi item control ( eg: list/table )
 							var aggregationId = "items"; //<-- Default aggregation name 
 							if (typeof this.aggrToRefresh[i] === 'string') {
 								multiItemsControl = sap.ui.getCore().byId(this.aggrToRefresh[i]);
 							} else {
 								multiItemsControl = sap.ui.getCore().byId(this.aggrToRefresh[i]["controlId"]); //<-- table/list id 
 								aggregationId = sap.ui.getCore().byId(this.aggrToRefresh[i]["aggregationId"]); //<-- Eg: "items"  
 							}

 							//--> Force refresh of table/list aggregation
 							if (multiItemsControl !== null) {
 								multiItemsControl.getBinding(aggregationId).refresh(true);
 							}

 						} catch (ex) {
 							Log.warning("Simple control binding refresh failed!!!");
 						}

 					} //<-- for ( var i=0; i<aggrToRefresh.length; i++ ) {

 				} //<-- if ( this.aggrToRefresh	!= null && this.aggrToRefresh.length > 0 ) {

 				//--> Refresh simple controls bindings
 				if (this.controlsToRefresh !== undefined && this.controlsToRefresh.length > 0) {

 					for (var i = 0; i < this.controlsToRefresh.length; i++) {

 						try {

 							var simpleControl = sap.ui.getCore().byId(this.controlsToRefresh[i]);
 							var path = simpleControl.getBindingContext().getPath(); //<-- Eg: /CustomersSet(Kunnr='102214',Vtweg='10',Wminr='ITALIA')"		

 							//--> Force refresh
 							simpleControl.bindElement(path + "?refreshAndClean"); //<-- Append any string in URI after "?" to force refresh

 						} catch (ex) {
 							Log.setLevel(sap.base.Log.Level.ALL);
 							Log.info("Simple control '" + this.controlsToRefresh[i] + "' binding refresh failed!!!");
 						}

 					} //<-- for ( var i=0; i<controlsToRefresh.length; i++ ) {

 				} //<-- if ( this.controlsToRefresh	!= null && this.controlsToRefresh.length > 0 ) {

 			}, //<-- _RefreshAndClean : function() 

 			/*
 			 * Helper function to get ABAP export parameters by name
 			 * @return parameter value if parameter exists, otherwise null or undefined if an exception occurs looping export params
 			 */
 			getExpParameter: function (parName) {

 				var outValue = null;

 				try {
 					for (var idx = 0; idx < this.Result.OUT_CTX.EXPORTING.length; idx++) {

 						if (this.Result.OUT_CTX.EXPORTING[idx].PAR_NAME === parName) {
 							outValue = this.Result.OUT_CTX.EXPORTING[idx].PAR_VALUE;
 							break;
 						}

 					}
 				} catch (ex) {
 					outValue = undefined;
 					Log.error("Error occurred parsing export parameter '" + parName + "': " + ex);
 				}

 				//--> Export paramenter not defined
 				return outValue;

 			},

 			_CallSuccess: function (dt) {

 				this.thisRef.loading = false;

 				this.thisRef.exceptionText = '';

 				var oResults = this.actbc.getBoundContext().getObject();

 				//--> Manage ABAP RAISE EXCEPTION
 				var parsedRes;
 				var inException = false;
 				try {
 					parsedRes = JSON.parse(atob(oResults.value));
 					if (parsedRes.exception !== undefined) {
 						inException = true;
 					}
 				} catch (ex) {
 					//--> Manage ABAP RAISE
 					parsedRes = JSON.parse(oResults.value);
 					if (parsedRes.exception !== undefined) {
 						inException = true;
 					}
 				}

 				//---> Has exception reported?
 				if (inException === true) {
 					this.thisRef.EXT_FailCall(parsedRes.exception);
 				} else {

 					try {
 						//---> is direct json or BASE64 encoded?	
 						this.thisRef.ResultRaw = JSON.parse(oResults.value);
 					} catch (ex) {

 						//--> NOTE: 
 						//--> Regular expression corrupts time vales in JSON: 01:01:01 is transformed to 1:1:1.
 						//--> It seems that it is no more necessary: it was realized to remove leading zero on numbers in JSON 
 						//--> because this caused exceptions in JSON.parse(..) function, but all numeric values in UI5 Apps now
 						//--> are transmitted without leading zeros.
 						var strCleaned = atob(oResults.value);
 						if (!this.thisRef.disableRegexpOnJSONResults) {
 							strCleaned = atob(oResults.value).replace(/(:0{1,100})(?![},\,,.])(?![0{1,100}"])(?![0{1,100}:])/g, ':');
 						}
 						this.thisRef.ResultRaw = JSON.parse(strCleaned);

 					}

 					//---> parse results to explicit json format
 					var isModel;

 					this.thisRef.Result = new Object();
 					for (var idx = 0; idx < this.thisRef.ResultRaw.length; idx++) {
 						for (var key in this.thisRef.ResultRaw[idx]) {

 							isModel = null;
 							for (var j = 0; j < this.thisRef.SyncModels.length; j++) {
 								if (this.thisRef.SyncModels[j]['NAME'] === key) {
 									isModel = this.thisRef.SyncModels[j];
 									break;
 								}
 							}

 							if (isModel !== null) {

 								if (isModel.TYPE === 'table') {

 									this.thisRef._ProcessObject(this.thisRef.ResultRaw[idx][key]);

 									//---> fill in model
 									isModel.JSMODEL.setData(this.thisRef.ResultRaw[idx][key]);
									isModel.JSMODEL.dataReceived = true;
									isModel.JSMODEL.lastDataReceivedTS = new Date();

 									//.... end eventually sub models active...
 									for (var sm = 0; sm <= isModel['WRAPPER'].SubModels.length - 1; sm++) {
 										isModel['WRAPPER'].SubModels[sm].JSMODEL.setData(isModel.JSMODEL.getData()); //<-- data are the same by pointer !
 									}

 									isModel['WRAPPER']._INTERNAL_UpdateAccessIndexes();

 								}

 								if (isModel.TYPE === 'structure') {
 									//---> fill in model
 									var singleObj = jQuery.extend({}, this.thisRef.ResultRaw[idx][key]);

 									this.thisRef._ProcessObject(singleObj);
 									isModel.JSMODEL.setData(singleObj);
								    isModel.JSMODEL.dataReceived = true;
									isModel.JSMODEL.lastDataReceivedTS = new Date();
 								}

 							}

 							this.thisRef.Result[key] = this.thisRef.ResultRaw[idx][key];

 						}
 					}

 					//---> check if some result is a model!

 					/**
 					 * Success callback executed after ODATA function call.
 					 * @param result:    JSON containing all data returned by FUNCTION
 					 * @param ObjToPass: Arbitrary utility object that user can pass to ODATA function caller 
 					 * @param exception: error description
 					 */
 					this.thisRef.EXT_SuccessCall(this.thisRef.Result, this.thisRef.ObjToPass, this.thisRef.exceptionText);

 					//--> Refresh aggregation bindings	
 					if (this.thisRef.aggrToRefresh !== undefined && this.thisRef.aggrToRefresh.length > 0) {

 						for (var i = 0; i < this.thisRef.aggrToRefresh.length; i++) {

 							try {

 								var multiItemsControl = null; //<-- Multi item control ( eg: list/table )
 								var aggregationId = "items"; //<-- Default aggregation name 
 								if (typeof this.thisRef.aggrToRefresh[i] === 'string') {
 									multiItemsControl = sap.ui.getCore().byId(this.thisRef.aggrToRefresh[i]);
 								} else {
 									multiItemsControl = sap.ui.getCore().byId(this.thisRef.aggrToRefresh[i]["controlId"]); //<-- table/list id 
 									aggregationId = sap.ui.getCore().byId(this.thisRef.aggrToRefresh[i]["aggregationId"]); //<-- Eg: "items"  
 								}

 								//--> Force refresh of table/list aggregation
 								if (multiItemsControl !== null) {
 									multiItemsControl.getBinding(aggregationId).refresh(true);
 								}

 							} catch (ex) {
 								Log.warning("Simple control binding refresh failed!!!");
 							}

 						} //<-- for ( var i=0; i<aggrToRefresh.length; i++ ) {

 					} //<-- if ( this.thisRef.aggrToRefresh	!= null && this.thisRef.aggrToRefresh.length > 0 ) {

 					//--> Refresh simple controls bindings
 					if (this.thisRef.controlsToRefresh !== undefined && this.thisRef.controlsToRefresh.length > 0) {

 						for (var i = 0; i < this.thisRef.controlsToRefresh.length; i++) {

 							try {

 								var simpleControl = sap.ui.getCore().byId(this.thisRef.controlsToRefresh[i]);
 								var path = simpleControl.getBindingContext().getPath(); //<-- Eg: /CustomersSet(Kunnr='102214',Vtweg='10',Wminr='ITALIA')"		

 								//--> Force refresh
 								simpleControl.bindElement(path + "?refreshAndClean"); //<-- Append any string in URI after "?" to force refresh

 							} catch (ex) {
 								Log.warning("Simple control '" + this.thisRef.controlsToRefresh[i] + "' binding refresh failed!!!");
 							}

 						} //<-- for ( var i=0; i<controlsToRefresh.length; i++ ) {

 					} //<-- if ( this.thisRef.controlsToRefresh	!= null && this.thisRef.controlsToRefresh.length > 0 ) {

 				} //<--- EXCEPTION reported in ABAP

 				//--> Automatically hide busy animation
 				if (this.thisRef.autoManageWait === true) {
 					sap.ui.core.BusyIndicator.hide();
 				}

 				this.thisRef.inCall = false;

 			},

 			_CallFail: function (err) {

 				this.inCall = false;

 				//--> Restore data before changes
 				if (this.EXT_FailCall !== undefined) {
 					this.EXT_FailCall(err);
 				}

 				//--> Automatically hide busy animation
 				if (this.autoManageWait === true) {
 					sap.ui.core.BusyIndicator.hide();
 				}

 			},

 			_INTERNAL_callFunction: function (functionName, success, fail, syncGroup, modelsList, objToPass,
 				aggrToRefresh,
 				controlsToRefresh, autoManageWait) {

 				if (this.loading) {
 					return;
 				}

 				this.inCall = true;

 				//--> create models map
 				if (functionName !== "INTERNAL_GET_DDIC") {

 					if (modelsList !== undefined) {
 						this._INTERNAL_getModelMapDirect(modelsList);
 					} else {
 						this._INTERNAL_getModelMap(syncGroup);
 					}

 					this._INTERNAL_getSAPPAR(); //<--- auto mapped parameters for function call (if not present in function parameters will be ignored)
 					this._INTERNAL_getSAPMAP(); //<--- auto mapped fields for class attributes
 				}

 				this.ObjToPass = objToPass;
 				this.aggrToRefresh = aggrToRefresh;
 				this.controlsToRefresh = controlsToRefresh;
 				this.autoManageWait = autoManageWait;

 				//--> Automatically show busy animation
 				if (this.autoManageWait === true) {
 					sap.ui.core.BusyIndicator.show(1);
 				}

 				var encBase64 = btoa(JSON.stringify(this.sStreamParams));

 				//--> User defined function callbacks called by _CallSuccess/_CallFail
 				this.EXT_SuccessCall = success;
 				this.EXT_FailCall = fail;

 				var bndCtx = this.sModel.bindContext('/Uy5streamchannel(...)');

 				var boundFunctionSuccess = (this._CallSuccess).bind({
 					thisRef: this,
 					actbc: bndCtx
 				}); // <-- bind callback with "this"
 				var boundFunctionFail = (this._CallFail).bind({
 					thisRef: this,
 					actbc: bndCtx
 				}); // <-- bind callback with "this"

 				bndCtx.setParameter('Datastream', encBase64);
 				bndCtx.setParameter('Functionname', functionName);

 				//---> fire the UNBOUND action on odata V4
 				bndCtx.execute().then(boundFunctionSuccess).catch(boundFunctionFail);

 			},

 			_INTERNAL_callFunction_STACK: function () {

 				var argStack = this.DeferredArgsStack.shift(); //<--- respect the queue !!!! (deferred calls are in sequence)

 				//---> restore args
 				this.sStreamParams = argStack["args"];

 				this._INTERNAL_callFunction(
 					argStack["functionName"], argStack["success"], argStack["fail"], argStack["syncGroup"], argStack["modelsList"], argStack[
 						"objToPass"], argStack[
 						"aggrToRefresh"],
 					argStack["controlsToRefresh"], argStack["autoManageWait"]
 				);

 			},

 			callFunctionBusy: function (functionName, success, fail, syncGroup, objToPass, aggrToRefresh,
 				controlsToRefresh) {
 				return this.callFunction(functionName, success, fail, syncGroup, objToPass, aggrToRefresh, controlsToRefresh, true);
 			},

 			setXsessionData: function () {

 				var oAction = this.sModel.bindContext("/SET_XSESSION(...)", undefined);
 				oAction.setParameter("XSESSION", this.sessionId);
 				oAction.setParameter("CYPHERIV", this.cypherIv);
 				oAction.setParameter("CYPHERKEY", this.cypherKey);

 				oAction.execute().then(function () {
 					//--> nothing to do
 					Log.info("xsession set in backend");

 					//--> set the header
 					this.sModel.changeHttpHeaders({
 						XSESSIONID: this.sessionId
 					});

 					this.tokenDeferred.resolveWith(this);

 				}.bind(this)).catch(function () {
 					//--> nothing to do
 					Log.info("ERROR in xsession set in backend");
 				}.bind(this));

 			},

 			_tokenAuthenticateDirect: function () {
 				
 				// prepare key & iv for CryptoJS encryption
 				let fkey = CryptoJS.enc.Utf8.parse(this.cypherKey);
 				let fiv = CryptoJS.enc.Utf8.parse(this.cypherIv);

 				var ats = new Date();
 				var cyphertext = ats.getTime().toString();

 				var encrypted = CryptoJS.AES.encrypt(cyphertext, fkey, {
 					iv: fiv,
 					mode: CryptoJS.mode.CBC,
 					padding: CryptoJS.pad.Pkcs7,
 				}).toString();

 				this.oAction = this.sModel.bindContext("/GET_TOKEN_STATIC(...)", undefined);

 				this.oAction.setParameter("USERNAME", this.tokenDirectData.user);
 				this.oAction.setParameter("PASSWORD", encrypted);

 				this.oAction.execute().then(function () {
 					var ctx = this.oAction.getBoundContext();
 					this.tokenDirectData.success(ctx);
 				}.bind(this)).catch(function () {
 					var ctx = this.oAction.getBoundContext();
 					this.tokenDirectData.failure(ctx);
 				}.bind(this));

 			},

 			tokenAuthenticateDirect: function (user, success, failure) {

 				this.tokenDirectData = {
 					user: user,
 					success: success,
 					failure: failure
 				};

				var boundFct = this._tokenAuthenticateDirect.bind(this);
 				this.tokenDeferred.done(boundFct);

 			},

 			/** token authentication **/
 			tokenAuthenticate: function (user, pass, callbackSuccess, callbackFailure) {

 				this.callbackLogonSuccess = callbackSuccess;
 				this.callbackLogonFail = callbackFailure;

 				this.clearParameters();
 				this.addSinglePar("USERNAME", user);

 				//--> check user is logged or not in BTP
 				fetch('/services/userapi/currentUser').then(function (resCall) {

 					var queryString = window.location.search;
 					var urlParams = new URLSearchParams(queryString);

 					if (resCall.status === 200 && urlParams.get("DISABLE_GOOGLE_LOGIN") !== 'X') {

 						resCall.text().then(function (txt) {

 							try {

 								var userData = JSON.parse(txt);

 								//--> SCP authenticated

 								// prepare key & iv for CryptoJS encryption
 								let fkey = CryptoJS.enc.Utf8.parse(this.cypherKey);
 								let fiv = CryptoJS.enc.Utf8.parse(this.cypherIv);

 								var ats = new Date();
 								var cyphertext = ats.getTime().toString();

 								var encrypted = CryptoJS.AES.encrypt(cyphertext, fkey, {
 									iv: fiv,
 									mode: CryptoJS.mode.CBC,
 									padding: CryptoJS.pad.Pkcs7,
 								}).toString();

 								this.addSinglePar("PASSWORD", encrypted); //<--- in password pass encrypted data

 								this.callFunction('AUTHENTICATE',
 									function (dt) {

 										//--> set the header
 										this.sModel.changeHttpHeaders({
 											Z_VENDOR_TOKEN: dt.AUTH_TOKEN
 										});

 										if (this.callbackLogonSuccess !== undefined) {
 											this.callbackLogonSuccess(dt);
 										}

 									},
 									function (dt) {
 										//---> error authentication
 										if (this.callbackLogonFail !== undefined) {
 											this.callbackLogonFail(dt);
 										}
 									}, '', this);

 							} catch (exc) {

 								//--> no auth pass password for auth
 								this.addSinglePar("PASSWORD", pass);
 								this.callFunction('AUTHENTICATE',
 									function (dt) {

 										//--> set the header
 										this.sModel.changeHttpHeaders({
 											Z_VENDOR_TOKEN: dt.AUTH_TOKEN
 										});

 										if (this.callbackLogonSuccess !== undefined) {
 											this.callbackLogonSuccess(dt);
 										}

 									},
 									function (dt) {
 										//---> error authentication
 										if (this.callbackLogonFail !== undefined) {
 											this.callbackLogonFail(dt);
 										}
 									}, '', this);

 							}

 						}.bind(this));

 					} else {

 						//--> no auth pass password for auth
 						this.addSinglePar("PASSWORD", pass);
 						this.callFunction('AUTHENTICATE',
 							function (dt) {

 								//--> set the header
 								this.sModel.changeHttpHeaders({
 									Z_VENDOR_TOKEN: dt.AUTH_TOKEN
 								});

 								if (this.callbackLogonSuccess !== undefined) {
 									this.callbackLogonSuccess(dt);
 								}

 							},
 							function (dt) {
 								//---> error authentication
 								if (this.callbackLogonFail !== undefined) {
 									this.callbackLogonFail(dt);
 								}
 							}, '', this);

 					}

 				}.bind(this));

 			},

 			/**
 			 * Call ODATA function.
 			 * @param functionName			ABAP function to call
 			 * @param success   			callback success function
 			 * @param fail      			callback fail function
 			 * @param syncGroup 			sync group defined in DYNM_SAP_models.xml to be synchronized
 			 * @param objToPass 			object passed to callback function
 			 * @param aggrToRefresh     	array of:
 			 *			1) Strings:	ids of table/list controls to refresh: assumed that aggregation id to refresh is the default 'items'
 			 *			2) Maps of table+aggregations ids: Eg: [{ controlId:"idOfTableOrList", aggregationId: "IdOfAggregation" }]
 			 * @param controlsToRefresh: array of simple control ids to refresh
 			 * @param autoManageWait:	 if true manage automatically show/hide of wait animation
 			 */
 			callFunction: function (functionName, success, fail, syncGroup, objToPass, aggrToRefresh,
 				controlsToRefresh, autoManageWait) {

 				this.lastCleared = false;
 				this.lastCalledFunction = functionName;

 				if (functionName === "INTERNAL_GET_DDIC" || functionName === 'GET_BASE_MODELS') {

 					//--> Retreive XML models metadata from ABAP side by introspection
 					this._INTERNAL_callFunction(functionName, success, fail, syncGroup, objToPass);

 				} else {

 					var boundCallFunction = (this._INTERNAL_callFunction_STACK).bind(this); // <-- bind callback with "this"

 					//---> wait for master model Deferred
 					var argStack = new Object();
 					argStack["functionName"] = functionName;
 					argStack["success"] = success;
 					argStack["fail"] = fail;
 					argStack["syncGroup"] = syncGroup;
 					argStack["objToPass"] = objToPass;

 					//--> Manage auto refresh of bindings 	
 					argStack["aggrToRefresh"] = aggrToRefresh;
 					argStack["controlsToRefresh"] = controlsToRefresh;
 					argStack["autoManageWait"] = autoManageWait;

 					argStack["args"] = [];
 					for (var idx = 0; idx <= this.sStreamParams.length - 1; idx++) {
 						var copyObj = jQuery.extend(true, {}, this.sStreamParams[idx]);
 						argStack["args"].push(copyObj);
 					}

 					this.DeferredArgsStack.push(argStack);

 					this.modelDeferred.done(boundCallFunction);
 				}

 			},

 			//--> Call backend with implicit model synchronization ( not based on group ids defined in DYNM_SAP_models.xml )
 			callFunctionAutoSyncModels: function (functionName, success, fail, modelsList, objToPass, aggrToRefresh,
 				controlsToRefresh, autoManageWait) {

 				this.lastCleared = false;
 				this.lastCalledFunction = functionName;

 				var boundCallFunction = (this._INTERNAL_callFunction_STACK).bind(this); // <-- bind callback with "this"

 				//---> wait for master model Deferred
 				var argStack = new Object();
 				argStack["functionName"] = functionName;
 				argStack["success"] = success;
 				argStack["fail"] = fail;
 				argStack["modelsList"] = modelsList;
 				argStack["objToPass"] = objToPass;

 				//--> Manage auto refresh of bindings 	
 				argStack["aggrToRefresh"] = aggrToRefresh;
 				argStack["controlsToRefresh"] = controlsToRefresh;
 				argStack["autoManageWait"] = autoManageWait;

 				argStack["args"] = [];
 				for (var idx = 0; idx <= this.sStreamParams.length - 1; idx++) {
 					var copyObj = jQuery.extend(true, {}, this.sStreamParams[idx]);
 					argStack["args"].push(copyObj);
 				}

 				this.DeferredArgsStack.push(argStack);

 				this.modelDeferred.done(boundCallFunction);

 			},

 			setConfiguration: function (objConf) {

 				if (objConf.model !== undefined) {
 					this.sModel = objConf.model;
 				}

 				if (objConf.component !== undefined) {
 					this.component = objConf.component;
 				}

 				return this;
 			},

 			setModel: function (model) {
 				this.sModel = model;
 				return this;
 			},

 			clearParameters: function () {
 				this.clear();
 				return this;
 			},

 			clear: function () {
 				this.lastCleared = false;
 				this.sStreamParams = [];
 				return this;
 			}

 		});
 	});