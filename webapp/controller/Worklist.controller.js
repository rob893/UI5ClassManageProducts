sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, formatter, Filter, FilterOperator) {
	"use strict";

	return BaseController.extend("opensap.manageproducts.ManageProducts.controller.Worklist", {

		formatter: formatter,

		_mFilters: {
			Cheap: [new Filter("Price", "LT", 100)],
			Moderate: [new Filter("Price", "BT", 100, 1000)],
			Expensive: [new Filter("Price", "GT", 1000)]
		},
		
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the worklist controller is instantiated.
		 * @public
		 */
		onInit : function () {
			var oViewModel,
				iOriginalBusyDelay,
				oTable = this.byId("table");

			// Put down worklist table's original value for busy indicator delay,
			// so it can be restored later on. Busy handling on the table is
			// taken care of by the table itself.
			iOriginalBusyDelay = oTable.getBusyIndicatorDelay();
			// keeps the search state
			this._aTableSearchState = [];

			// Model used to manipulate control states
			oViewModel = new JSONModel({
				worklistTableTitle : this.getResourceBundle().getText("worklistTableTitle"),
				shareOnJamTitle: this.getResourceBundle().getText("worklistTitle"),
				shareSendEmailSubject: this.getResourceBundle().getText("shareSendEmailWorklistSubject"),
				shareSendEmailMessage: this.getResourceBundle().getText("shareSendEmailWorklistMessage", [location.href]),
				tableNoDataText : this.getResourceBundle().getText("tableNoDataText"),
				tableBusyDelay : 0,
				Cheap: 0,
				Moderate: 0,
				Expensive: 0
			});
			this.setModel(oViewModel, "worklistView");

			// Make sure, busy indication is showing immediately so there is no
			// break after the busy indication for loading the view's meta data is
			// ended (see promise 'oWhenMetadataIsLoaded' in AppController)
			oTable.attachEventOnce("updateFinished", function(){
				// Restore original busy indicator delay for worklist's table
				oViewModel.setProperty("/tableBusyDelay", iOriginalBusyDelay);
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Triggered by the table's 'updateFinished' event: after new table
		 * data is available, this handler method updates the table counter.
		 * This should only happen if the update was successful, which is
		 * why this handler is attached to 'updateFinished' and not to the
		 * table's list binding's 'dataReceived' method.
		 * @param {sap.ui.base.Event} oEvent the update finished event
		 * @public
		 */
		 onCallTestAPI: function(oEvent) {
		 	var model = this.getView().getModel("test");
		 	var inputField = this.getView().byId("dummyDataInput");
			var newDummyData = inputField.getValue();
			var dummyData = model.getProperty("/DummyData");
			
			if(Array.isArray(dummyData)) {
				dummyData.push({"Data": newDummyData});
				model.setProperty("/DummyData", dummyData);
			}
			
			$.ajax({
			    type: 'POST',
			    url: "https://api4dev.gonpl.com/test/",
			    data: { "DummyData": dummyData },
			    async: false
			  }).done(function(results) {
			    sap.m.MessageToast.show(results.message);
			    console.log(results);
			  })
			  .fail(function(err) {
			    if (err !== undefined) {
			      var oErrorResponse = $.parseJSON(err.responseText);
			      sap.m.MessageToast.show(oErrorResponse.message, {
			        duration: 6000
			      });
			    } else {
			      sap.m.MessageToast.show("Unknown error!");
			    }
			  });
			  
			  inputField.setValue("");
		 },
		 
		 onAdd: function(oEvent) {
		 	this.getRouter().navTo("add");
		 },
		 
		onUpdateFinished : function (oEvent) {
			// update the worklist's object counter after the table update
			var sTitle,
				oTable = oEvent.getSource(),
				iTotalItems = oEvent.getParameter("total");
			var oViewModel = this.getModel("worklistView");
			var oModel = this.getModel();
			// only update the counter if the length is final and
			// the table is not empty
			if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
				sTitle = this.getResourceBundle().getText("worklistTableTitleCount", [iTotalItems]);
				
				jQuery.each(this._mFilters, function(sKey, oFilter) {
					oModel.read("/ProductSet/$count", {
						filters: oFilter,
						success: function (oData){
							var sPath = "/" + sKey;
							oViewModel.setProperty(sPath, oData);
						}
					});
				});
			} else {
				sTitle = this.getResourceBundle().getText("worklistTableTitle");
			}
			this.getModel("worklistView").setProperty("/worklistTableTitle", sTitle);
		},

		/**
		 * Event handler when a table item gets pressed
		 * @param {sap.ui.base.Event} oEvent the table selectionChange event
		 * @public
		 */
		onPress : function (oEvent) {
			// The source is the list item that got pressed
			this._showObject(oEvent.getSource());
		},

		/**
		 * Event handler for navigating back.
		 * We navigate back in the browser history
		 * @public
		 */
		onNavBack : function() {
			// eslint-disable-next-line sap-no-history-manipulation
			history.go(-1);
		},


		onSearch : function (oEvent) {
			if (oEvent.getParameters().refreshButtonPressed) {
				// Search field's 'refresh' button has been pressed.
				// This is visible if you select any master list item.
				// In this case no new search is triggered, we only
				// refresh the list binding.
				this.onRefresh();
			} else {
				var aTableSearchState = [];
				var sQuery = oEvent.getParameter("query");

				if (sQuery && sQuery.length > 0) {
					aTableSearchState = [new Filter("ProductID", FilterOperator.Contains, sQuery)];
				}
				this._applySearch(aTableSearchState);
			}

		},

		/**
		 * Event handler for refresh event. Keeps filter, sort
		 * and group settings and refreshes the list binding.
		 * @public
		 */
		onRefresh : function () {
			var oTable = this.byId("table");
			oTable.getBinding("items").refresh();
		},
		
		onQuickFilter: function(oEvent) {
			var sKey = oEvent.getParameter("key");
			var oFilter = this._mFilters[sKey];
			var oTable = this.byId("table");
			var oBinding = oTable.getBinding("items");
			
			if(oFilter){
				oBinding.filter(oFilter);
			}
			else{
				oBinding.filter([]);
			}
		},
		
		onShowDetailPopover: function(oEvent) {
			var oPopover = this._getPopover();
			oPopover.bindElement(oEvent.getSource().getBindingContext().getPath());
			
			var oOpener = oEvent.getParameter("domRef");
			oPopover.openBy(oOpener);
		},
		
		_getPopover: function() {
			if(!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("opensap.manageproducts.ManageProducts.view.DetailPopover", this);
				this.getView().addDependent(this._oPopover);
			}	
			
			return this._oPopover;
		},

		
		/* =========================================================== */
		/* internal methods                                            */
		/* =========================================================== */

		/**
		 * Shows the selected item on the object page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showObject : function (oItem) {
			this.getRouter().navTo("object", {
				objectId: oItem.getBindingContext().getProperty("ProductID")
			});
		},

		/**
		 * Internal helper method to apply both filter and search state together on the list binding
		 * @param {sap.ui.model.Filter[]} aTableSearchState An array of filters for the search
		 * @private
		 */
		_applySearch: function(aTableSearchState) {
			var oTable = this.byId("table"),
				oViewModel = this.getModel("worklistView");
			oTable.getBinding("items").filter(aTableSearchState, "Application");
			// changes the noDataText of the list in case there are no filter results
			if (aTableSearchState.length !== 0) {
				oViewModel.setProperty("/tableNoDataText", this.getResourceBundle().getText("worklistNoDataWithSearchText"));
			}
		}

	});
});