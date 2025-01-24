sap.ui.define(["sap/ui/model/json/JSONModel", 'sap/ui/model/FilterProcessor', 'sap/ui/model/SorterProcessor','it/fiorital/fioritalui5lib/framework/uy5/model/json/JSONListBinding'], function (jsonModel,
	FilterProcessor, SorterProcessor , JSONListBindingExt) {
	"use strict";
	return jsonModel.extend("it.fiorital.fioritalui5lib.framework.model.json.JSONModel", {
		metadata: {
			events: {
				loopEnd: {
					enablePreventDefault: true
				}
			}
		},

		dataReceived: false,
		lastDataReceivedTS: undefined,

		refresh: function (uirefresh) {

			if ( this.parent !== undefined && this.parent['WRAPPER'] !== undefined ) {
				
				for (var sm = 0; sm <= this.parent['WRAPPER'].SubModels.length - 1; sm++) {
					this.parent['WRAPPER'].SubModels[sm].JSMODEL.refresh(uirefresh);
				}
				
			}
			return sap.ui.model.json.JSONModel.prototype.refresh.call(this, uirefresh); // <-- like super()

		},

		/*
		getData: function(){
			if (this._aFilters !== undefined){
			  return this.FilterProcessor.apply(this.oData,[this._aFilters],function(arr,fld){return arr[fld];});	
			}else{
			  return sap.ui.model.json.JSONModel.prototype.getData.call(this);
			}
		},*/

		attachOnLoopEnd: function (callback) {
			this._onEndLoopCallback = callback.bind(this);
		},

		attachOnNextPage: function (callback) {
			this._onNextPageCallback = callback.bind(this);
		},
		
		attachOnPrevPage: function (callback) {
			this._onPrevPageCallback = callback.bind(this);
		},

		setFilters: function (filters) {

			if (Object.prototype.toString.call(filters) === '[object Array]') {
				this._aFilters = filters;
			} else {
				this._aFilters = [];
				this._aFilters.push(filters);
			}

		},

		addFilters: function (filters) {

			if (Object.prototype.toString.call(filters) === '[object Array]') {
				//--> append filters		
				this._aFilters = this._aFilters.concat(filters);

			} else {
				this._aFilters.push(filters);
			}

		},

		clearFilters: function () {
			this._aFilters = [];
		},

		constructor: function (data, parent, paginationDefault, filterString) {
			this.parent = parent;

			if (filterString !== undefined && filterString !== "") {
				var fltData = filterString.split(";");
				this._aFilters = new sap.ui.model.Filter(fltData[0], eval(fltData[1]), fltData[2]);
			}

			this.FilterProcessor = FilterProcessor;
			this.SorterProcessor = SorterProcessor;

			//--> set dafeult pagination if provided
			if (paginationDefault !== undefined) {
				this._ListPageSize = paginationDefault;
			}

			jsonModel.call(this, data);

			//---> define custom oData property
			var fct = new Function("return this._INTERNAL_getOdata();");
			var fctSet = new Function("newValue", "this._INTERNAL_setOdata(newValue);");

			Object.defineProperty(this, 'oData', {
				get: fct,
				set: fctSet
			});

		},

		_INTERNAL_setOdata: function (newData) {
			this._oData = newData;
		},

		_INTERNAL_getOdata: function () {

			if (this._aFilters !== undefined && this._aFilters.length !== 0) {
				return this.FilterProcessor.apply(this._oData, this._aFilters, function (arr, fld) {
					return arr[fld];
				});
			} else {
				return this._oData;
			}

		},

		bindList: function (sPath, oContext, aSorters, aFilters, mParameters) {
			var oBinding = new JSONListBindingExt(this, sPath, oContext, aSorters, aFilters, mParameters);
			return oBinding;
		},

		//---> internal indexes for pagination
		ListStart: 0,
		ListEnd: -1,
		_ListPageSize: 0,
		_PaginationAutoTime: -1,

		//---> pagination methods
		setPagination: function (pageSize,avoidRefresh) {
			this._ListPageSize = pageSize;
			
			if (avoidRefresh !== undefined && avoidRefresh !== true)
			{
				this.refresh(true);	
			}
			
		},

		setPaginationDisplayControl: function (textControl) {
			this._PaginationDisplayControl = textControl;
		},

		setPaginationAutoTime: function (timeMilliSeconds) {
			this._PaginationAutoTime = timeMilliSeconds;
		},

		startAutoPagination: function (timeMilliSeconds, autoStopAtEnd) {

			if (timeMilliSeconds !== undefined) {
				this.setPaginationAutoTime(timeMilliSeconds);
			}

			if (autoStopAtEnd !== undefined) {
				this._autoStopAtEnd = autoStopAtEnd;
			} else {
				this._autoStopAtEnd = false;
			}

			//---> function to react to timer for autoPagination
			var fctAutoPage = function () {
				this.nextPage();
			};

			var fctAutoPageBound = fctAutoPage.bind(this);
			this._AutoPagingTimer = setInterval(fctAutoPageBound, this._PaginationAutoTime);

			//---> refresh the pagin indication (if bound)
			if (this._PaginationDisplayControl !== undefined) {
				var lbl = sap.ui.getCore().byId(this._PaginationDisplayControl);
				lbl.setText(this.ListStart + " > " + parseInt(this.ListStart + this._ListPageSize));
			}

		},

		stopAutoPagination: function () {

			if (this._AutoPagingTimer !== undefined) {
				clearInterval(this._AutoPagingTimer);
			}

		},
		
		getStartPageIndex: function() {
			return this.ListStart;
		},
		
		getEndPageIndex: function() {
			return this.ListEnd;
		},
		
		getPaginationSize: function(){
		  return this._ListPageSize;
		},
		
		prevPage: function(){
		
			var nextIdx = this.ListStart - this._ListPageSize;

			if (nextIdx < 0) {

				this.ListStart = this.getData().length / this._ListPageSize;
				this.ListStart = Math.floor(this.ListStart);
				this.ListStart = this.ListStart * this._ListPageSize;
				
				//--> BUG Fixes:
				//--> 1) List paging with page size 1 fails!!
				//--> 2) Load previous page when model has been emptied ( contains 0 records )
				//       causes strange behaviour on FioritalList: it displays some rows with  
				//       empty contents instead of no rows.
				//if ( this.getData().length % this._ListPageSize === 0 ) {
				if ( this.getData().length > 0 && this.ListStart === this.getData().length ) {
				    this.ListStart = this.ListStart - this._ListPageSize;
				}
				
				//---> refresh the page indication (if bound)
				if (this._PaginationDisplayControl !== undefined) {
					var lbl = sap.ui.getCore().byId(this._PaginationDisplayControl);
					lbl.setText(this.ListStart + " > " + parseInt(this.ListStart + this._ListPageSize));
				}

				//---> fire next page (if bound)
				if (this._onPrevPageCallback !== undefined) {
					this._onPrevPageCallback(this.ListStart);
				}

			} else {  //---> back one page
			
				this.ListStart = this.ListStart - this._ListPageSize;

				//---> refresh the pagin indication (if bound)
				if (this._PaginationDisplayControl !== undefined) {
					var lbl = sap.ui.getCore().byId(this._PaginationDisplayControl);
					lbl.setText(this.ListStart + " > " + parseInt(this.ListStart + this._ListPageSize));
				}

				//---> fire next page (if bound)
				if (this._onPrevPageCallback !== undefined) {
					this._onPrevPageCallback(this.ListStart);
				}

			}

			this.refresh(true); //<--- force UI refresh	  	
			
		},

		nextPage: function () {

			var nextIdx = this.ListStart + this._ListPageSize;
			var lbl;
			
			if (nextIdx > this.getData().length - 1) {
				this.ListStart = 0;

				//---> refresh the pagin indication (if bound)
				if (this._PaginationDisplayControl !== undefined) {
					lbl = sap.ui.getCore().byId(this._PaginationDisplayControl);
					lbl.setText(this.ListStart + " > " + parseInt(this.ListStart + this._ListPageSize));
				}

				//---> fire next page (if bound)
				if (this._onNextPageCallback !== undefined) {
					this._onNextPageCallback(this.ListStart);
				}

				//---> fire end loop event (if bound)
				if (this._onEndLoopCallback !== undefined) {
					this._onEndLoopCallback();
				}

				//---> if was requested stop the loop
				if (this._autoStopAtEnd === true) {
					this.stopAutoPagination();
				}

			} else {

				this.ListStart = this.ListStart + this._ListPageSize;

				//---> refresh the pagin indication (if bound)
				if (this._PaginationDisplayControl !== undefined) {
					lbl = sap.ui.getCore().byId(this._PaginationDisplayControl);
					lbl.setText(this.ListStart + " > " + parseInt(this.ListStart + this._ListPageSize));
				}

				//---> fire next page (if bound)
				if (this._onNextPageCallback !== undefined) {
					this._onNextPageCallback(this.ListStart);
				}

			}

			this.refresh(true); //<--- force UI refresh	  	
		}

	});
});
