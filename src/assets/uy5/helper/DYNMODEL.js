//----------------------------------------------------------------------------------------
// DYNMODEL definition
//----------------------------------------------------------------------------------------

sap.ui.define(
	[
		"sap/ui/base/ManagedObject", "sap/base/Log", "sap/m/MessageBox",
		"it/fiorital/fioritalui5lib/framework/uy5/model/json/JSONModel", 
		"it/fiorital/fioritalui5lib/framework/uy5/helper/DYNMODEL" 
	],
	function (ManagedObect, Log, MessageBox, JSONModelExt, DYNMODEL) {
		"use strict";
		return ManagedObect.extend('it.fiorital.fioritalui5lib.framework.uy5.helper.DYNMODEL', {
			metadata: {
				properties: {}
			},

			JSmodel: null,
			model: null,
			NAME: null,
			mode: null,
			CursorIdx: null,
			AutoUpdate: true,
			TYPE: null,
			parent: null,
			SubModels: [],
			NewRecord: {},
				
			constructor: function (model, structure, type) {

				ManagedObect.call(this);

				this.TYPE = type;

				this.model = model;
				this.Jsmodel = this.model; //<-- just alias 
				this.structure = structure;
				this.NewRecord = new Object();
				this.NewRecordInternal = new Object();

				//---> create local properties (byname = actual record characteristic)
				if (structure !== null) {
					for (var idx = 0; idx < structure.length; idx++) {

						var fct;
						var fctSet;
						
						if (structure[idx]["FIELDNAME"].substr(0, 1) !== '.') {

							//---> must create dynamic property
							if (this.TYPE === 'table') {
								fct = new Function("return this._INTERNAL_GetCursorField('" + structure[idx]["FIELDNAME"] + "');");
								fctSet = new Function("newValue", "this._INTERNAL_CursorFieldSet('" + structure[idx]["FIELDNAME"] + "',newValue);");
								try {
									fct = fct.bind(this);
									fctSet = fctSet.bind(this);
								} catch (err) {
									MessageBox.alert("Error getting FIELD: " + structure[idx]["FIELDNAME"]);
								}
							}

							if (this.TYPE === 'structure') {

								fct = new Function("return this._INTERNAL_GetStructureField('" + structure[idx]["FIELDNAME"] + "');");
								fctSet = new Function("newValue", "this._INTERNAL_StructureFieldSet('" + structure[idx]["FIELDNAME"] + "',newValue);");
								fct = fct.bind(this);
								fctSet = fctSet.bind(this);

	                            //--> Valid only on TYPE 'structure'
								Object.defineProperty(this, structure[idx]["FIELDNAME"], {
									get: fct,
									set: fctSet
								});

							}

							//---> access to NewRecord
							var fctNew = new Function("return this._INTERNAL_NewRecordGet('" + structure[idx]["FIELDNAME"] + "');");
							var fctSetNew = new Function("newValue", "this._INTERNAL_NewRecordSet('" + structure[idx]["FIELDNAME"] + "',newValue);");
							fctNew = fctNew.bind(this);
							fctSetNew = fctSetNew.bind(this);

							Object.defineProperty(this.NewRecord, structure[idx]["FIELDNAME"], {
								get: fctNew,
								set: fctSetNew
							});

						} //<-- no .INLCUDE

					}
				}

				//---> outer property "data" to access json model data
				Object.defineProperty(this, 'data', {
					get: function () {
						if (this.TYPE === 'table') {
							return this.model.getData();
						} else {
							//MAD: return this.parent.STRUCTUREDATA;
							return this.model.getData();
						}
					}
				});

				//---> outer property "count" to access json model data length
				Object.defineProperty(this, 'count', {
					get: function () {
						if (this.TYPE === 'table') {
							if (this.model.getData() === undefined) {
								return 0;
							} else {
								return this.model.getData().length;
							}

						} else {
							return 0;
						}
					}
				});

			},

			init: function () {
				//---> initialization functions
			},

			addSubModel: function (rawDataCopy, filterString) {

				var newSyncModel = new Object();

				if (rawDataCopy !== undefined) {
					this.rawDataCopy = rawDataCopy;
				} else {
					this.rawDataCopy = false;
				}

				newSyncModel['PARENT'] = this.parent['PARENT'];
				newSyncModel['TYPE'] = this.parent.TYPE; //<---- table / structure / field
				newSyncModel['NAME'] = this.parent.NAME;
				newSyncModel['MODE'] = this.parent.MODE; //<--- it.fiorital.fioritalui5lib.framework.uy5.helper.DYNFCALL.ModelMode_xxx

				newSyncModel['SYNCGROUPS'] = [];
				newSyncModel['BINDERS'] = [];

				newSyncModel['STRUCTUREDATA'] = new Object(); //<--- used in case of structure mapping (no JSON model)
				newSyncModel['FIELDDATA'] = null; //<--- used in case of field mapping (no JSON model)	

				newSyncModel['JSMODEL'] = new JSONModelExt(undefined, newSyncModel, undefined, filterString);
				newSyncModel['JSMODEL'].setSizeLimit(100000); //<--- Fix 100 record limit
				
				this.component.setModel(newSyncModel['JSMODEL'],this.parent.NAME);

				//newSyncModel['JSMODEL'] = new JSONModelExt(undefined, newSyncModel, undefined, filterString);

				//---> now must copy data from actual model...
				if (this.rawDataCopy === true) {

					var newDataArray = [];
					for (var idx = 0; idx <= this.parent.JSMODEL.getData().length - 1; idx++) {
						var dataCopy = jQuery.extend({}, this.parent.JSMODEL.getData()[idx]);
						newDataArray.push(dataCopy);
					}

					newSyncModel['JSMODEL'].setData(newDataArray);
				} else {
					newSyncModel['JSMODEL'].setData(this.parent.JSMODEL.getData());
				}

				newSyncModel['WRAPPER'] = new DYNMODEL(newSyncModel['JSMODEL'], this.structure, this.parent.TYPE);
				
				newSyncModel['WRAPPER'].TYPE = this.parent.TYPE;
				newSyncModel['WRAPPER'].parent = newSyncModel;

				this.SubModels().push(newSyncModel);

				return newSyncModel['WRAPPER'];

			},

			bindExplicit: function (ctrlId, aggregation, filter) {

				//---> use parent methods....
				this.getParent()["PARENT"]._INTERNAL_bindExplicit(ctrlId, aggregation, filter, this.parent);

			},

			subModel: function (idx) {
				return this.SubModels()[idx]["WRAPPER"];
			},

			NextPage: function () {
				this.model().nextPage();
			},

			_INTERNAL_UpdateAccessIndexes: function () {
				//TODO
			},

			_INTERNAL_NewRecordSet: function (fieldName, newvalue) {
				this.NewRecordInternal[fieldName] = newvalue;
			},

			_INTERNAL_NewRecordGet: function (fieldName) {
				return this.NewRecordInternal[fieldName];
			},

			_INTERNAL_StructureFieldSet: function (fieldName, newvalue) {
				this.parent.STRUCTUREDATA[fieldName] = newvalue;
			},

			_INTERNAL_GetStructureField: function (fieldName) {
				return this.parent.STRUCTUREDATA[fieldName];
			},

			_INTERNAL_CursorFieldSet: function (fieldName, newvalue) {
				if (this.CursorIdx > -1) {
					this.model.getData()[this.CursorIdx][fieldName] = newvalue;
				}
			},

			_INTERNAL_GetCursorField: function (fieldName) {
				if (this.CursorIdx < 0 || this.cursor === undefined) {
					return undefined;
				}

				try {
					return this.model.getData()[this.CursorIdx][fieldName];
				} catch (err) {
					Log.warning("DYNMODEL - ERROR parsing fieldName " + fieldName);
					return undefined;
				}
			},

			SetValue: function (idx, fieldName, val) {
				this.model.getData()[idx][fieldName] = val;
			},

			FindSingle: function (column, val) {

				for (var i = 0; i < this.model.getData().length; i++) {
					if (this.model.getData()[i][column] === val) {
						this.CursorIdx = i;
						return true;
					}
				}

				return false;
			},

			First: function () {
				if (this.model.getData().length > 0) {
					this.CursorIdx = 0;
					return true;
				} else {
					this.CursorIdx = -1;
					return false;
				}
			},

			Next: function () {

				if (this.CursorIdx !== -1 && this.CursorIdx + 1 < this.model.getData().length) {
					this.CursorIdx = this.CursorIdx + 1;
					return true;
				} else {
					return false;
				}

			},

			EOF: function () {
				if ( this.CursorIdx === this.model.getData().length - 1) {
					return true;
				} else {
					return false;
				}
			},

			BOF: function () {
				if (this.CursorIdx === 0) {
					return true;
				} else {
					return false;
				}
			},

			countByField: function (varName, varValue) {

				var countVal;
				countVal = 0;
				if (this.TYPE === 'table') {
					for (var idx = 0; idx < this.model.getData().length; idx++) {

						var item = this.model.getData()[idx];

						if (item[varName] === varValue) {
							countVal = countVal + 1;
						}

					}
				}

				return countVal;

			},

			distinct: function (varName) {
				var farray = [];
				var found;

				if (this.TYPE === 'table') {
					for (var idx = 0; idx < this.model.getData().length; idx++) {

						var item = this.model.getData()[idx];

						if (farray.length === 0) {
							farray.push(item[varName]);
						} else {

							found = false;
							for (var idx2 = 0; idx2 <= farray.length; idx2++) {
								if (farray[idx2] === item[varName]) {
									found = true;
									break;
								}
							}

							if (found === false) {
								farray.push(item[varName]);
							}

						}

					}
				}

				return farray.length;

			},

			max: function (varName) {
				var maxval;
				var fidx;
				if (this.TYPE === 'table') {
					for (var idx = 0; idx < this.model.getData().length; idx++) {

						var item = this.model.getData()[idx];

						if (maxval === undefined || maxval < item[varName]) {
							maxval = item[varName];
							fidx = idx;
						}

					}
				}

				var retObj = new Object();
				retObj.value = maxval;
				retObj.idx = fidx;
				return retObj;

			},

			min: function (varName) {
				var maxval;
				var fidx;
				if (this.TYPE === 'table') {
					for (var idx = 0; idx < this.model.getData().length; idx++) {

						var item = this.model.getData()[idx];

						if (maxval === undefined || maxval > item[varName]) {
							maxval = item[varName];
							fidx = idx;
						}

					}
				}

				var retObj = new Object();
				retObj.value = maxval;
				retObj.idx = fidx;
				return retObj;

			},

			maxAsDate: function (varName) {
				var maxval;
				var fidx;

				if (this.TYPE === 'table') {
					for (var idx = 0; idx < this.model.getData().length; idx++) {

						var item = this.model.getData()[idx];
						var dt = new Date(item[varName]);

						if (maxval === undefined || maxval < dt) {
							maxval = dt;
							fidx = idx;
						}

					}
				}

				var retObj = new Object();
				retObj.value = dt;
				retObj.idx = fidx;
				return retObj;

			},

			minAsDate: function (varName) {
				var maxval;
				var fidx;

				if (this.TYPE === 'table') {
					for (var idx = 0; idx < this.model.getData().length; idx++) {

						var item = this.model.getData()[idx];
						var dt = new Date(item[varName]);

						if (maxval === undefined || maxval > dt) {
							maxval = dt;
							fidx = idx;
						}

					}
				}

				var retObj = new Object();
				retObj.value = dt;
				retObj.idx = fidx;
				return retObj;

			}, 

			//--> Deletes rows of model corresponding to conditionString
			deleteWhere: function (conditionFunction) {
				
				if (this.TYPE === 'table') {
					
					for (var idx = this.model.getData().length-1; idx >=0; idx--) {
						
						var item = this.model.getData()[idx];

						//---> must eval condition string
						var recordCheck = conditionFunction(item, idx);

						//---> if ok loop over record 
						if ( recordCheck === true ) {
							this.model.getData().splice(idx, 1);
						}

					}
				}

			},

			loopWhere: function (loopFunction, conditionString) {
				if (this.TYPE === 'table') {
					for (var idx = 0; idx < this.model.getData().length; idx++) {

						var item = this.model.getData()[idx];

						//---> must eval condition string
						var recordCheck = eval(conditionString);

						//---> if ok loop over record 
						if (recordCheck === true || recordCheck === undefined) {
							loopFunction(item,idx);
						}

					}
				}

			},

			loopWhereFct: function (loopFunction, conditionFunction) {

				if (this.TYPE === 'table') {
					for (var idx = 0; idx < this.model.getData().length; idx++) {

						var item = this.model.getData()[idx];

						//---> must eval condition string
						var recordCheck = conditionFunction(item, idx);

						//---> if ok loop over record 
						if (recordCheck === true) {
							loopFunction(item, idx);
						}

					}
				}

			},

			ClearData: function () {
				var data = [];
				this.Jsmodel.setData(data);
			},

			ClearNew: function (idx, NewJsonRecord) {
				this.NewRecordInternal = new Object();
			},

			InsertNew: function (idx, NewJsonRecord) {
				if (NewJsonRecord !== undefined) {
					var data = this.Jsmodel.getData();
					if (data !== undefined) {
						var newObj = jQuery.extend(true, {}, NewJsonRecord); //<-- Deep copy
						data.splice(idx, 0, newObj);
						this.Jsmodel.setData(data);
					}
				} else {
					var data = this.Jsmodel.getData();
					if (data !== undefined) {
						var newObj = jQuery.extend(true, {}, this.NewRecordInternal); //<-- Deep copy
						data.splice(idx, 0, newObj);
						this.Jsmodel.setData(data);
					}
				}
			},

			AppendNew: function (NewJsonRecord) {
				if (NewJsonRecord !== undefined) {
					var data = this.Jsmodel.getData();
					if (data !== undefined) {
						var newObj = jQuery.extend(true, {}, NewJsonRecord); //<-- Deep copy
						data.push(newObj);
						this.Jsmodel.setData(data);
					}
				} else {
					var data = this.Jsmodel.getData();
					if (data !== undefined) {
						var oldArr = this.Jsmodel.getData();
						var newObj = jQuery.extend(true, {}, this.NewRecordInternal); //<-- Deep copy
						oldArr.push(newObj);
						this.Jsmodel.setData(oldArr);
					} else {
						var newArr = [];
						var newObj = jQuery.extend(true, {}, this.NewRecordInternal); //<-- Deep copy
						newArr.push(newObj);
						this.Jsmodel.setData(newArr);
					}
				}

			},

			CopyFromArray: function (jsonArray) {
				var outArray = [];
				for (var i = 0; i < jsonArray.length; i++) {
					var newObj = jQuery.extend(true, {}, jsonArray[i]); //<-- Deep copy
					outArray.push(newObj);
				}
				this.Jsmodel.setData(outArray);
			},

			CopyFromArrayWithFilter: function (jsonArray, filterFields, filterValues) {

				var isAcceptableRecord = function (jsonRecord, filterFields, filterValues) {
					if (Array.isArray(filterFields)) {

						var filterOk = true;
						for (var i = 0; i < jsonArray.length; i++) {
							var filterKey = filterFields[i];
							var filterVal = filterValues[i];
							if (!jsonRecord[filterKey] === filterVal) {
								return false;
							}
						}

					} else {
						//--> Assume simple check
						return jsonRecord[filterFields] === filterValues;
					}
					return true;

				};

				var outArray = [];
				for (var i = 0; i < jsonArray.length; i++) {

					if (isAcceptableRecord(jsonArray[i], filterFields, filterValues)) {
						var newObj = jQuery.extend(true, {}, jsonArray[i]); //<-- Deep copy
						outArray = outArray.push(newObj);
					}

				}
				this.Jsmodel.setData(outArray);
			}

		});
	});
