/* eslint sap-no-element-creation: 0 */
/* eslint no-caller: 0 */

sap.ui.define([
	"sap/ui/core/Control",
	"sap/ui/dom/includeStylesheet",
	"sap/ui/core/IconPool",
	"sap/base/security/encodeXML"
], function (Control, includeStylesheet, iconPool, encodeXML) {
	"use strict";
	return Control.extend("it.fiorital.fioritalui5lib.controls.FioritalMessageStrip", {

		metadata: {
			properties: {

			}
		},

		constructor: function (message, paramsObject, parentObject) {

			//---> store params
			this._Options = paramsObject;
			this._Options.message = message;

			//--> creat icon
			var vIconInfo = iconPool.getIconInfo(this._Options.icon, undefined, "mixed");

			if (parentObject !== undefined) {
				try {
					this._Options = parentObject.getDomRef();
				} catch (exc) {
					//--> no UI5 control ref provided !
				}

			}

			Control.prototype.constructor.apply(this, undefined);

			if (this._Options.container === null || this._Options.container === undefined) {
				this._Parent = document.body;
			} else {
				this._Parent = this._Options.container;
			}

			this._Container = this.searchChildren(this._Parent);
			var _Options = this._Options;

			if (!this._Container) {
				// need to create a new container for notifications
				this._Container = document.createElement("div");
				this._Container.classList.add("js-snackbar-container");

				if (_Options.fixed) {
					this._Container.classList.add("js-snackbar-container--fixed");
				}

				this._Parent.appendChild(this._Container);
			}

			if (_Options.fixed) {
				this._Container.classList.add("js-snackbar-container--fixed");
			} else {
				this._Container.classList.remove("js-snackbar-container--fixed");
			}

			this._Element = document.createElement("div");
			this._Element.classList.add("js-snackbar__wrapper");
			if (_Options.width !== undefined) {
				this._Element.style.width = _Options.width;
			}

			var innerSnack = document.createElement("div");
			innerSnack.classList.add("js-snackbar", "js-snackbar--show");
			if (_Options.width !== undefined) {
				innerSnack.style.width = "100%";
			}

			if (_Options.status) {
				_Options.status = _Options.status.toLowerCase().trim();

				var status = document.createElement("span");
				status.classList.add('sapUiIcon');
				status.setAttribute('data-sap-ui-icon-content', vIconInfo.content);
				status.style.fontFamily = encodeXML(vIconInfo.fontFamily);
				status.style.fontSize = '1.8em';
				status.style.paddingTop = '0.15em';

				status.classList.add("js-snackbar__status");

				if (_Options.status === "success" || _Options.status === "S" || _Options.status === "green") {
					status.classList.add("js-snackbar--success");
				} else if (_Options.status === "warning" || _Options.status === "W" || _Options.status === "alert" || _Options.status === "orange") {
					status.classList.add("js-snackbar--warning");
				} else if (_Options.status === "danger" || _Options.status === "E" || _Options.status === "error" || _Options.status === "red") {
					status.classList.add("js-snackbar--danger");
				} else {
					status.classList.add("js-snackbar--info");
				}

				innerSnack.appendChild(status);
			}

			this._Message = document.createElement("span");
			this._Message.classList.add("js-snackbar__message");
			this._Message.textContent = _Options.message;

			innerSnack.appendChild(this._Message);

			if (_Options.actions !== undefined && typeof _Options.actions === "object" && _Options.actions.length !== undefined) {
				for (var i = 0; i < _Options.actions.length; i++) {
					var thisAction = _Options.actions[i];

					if (thisAction !== undefined && thisAction.text !== undefined && typeof thisAction.text === "string") {

						if (thisAction.function !== undefined && typeof thisAction.function === "function" || thisAction.dissmiss !== undefined &&
							typeof thisAction.dissmiss === "boolean" && thisAction.dissmiss === true) {

							var newButton = document.createElement("span");
							newButton.classList.add("js-snackbar__action");

							if (thisAction !== undefined && typeof thisAction.function === "function") {
								if (thisAction.dissmiss !== undefined && typeof thisAction.dissmiss === "boolean" && thisAction.dissmiss === true) {
									newButton.onclick = function () {
										thisAction.function();
										this.Close();
									}.bind(this);
								} else {
									newButton.onclick = thisAction.function;
								}
							} else {
								newButton.onclick = this.Close;
							}

							newButton.textContent = thisAction.text;

							innerSnack.appendChild(newButton);

						}

					}
				}

			}

			if (_Options.dismissible) {
				var closeBtn = document.createElement("span");
				closeBtn.classList.add("js-snackbar__close");
				closeBtn.innerText = "\u00D7";

				closeBtn.onclick = this.Close;

				innerSnack.appendChild(closeBtn);
			}

			this._Element.style.height = "0px";
			this._Element.style.opacity = "0";
			this._Element.style.marginTop = "0px";
			this._Element.style.marginBottom = "0px";

			this._Element.appendChild(innerSnack);
			this._Container.appendChild(this._Element);

			if (_Options.timeout !== undefined) {
				this._Interval = setTimeout(this.Close.bind(this), this._Options.timeout);
			} else {
				this._Interval = setTimeout(this.Close.bind(this), 3000);
			}

			this.Open();
		},

		init: function () {

			//---> load the CSS

			//---> in FLP ??
			if (sap.ushell !== undefined && sap.ushell.Container !== undefined && sap.ushell.Container.getService("AppLifeCycle") !== undefined) {

				try {
					var cmp = sap.ushell.Container.getService("AppLifeCycle").getCurrentApplication().componentInstance;
					var appName = cmp.getMetadata().getLibraryName().split('.').pop();

					var baseurl = this.getMetadata().getLibraryName();
					baseurl = 'sap/fiori/' + appName + '/resources/' + baseurl.split('.').join('/') + '/FioritalMessageStrip.css';

					includeStylesheet(baseurl);
				} catch (exc) {
					//--> ABAP stack 
					try { // Prevent dump on SCP
						var baseurl = this.getMetadata().getLibraryName();
						baseurl = '../zfioritalui5lib/controls/FioritalMessageStrip.css';
						includeStylesheet(baseurl);
					} catch (ex) {}

					//---> SCP
					try { // Prevent dump on ABAP stack
						var baseurl = this.getMetadata().getLibraryName();
						baseurl = 'resources/' + baseurl.split('.').join('/') + '/FioritalMessageStrip.css';
						includeStylesheet(baseurl);
					} catch (ex) {}
				}
			} else {

				//--> ABAP stack 
				try { // Prevent dump on SCP
					var baseurl = this.getMetadata().getLibraryName();
					baseurl = '../zfioritalui5lib/controls/FioritalMessageStrip.css';
					includeStylesheet(baseurl);
				} catch (ex) {}

				//---> SCP
				try { // Prevent dump on ABAP stack
					var baseurl = this.getMetadata().getLibraryName();
					baseurl = 'resources/' + baseurl.split('.').join('/') + '/FioritalMessageStrip.css';
					includeStylesheet(baseurl);
				} catch (ex) {}
			}

		},

		exit: function () {

		},

		onAfterRendering: function () {

		},

		renderer: {

			render: function (oRm, oControl) {

			}

		},

		searchChildren: function (target) {
			var htmlCollection = target.children;
			var node = null;
			var i = 0;

			for (i = 0; i < htmlCollection.length; i++) {
				node = htmlCollection.item(i);

				if (node.nodeType === 1 && node.classList.length > 0 && node.classList.contains("js-snackbar-container")) {
					return node;
				}
			}

			return null;
		},

		Open: function () {
			var contentHeight = this._Element.firstElementChild.scrollHeight; // get the height of the content

			this._Container.classList.add("centerToast");

			this._Element.style.height = "2.5em";
			this._Element.style.opacity = 1;
			this._Element.style.marginTop = "5px";
			this._Element.style.marginBottom = "5px";

			this._Element.addEventListener("transitioned", function () {
				this._Element.removeEventListener("transitioned", arguments.callee);
				this._Element.style.height = null;
			});
		},

		Close: function () {
			if (this._Interval)
				clearInterval(this._Interval);

			var snackbarHeight = this._Element.scrollHeight; // get the auto height as a px value
			var snackbarTransitions = this._Element.style.transition;
			this._Element.style.transition = "";

			requestAnimationFrame(function () {
				this._Element.style.height = snackbarHeight + "px"; // set the auto height to the px height
				this._Element.style.opacity = 1;
				this._Element.style.marginTop = "0px";
				this._Element.style.marginBottom = "0px";
				this._Element.style.transition = snackbarTransitions;

				requestAnimationFrame(function () {
					this._Element.style.height = "0px";
					this._Element.style.opacity = 0;
				}.bind(this));
			}.bind(this));

			setTimeout(function () {
				this._Container.removeChild(this._Element);
				this.destroy();
			}.bind(this), 1000);
		}
	});
}, true);