//-------------------------------------------------------------------------------------------------------------------------------//--> Global variables//-------------------------------------------------------------------------------------------------------------------------------sap.ui.define(["sap/ui/base/ManagedObject"],	function (ManagedObect) {		"use strict";		return ManagedObect.extend('it.fiorital.fioritalui5lib.framework.uy5.helper.GlobalValues', {			metadata: {				properties: {}			},			constructor: function () {				ManagedObect.call(this);				this.globalVars = new Object();			},			init: function () {				//---> initialization functions			},			DEF: function (name) {				this.GV(name);			},			DEF_LOCALSTORAGE: function (name) {				this.GV_LOCALSTORAGE(name);			},			GV_LOCALSTORAGE: function (name, val) {				var fct = new Function("return localStorage.getItem('" + name + "');");				var fctSet = new Function("newValue", "localStorage.setItem('" + name + "', newValue); this.globalVars['" + name + "'] = newValue;");				try {					Object.defineProperty(this, name, {						get: fct,						set: fctSet					});				} catch (e) {					//--> nothing				}				//--> finally store value				this.globalVars[name] = val;			},			GV: function (name, val, defaultVal) {				if (val === undefined && defaultVal !== undefined) {					val = defaultVal;				}				var fct = new Function("return this.globalVars['" + name + "'];");				var fctSet = new Function("newValue", "this.globalVars['" + name + "'] = newValue; this.globalVars['" + name + "'] = newValue;");				try {					Object.defineProperty(this, name, {						get: fct,						set: fctSet					});				} catch (e) {					//--> nothing				}				if (typeof (val) === 'object') {					eval("window." + name + " = val;");				} else if (typeof (val) === 'string') {					eval("window." + name + " = '" + val + "';");				} else {					eval("window." + name + " = " + val + ';');				}				//--> finally store value				this.globalVars[name] = val;			},			clearGV: function (key) {				this.globalVars[key] = null;			},			getGV: function (key) {				return this.globalVars[key];			},			existsGV: function (key) {				if (this.globalVars[key] === undefined) {					return false;				} else {					return true;				}			}		});	});var GV = new it.fiorital.fioritalui5lib.framework.uy5.helper.GlobalValues();var globalVars = GV; //<-- alias