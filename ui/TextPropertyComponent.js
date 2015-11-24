'use strict';

var Component = require('./Component');
var $$ = Component.$$;
var Annotator = require('../model/Annotator');
var AnnotationComponent = require('./AnnotationComponent');


/**
  Renders a text property. Used internally by different components (e.g. ui/TextPropertyEditor)
  
  @class
  @component
  @extends ui/Component
  
  @prop {String[]} path path to a text property
  @prop {String} [tagName] specifies which tag should be used - defaults to `div`

  @example

  ```js
  $$(TextProperty, {
    path: [ 'paragraph-1', 'content']
  })
  ```
*/

function TextPropertyComponent() {
  Component.apply(this, arguments);
}

TextPropertyComponent.Prototype = function() {

  this.initialize = function() {
    // Only register Property when inside a surface context
    if (this.getSurface()) {
      this.getTextPropertyManager().registerProperty(this);  
    }
  };

  this.dispose = function() {
    // Only register Property when inside a surface context
    if (this.getSurface()) {
      this.getTextPropertyManager().unregisterProperty(this);  
    }
  };

  this.getInitialState = function() {
    return {
      fragments: this.getTextPropertyManager().getFragments(this.props.path)
    };
  };

  this.render = function() {
    var componentRegistry = this.context.componentRegistry;
    var doc = this.getDocument();
    var path = this.getPath();
    var text = doc.get(path) || "";
    var annotations = this.getAnnotations();

    var el = $$(this.props.tagName || 'span')
      .addClass('sc-text-property')
      .attr({
        "data-path": this.props.path.join('.'),
        spellCheck: false,
      })
      .css({
        whiteSpace: "pre-wrap"
      });

    var annotator = new Annotator();
    var fragmentCounters = {};
    annotator.onText = function(context, text) {
      if (text && text.length > 0) {
        context.append(text);
      }
    };
    annotator.onEnter = function(entry) {
      var node = entry.node;
      var id = node.id;
      if (!fragmentCounters[id]) {
        fragmentCounters[id] = 0;
      }
      fragmentCounters[id] = fragmentCounters[id]+1;

      var ComponentClass = componentRegistry.get(node.type);
      if (!ComponentClass) {
        ComponentClass = AnnotationComponent;
      }

      if (node.type === 'cursor') {
        return $$('span').addClass('se-cursor');
      }

      var el = $$(ComponentClass, {
        doc: doc,
        node: node,
      });
      // adding keys here, enables preservative rerendering
      // TODO: experiment, if this reduces cursor flickering, already...
      // el.ref(id + "@" + fragmentCounters[id]);
      // special support for container annotation fragments
      if (node.type === "container-annotation-fragment") {
        el.addClass(node.anno.getTypeNames().join(' ').replace(/_/g, "-"));
        el.addClass("se-annotation-fragment");
      } else if (node.type === "container-annotation-anchor") {
        el.addClass(node.anno.getTypeNames().join(' ').replace(/_/g, "-"));
        el.addClass("se-anchor");
        el.addClass(node.isStart?"start-anchor":"end-anchor");
      } else if (node.type === "cursor") {
        el.addClass('se-cursor');
      } else if (node.type === "selection-fragment") {
        el.addClass('se-selection-fragment');
      }
      return el;
    };
    annotator.onExit = function(entry, context, parentContext) {
      parentContext.append(context);
    };
    annotator.start(el, text, annotations);
    // NOTE: this is particularly necessary for text-properties of
    // block level text nodes. Otherwise, the element will not y-expand
    // as desired, and soft-breaks are not visible.
    // TODO: sometimes we do not want to do this. Make it configurable.
    el.append($$('br'));
    return el;
  };

  this.getAnnotations = function() {
    var doc = this.getDocument();
    var annotations = doc.getIndex('annotations').get(this.props.path);
    if (this.state.fragments) {
      annotations = annotations.concat(this.state.fragments);
    }
    return annotations;
  };

  this.getContainer = function() {
    return this.getSurface().getContainer();
  };

  this.getController = function() {
    return this.context.controller;
  };

  this.getDocument = function() {
    return this.getController().getDocument();
  };

  this.getPath = function() {
    return this.props.path;
  };

  this.getElement = function() {
    return this.$el[0];
  };

  this.getSurface = function() {
    return this.context.surface;
  };

  // TextPropertyManager API

  this.setFragments = function(fragments) {
    this.extendState({
      fragments: fragments
    });
  };

  this.update = function() {
    this.rerender();
  };

  this.getTextPropertyManager = function() {
    return this.getSurface().getTextPropertyManager();
  };

};

Component.extend(TextPropertyComponent);

module.exports = TextPropertyComponent;