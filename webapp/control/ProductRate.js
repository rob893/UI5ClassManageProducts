sap.ui.define([
		'sap/ui/core/Control',
		'sap/m/Button',
		'sap/m/RatingIndicator'
	],
	function(Control, Button, RatingIndicator) {
		"use strict";
		
		return Control.extend("opensap.manageproducts.ManageProducts.control.ProductRate", {
			
			metadata: {
				properties: {
					value: {
						type: "float",
						defaultValue: 0
					}
				},
				aggregations: {
					_button: {
						type: "sap.m.Button",
						visibility: "hidden",
						multiple: false
					},
					_rating: {
						type: "sap.m.RatingIndicator",
						visibility: "hidden",
						multiple: false
					}
				},
				events: {
					valueSubmit: {
						parameters: {
							value: {
								type: "float"
							}
						}
					}
				}
			},
			
			init: function() {
				this.setAggregation("_rating", new RatingIndicator({
					value: this.getValue(),
					maxValue: 5,
					liveChange: this._onRate.bind(this)
				}).addStyleClass("sapUiTinyMarginEnd"));
				
				this.setAggregation("_button", new Button({
					text: "{i18n>productRatingButtonText}",
					enabled: false,
					press: this._onSubmit.bind(this)
				}));
			},
			
			_onSubmit: function() {
				this.fireEvent("valueSubmit", {
					value: this.getValue()	
				});
				
				this.getAggregation("_button").setEnabled(false);
			},
			
			_onRate: function(oEvent) {
				this.setValue(oEvent.getParameter("value"));
				this.getAggregation("_button").setEnabled(true);
			},
			
			renderer: function(oRm, oControl) {
				oRm.write("<div");
				oRm.writeControlData(oControl);
				oRm.addClass("sapUiSmallMarginBeginEnd");
				oRm.writeClasses();
				oRm.write(">");
				
				oRm.renderControl(oControl.getAggregation("_rating"));
				oRm.renderControl(oControl.getAggregation("_button"));
				
				oRm.write("</div>");
			}
		});
	}
);