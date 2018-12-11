/**
 *
 * TemplateConfiguration
 *  - Manage the template configuration
 *
 * http://doc.arcgis.com/en/arcgis-online/create-maps/configurable-templates.htm
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:   4/5/2018 - 0.0.1 -
 * Modified: 12/3/2018 - 0.0.2 - View Insets
 *
 */
define([
  "esri/core/Accessor",
  "esri/core/Evented",
  "dojo/on",
  "dojo/query",
  "dojo/dom",
  "dojo/dom-attr",
  "dojo/dom-class",
  "dojo/dom-construct",
  "esri/portal/PortalItem",
  "esri/core/Collection",
  "esri/webmap/Bookmark",
], function (Accessor, Evented, on, query, dom, domAttr, domClass, domConstruct, PortalItem, Collection, Bookmark) {

  /**
   * TEMPLATE CONFIGURATION
   */
  const TemplateConfiguration = Accessor.createSubclass([Evented], {
    declaredClass: "TemplateConfiguration",

    properties: {
      bookmarks: {
        type: Collection.ofType(Bookmark),
        value: null,
        set: function (value) {
          this._set("bookmarks", value);
          this.initializeUI();
        }
      },
      config: {
        type: Object,
        value: null,
        set: function (value) {
          this._set("config", value);
          if(this.config.appid) {
            this.appItem = new PortalItem({ id: this.config.appid });
          }
        }
      },
      appItem: {
        type: PortalItem,
        value: { values: {} },
        dependsOn: ["config"],
        set: function (value) {
          this._set("appItem", value);
          this.appItem.load().then(() => {
            this.appItem.fetchData().then((response) => {
              this.templateConfig = response || { values: {} };
            });
          });
        }
      },
      templateConfig: {
        type: Object,
        value: null,
        dependsOn: ["bookmarks", "appItem"],
        set: function (value) {
          this._set("templateConfig", value);
          // LOAD TEMPLATE CONFIG //
          if(this.templateConfig.values.inset_views) {
            this.loadConfiguration(this.templateConfig.values.inset_views);
          }
        }
      }
    },

    /**
     * INITIALIZE UI
     */
    initializeUI: function () {

      if(this.bookmarks && (this.bookmarks.length > 0)) {
        domClass.add("no-configuration", "hide");

        this.bookmarks.forEach((bookmark, bookmark_idx) => {

          // INSET VIEW NODE //
          const inset_view_node = domConstruct.create("tr", {
            className: "inset-view",
            "data-name": bookmark.name
          }, "inset-views-list");

          // NAME //
          domConstruct.create("td", { innerHTML: bookmark.name }, inset_view_node);

          // ENABLED //
          const enabled_node = domConstruct.create("td", {}, inset_view_node);
          const enabled_input = domConstruct.create("input", {
            className: "margin-left-1",
            "data-param": "enabled",
            type: "checkbox",
            checked: true
          }, enabled_node);
          // SET ENABLED //
          on(enabled_input, "change", () => {
            domClass.remove("save-configuration-btn", "btn-disabled");
            this.emit("change", this.getCurrentConfig());
          });


          // SR_WKID //
          const sr_wkid_node = domConstruct.create("td", {}, inset_view_node);
          const sr_wkid_input = domConstruct.create("input", {
            "data-param": "sr_wkid",
            type: "number", min: 0, step: 1
          }, sr_wkid_node);
          // SET SR_WKID //
          sr_wkid_input.valueAsNumber = bookmark.extent.spatialReference.wkid;
          on(sr_wkid_input, "change", () => {
            domClass.remove("save-configuration-btn", "btn-disabled");
            this.emit("change", this.getCurrentConfig());
          });


          // POSITION //
          const position_node = domConstruct.create("td", {}, inset_view_node);
          const position_select = domConstruct.create("select", {
            "data-param": "position"
          }, position_node);
          domConstruct.create("option", { value: "top-left", innerHTML: "top-left" }, position_select);
          domConstruct.create("option", { value: "top-right", innerHTML: "top-right" }, position_select);
          domConstruct.create("option", { value: "bottom-left", innerHTML: "bottom-left" }, position_select);
          domConstruct.create("option", { value: "bottom-right", innerHTML: "bottom-right" }, position_select);
          // SET POSITION //
          position_select.value = "bottom-left";
          on(position_select, "change", () => {
            domClass.remove("save-configuration-btn", "btn-disabled");
            this.emit("change", this.getCurrentConfig());
          });

          // INDEX //
          const index_node = domConstruct.create("td", {}, inset_view_node);
          const index_input = domConstruct.create("input", {
            "data-param": "index",
            className: "text-center",
            type: "number", min: 0, step: 1
          }, index_node);
          // SET INDEX //
          index_input.valueAsNumber = bookmark_idx;
          on(index_input, "input", () => {
            domClass.remove("save-configuration-btn", "btn-disabled");
            this.emit("change", this.getCurrentConfig());
          });

        });

        // SAVE //
        on(dom.byId("save-configuration-btn"), "click", this.saveConfiguration.bind(this));
      }

      // CLOSE //
      on(dom.byId("close-btn"), "click", this.closeConfiguration.bind(this));

    },

    /**
     * LOAD CONFIGURATION
     *
     * @param inset_views
     */
    loadConfiguration: function (inset_views) {

      // INSET VIEWS INFOS //
      inset_views.forEach((inset_view, inset_view_idx) => {

        // DO WE HAVE A UI FOR AN INSET WITH THIS NAME //
        const inset_view_node = query(`tr[data-name="${inset_view.name}"]`)[0];
        if(inset_view_node) {

          const enabled_input = query(`input[data-param="enabled"]`, inset_view_node)[0];
          if(enabled_input) {
            enabled_input.checked = inset_view.hasOwnProperty("enabled") ? inset_view.enabled : true;
          }
          const sr_wkid_input = query(`input[data-param="sr_wkid"]`, inset_view_node)[0];
          if(sr_wkid_input) {
            sr_wkid_input.valueAsNumber = inset_view.hasOwnProperty("sr_wkid") ? inset_view.sr_wkid : 102100;
          }
          const position_select = query(`select[data-param="position"]`, inset_view_node)[0];
          if(position_select) {
            position_select.value = inset_view.hasOwnProperty("position") ? inset_view.position : "bottom-left";
          }
          const index_input = query(`input[data-param="index"]`, inset_view_node)[0];
          if(index_input) {
            index_input.valueAsNumber = inset_view.hasOwnProperty("index") ? inset_view.index : inset_view_idx;
          }
        }
      });

    },

    /**
     * GET CURRENT CONFIGURATION FROM UI
     *
     * @returns {{values: {inset_views: any[]}}}
     * @private
     */
    getCurrentConfig: function () {

      // INSET VIEWS INFOS //
      const inset_views_infos = query(".inset-view", "inset-views-list").map(inset_view_node => {
        const name = domAttr.get(inset_view_node, "data-name");
        const enabled_input = query(`input[data-param="enabled"]`, inset_view_node)[0];
        const sr_wkid_input = query(`input[data-param="sr_wkid"]`, inset_view_node)[0];
        const position_select = query(`select[data-param="position"]`, inset_view_node)[0];
        const index_input = query(`input[data-param="index"]`, inset_view_node)[0];
        return {
          name: name,
          enabled: enabled_input.checked,
          sr_wkid: sr_wkid_input.valueAsNumber,
          position: position_select.value,
          index: index_input.valueAsNumber
        };
      });

      // TEMPLATE CONFIG //
      return {
        values: {
          inset_views: Array.from(inset_views_infos)
        }
      };
    },

    /**
     * SAVE CONFIGURATION
     */
    saveConfiguration: function () {

      // INSET VIEWS CONFIGS //
      const templateConfig = this.getCurrentConfig();

      // SAVE CONFIGURATION //
      domClass.add("save-configuration-btn", "btn-disabled");
      domClass.remove("save-configuration-label", "hide");
      this.appItem.update({ data: templateConfig }).then(() => {
        domClass.remove("save-configuration-btn", "btn-disabled");
        domClass.add("save-configuration-label", "hide");
      });
    },

    /**
     *  CLOSE CONFIGURATION DIALOG AND RELOAD APP
     */
    closeConfiguration: function () {
      window.location = `${window.location.origin}${window.location.pathname}?appid=${this.config.appid}`;
    }

  });

  TemplateConfiguration.version = "0.0.2";

  return TemplateConfiguration;
});
