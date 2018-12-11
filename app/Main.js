/*
  Copyright 2017 Esri

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.​
*/

define([
  "calcite",
  "dojo/_base/declare",
  "ApplicationBase/ApplicationBase",
  "dojo/i18n!./nls/resources",
  "ApplicationBase/support/itemUtils",
  "ApplicationBase/support/domHelper",
  "dojo/on",
  "dojo/query",
  "dojo/dom",
  "dojo/dom-class",
  "dojo/dom-construct",
  "esri/identity/IdentityManager",
  "esri/core/Evented",
  "esri/core/promiseUtils",
  "esri/WebMap",
  "esri/views/MapView",
  "esri/portal/Portal",
  "esri/layers/Layer",
  "esri/geometry/projection",
  "esri/geometry/SpatialReference",
  "esri/widgets/Home",
  "esri/widgets/Search",
  "esri/widgets/BasemapGallery",
  "esri/widgets/Expand",
  "Application/TemplateConfiguration"
], function (calcite, declare, ApplicationBase, i18n, itemUtils, domHelper,
             on, query, dom, domClass, domConstruct,
             IdentityManager, Evented, promiseUtils, WebMap, MapView, Portal, Layer, projection, SpatialReference,
             Home, Search, BasemapGallery, Expand, TemplateConfiguration) {

  return declare([Evented], {

    /**
     * CONSTRUCTOR
     */
    constructor: function () {
      this.CSS = {
        loading: "configurable-application--loading"
      };
      this.base = null;

      // CALCITE WEB //
      calcite.init();
    },

    /**
     * INIT
     *
     * @param base
     */
    init: function (base) {
      if(!base) {
        console.error("ApplicationBase is not defined");
        return;
      }
      domHelper.setPageLocale(base.locale);
      domHelper.setPageDirection(base.direction);

      this.base = base;
      const config = base.config;
      const results = base.results;
      const find = config.find;
      const marker = config.marker;

      const allMapAndSceneItems = results.webMapItems.concat(results.webSceneItems);
      const validMapItems = allMapAndSceneItems.map(function (response) {
        return response.value;
      });

      const firstItem = validMapItems[0];
      if(!firstItem) {
        console.error("Could not load an item to display");
        return;
      }
      config.title = (config.title || itemUtils.getItemTitle(firstItem));
      domHelper.setPageTitle(config.title);

      const viewProperties = itemUtils.getConfigViewProperties(config);
      viewProperties.container = "view-container";

      const portalItem = this.base.results.applicationItem.value;
      const appProxies = (portalItem && portalItem.appProxies) ? portalItem.appProxies : null;

      itemUtils.createMapFromItem({ item: firstItem, appProxies: appProxies }).then((map) => {
        viewProperties.map = map;
        itemUtils.createView(viewProperties).then((view) => {
          view.when(() => {
            this.viewReady(config, firstItem, view).then(() => {
              domClass.remove(document.body, this.CSS.loading);

              //
              // SELF-CONFIGURABLE TEMPLATE //
              //
              this.initializeSelfConfigurableTemplate(view, config);

            });
          });
        });
      });
    },

    /**
     * USER SIGN IN
     *
     * @returns Promise
     */
    initializeUserSignIn: function () {

      const checkSignInStatus = () => {
        return IdentityManager.checkSignInStatus(this.base.portal.url).then(userSignIn);
      };
      IdentityManager.on("credential-create", checkSignInStatus);
      IdentityManager.on("credential-destroy", checkSignInStatus);

      // SIGN IN NODE //
      const signInNode = dom.byId("sign-in-node");
      const userNode = dom.byId("user-node");

      // UPDATE UI //
      const updateSignInUI = () => {
        if(this.base.portal.user) {
          dom.byId("user-firstname-node").innerHTML = this.base.portal.user.fullName.split(" ")[0];
          dom.byId("user-fullname-node").innerHTML = this.base.portal.user.fullName;
          dom.byId("username-node").innerHTML = this.base.portal.user.username;
          dom.byId("user-thumb-node").src = this.base.portal.user.thumbnailUrl;
          domClass.add(signInNode, "hide");
          domClass.remove(userNode, "hide");
        } else {
          domClass.remove(signInNode, "hide");
          domClass.add(userNode, "hide");
        }
        return promiseUtils.resolve();
      };

      // SIGN IN //
      const userSignIn = () => {
        this.base.portal = new Portal({ url: this.base.config.portalUrl, authMode: "immediate" });
        return this.base.portal.load().then(() => {
          this.emit("portal-user-change", {});
          return updateSignInUI();
        }).otherwise(console.warn);
      };

      // SIGN OUT //
      const userSignOut = () => {
        IdentityManager.destroyCredentials();
        this.base.portal = new Portal({});
        this.base.portal.load().then(() => {
          this.base.portal.user = null;
          this.emit("portal-user-change", {});
          return updateSignInUI();
        }).otherwise(console.warn);

      };

      // USER SIGN IN //
      on(signInNode, "click", userSignIn);

      // SIGN OUT NODE //
      const signOutNode = dom.byId("sign-out-node");
      if(signOutNode) {
        on(signOutNode, "click", userSignOut);
      }

      return checkSignInStatus();
    },

    /**
     * VIEW IS READY
     *
     * @param config
     * @param item
     * @param view
     */
    viewReady: function (config, item, view) {

      // TITLE //
      dom.byId("app-title-node").innerHTML = config.title;

      // USER SIGN IN //
      return this.initializeUserSignIn().always(() => {

        // SEARCH //
        const search = new Search({ view: view, searchTerm: this.base.config.search || "" });
        const searchExpand = new Expand({
          view: view,
          content: search,
          expandIconClass: "esri-icon-search",
          expandTooltip: "Search"
        });
        view.ui.add(searchExpand, { position: "top-left", index: 0 });

        // BASEMAPS //
        const basemapGalleryExpand = new Expand({
          view: view,
          content: new BasemapGallery({ view: view }),
          expandIconClass: "esri-icon-basemap",
          expandTooltip: "Basemap"
        });
        view.ui.add(basemapGalleryExpand, { position: "top-left", index: 1 });

        // HOME //
        const home = new Home({ view: view });
        view.ui.add(home, { position: "top-left", index: 2 });

        //
        // INSET VIEWS //
        //
        // PROJECTION ENGINE //
        projection.load().then(() => {

          // AVOID VIEW CONSTRUCTOR SR CONFLICT IF MAP IS ALREADY LOADED //
          view.map.initialViewProperties = null;

          // INSET VIEWS CONFIGS //
          const inset_views_config = this.base.config.inset_views || [];

          // CREATE INSET VIEWS //
          this.constructInsetViews(view, inset_views_config);

        });
      });

    },

    /**
     * SELF-CONFIGURABLE TEMPLATE
     *
     * @param view
     * @param config
     */
    initializeSelfConfigurableTemplate: function (view, config) {
      if(config.appid && config.edit) {
        const template_config = new TemplateConfiguration({ config: config, bookmarks: view.map.bookmarks });
        on(template_config, "change", config => {
          // RE-CONSTRUCT INSET VIEWS WHEN CONFIGURATION CHANGES //
          this.constructInsetViews(view, config.values.inset_views || []);
        });
        calcite.bus.emit("modal:open", { id: "configure-dialog" });
      }
    },

    /**
     * CONSTRUCT INSET VIEWS
     *
     * @param view
     * @param inset_views_config
     */
    constructInsetViews: function (view, inset_views_config) {

      // CLEAR ANY PREVIOUS INSET PANELS //
      query(".inset-panel").orphan();

      // BOOKMARKS //
      const bookmarks = view.map.bookmarks || [];

      // IF WE HAVE CONFIGS //
      if(inset_views_config.length) {

        // FIND BOOKMARK //
        const find_bookmark = (name) => {
          return bookmarks.find(bookmark => {
            return (bookmark.name === name);
          });
        };

        // WE NEED TO ADD THE VIEWS BY SORTING BASED ON POSITION FIRST THEN BY INDEX //
        inset_views_config.sort((a, b) => {
          return (a.position === b.position) ? (a.index - b.index) : a.position.localeCompare(b.position);
        }).forEach(inset_view_config => {
          // MAKE SURE WE STILL HAVE A BOOKMARK FOR THE CONFIG //
          const bookmark = find_bookmark(inset_view_config.name);
          if(bookmark && inset_view_config.enabled) {
            this.constructInsetView(view, inset_view_config, bookmark);
          }
        });

      } else {

        // IF WE DON'T HAVE CONFIGS THEN JUST LOAD THEM BASED ON THE DEFAULT BOOKMARK ORDER //
        bookmarks.forEach((bookmark, bookmark_idx) => {
          this.constructInsetView(view, {
            enabled: true,
            sr_wkid: view.spatialReference.wkid,
            position: "bottom-left",
            index: bookmark_idx
          }, bookmark);
        });
      }

    },

    /**
     *  CONSTRUCT INSET VIEW
     *
     * @param view
     * @param config
     * @param bookmark
     */
    constructInsetView: function (view, config, bookmark) {

      // INSET PANEL //
      const inset_panel = domConstruct.create("div", { className: "inset-panel inset-panel-padding-1 panel panel-white panel-no-border" });
      view.ui.add(inset_panel, { position: config.position, index: config.index });

      // INSET NODE //
      const inset_node = domConstruct.create("div", { className: "inset-node" }, inset_panel);

      // RESIZE TO MAINTAIN BOOKMARK EXTENT ASPECT RATIO //
      // OPTIONS:
      //  - DO WE SCALE HEIGHT?
      //  - DO WE USE VIEW CSS TO DRIVE SIZE?
      inset_node.style.height = `${((bookmark.extent.height / bookmark.extent.width) * 200)}px`;
      //inset_node.style.width = `${((bookmark.extent.width / bookmark.extent.height) * 200)}px`;

      // INSET EXTENT //
      let inset_extent = bookmark.extent.clone();

      // SR_WKID //
      const sr_wkid = config.sr_wkid;
      if(sr_wkid !== inset_extent.spatialReference.wkid) {
        inset_extent = projection.project(inset_extent, new SpatialReference({ wkid: sr_wkid }));
      }

      // INSET VIEW //
      const inset_view = new MapView({
        container: inset_node,
        // ALTERNATE SR WORKAROUND - THIS WOULD MAKE THE MAPS DISCONNECTED (LAYER VIS, ETC...) //
        //map: new WebMap({ portalItem: view.map.portalItem }),
        map: view.map,
        ui: { components: [] },
        extent: inset_extent,
        spatialReference: inset_extent.spatialReference
      });
      inset_view.when(() => {

        // TITLE //
        const title_label = domConstruct.create("mark", {
          className: "label label-blue font-size--3",
          innerHTML: bookmark.name,
          title: sr_wkid
        });
        inset_view.ui.add(title_label, "top-left");

        // EXTENT CHANGE //
        inset_view.watch("extent", extent => {
          if(!inset_extent.contains(extent)) {
            inset_view.extent = inset_extent;
          }
        });
      }, error => {
        domConstruct.create("div", { className: "font-size--3 avenir-italic text-red", innerHTML: JSON.stringify(error, null, "  ") }, inset_node, "only");
      });

    }

  });
});