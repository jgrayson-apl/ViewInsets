/**
 *
 * InsetViews
 *  - Create inset views from bookmarks
 *
 * Author:   John Grayson - Applications Prototype Lab - Esri
 * Created:  12/6/2018 - 0.0.1 -
 * Modified:
 *
 */
define([
  "esri/core/Accessor",
  "esri/core/Evented",
  "esri/views/MapView",
  "esri/core/Collection",
  "esri/webmap/Bookmark",
], function (Accessor, Evented, MapView, Collection, Bookmark) {


  const InsetView = Accessor.createSubclass([Evented], {
    declaredClass: "InsetView",

    properties: {
      view: {
        type: MapView
      },
      bookmark: {
        type: Bookmark
      }
    }

  });

  const InsetViews = Accessor.createSubclass([Evented], {
    declaredClass: "InsetViews",

    properties: {
      view: {
        type: MapView
      },
      bookmarks: {
        type: Collection.ofType(Bookmark)
      }
    }

  });

  InsetViews.version = "0.0.1";

  return InsetViews;
});