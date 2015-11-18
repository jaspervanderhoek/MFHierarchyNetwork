/*
    NetworkDiagram
    ========================

    @file      : NetworkDiagram.js
    @version   : 1.0
    @author    : Jasper van der Hoek
    @date      : Mon, 16 Nov 2015 23:20:58 GMT
    @copyright : 
    @license   : MIT

    Documentation
    ========================
    Describe your widget here.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",
    "mxui/dom",
    "dojo/dom",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "NetworkDiagram/lib/jquery-1.11.2",
    "NetworkDiagram/lib/vis.min"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, lang, dojoText, dojoHtml, dojoEvent, _jQuery, vis) {
    "use strict";

    var $ = _jQuery.noConflict(true);
    
    // Declare widget's prototype.
    return declare("NetworkDiagram.widget.NetworkDiagram", [ _WidgetBase ], {

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        
		height: "500px;",
		widht: "100%;",
        
        // create an array with nodes
        nodes : new vis.DataSet([]),
        // create an array with edges
        edges : new vis.DataSet([]),
        
        relationConfig: [],
        entityMap: [],
        loaded: [],
		isLoaded: false,
        
//        relationList: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            this._handles = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            console.log(this.id + ".postCreate");
            
            //Prepare all configuration
            
            
            this.resetStatus();
            this.relationConfig = [];
            this.entityMap = [];
//            this.addRelationConfig( this.nodeEntity, null, null, null, this.displayAttr, this.constraint, this.displayColor );
            this.entityMap[this.nodeEntity] = { entityName: this.nodeEntity, 
                                                displayAttr: this.displayAttr, 
                                                constraint: this.constraint, 
                                                color: this.displayColor,
                                                nodeSize: this.mainNodeSize  };
            
            for (var i=0; i<this.relationList.length; i++) {
                var relation = this.relationList[i];
                
                var association = relation.nodeEntity2.split('/'),
                    keyEntity='',assEntity='', color=null;
                
//                if( relation.usage == 'Entity1uses2' ) {
//                    keyEntity = relation.nodeEntity1;
//                    assEntity = association[1];
//                    
//                    association = { name: association[0], 
//                                   entity: assEntity,
//                                   constraint: null,
//                                   color: null,
//                                   displayAttr: relation.displayAttr2 };
//                }
//                else { //Used By
//                    keyEntity = association[1];  //Microflow
//                    assEntity = relation.nodeEntity1;  //Activity
//                    
//                    association = { name: association[0], 
//                                   entity: assEntity,
//                                   constraint: relation.constraint,
//                                   color: relation.displayColor,
//                                   displayAttr: relation.displayAttr1 };
//                }
//                
//                if( !this.relationConfig[ keyEntity ] ) {
//                    this.relationConfig[ keyEntity ] = {entityName: keyEntity, associations:[], displayAttr: null, constraint: null, color: null };
//                }
//                
//                this.relationConfig[ keyEntity ].associations.push( assocation );
                
                //If entity 1 uses 2, entity 1 must be the key in loading the data
                if( relation.usage == 'Entity1uses2' ) {
                    
                    
                    if( !this.relationConfig[ relation.nodeEntity1 ] ) {
                        this.relationConfig[ relation.nodeEntity1 ] = {entityName: relation.nodeEntity1, associations:[] };
                    }
//                    this.relationConfig[relation.nodeEntity1].associations.push( relation.reference );
                    this.relationConfig[relation.nodeEntity1].associations.push( {id: relation.reference, assocationName: association[0], entityName: association[1] } );
                    
                    this.entityMap[relation.reference] = { entityName: association[1], 
                                                           displayAttr: relation.displayAttr2, 
                                                           constraint: relation.constraint2, 
                                                           color: relation.displayColor,
                                                           nodeSize: relation.nodeSize,
                                                           tooltipAttr: relation.tooltipAttr1 };
                    
                    
//                    this.addRelationConfig( assId, relation.nodeEntity1,    //activity
//                                           relation.displayAttr1,
//                                           
//                                           association[0],                  //activity calls MF
//                                           association[1],                  //MF
//                                           relation.displayAttr2,
//                                           
//                                           relation.constraint, 
//                                           relation.displayColor );
//                    
//                    //Just to  be sure add the display attribute for the second entity too
//                    this.addRelationConfig( association[1], association[1], 
//                                            association[0],
//                                            relation.nodeEntity1, 
//                                            null, relation.displayAttr2, null );
                }
                
                //When entity 1 is used by based on entity 1 we should continue loading
                else {
                    
                    if( !this.relationConfig[ association[1] ] ) {
                        this.relationConfig[ association[1] ] = {entityName: association[1], associations:[] };
                    }
                    this.relationConfig[association[1]].associations.push( {id: relation.reference, assocationName: association[0], entityName: relation.nodeEntity1 } );
                    
                    this.entityMap[relation.reference] = { entityName: relation.nodeEntity1, 
                                                           displayAttr: relation.displayAttr1, 
                                                           constraint: relation.constraint1, 
                                                           color: relation.displayColor,
                                                           nodeSize: relation.nodeSize,
                                                           tooltipAttr: relation.tooltipAttr1 };
                    
                    
//                    this.addRelationConfig( association[1], association[0], relation.nodeEntity1, relation.displayAttr2, relation.constraint, relation.displayColor );
                    
                    //Just to  be sure add the display attribute for the second entity too
//                    this.addRelationConfig( relation.nodeEntity1, null, null, relation.displayAttr1, null, relation.displayColor );
                }
            }            
        },

//        addRelationConfig: function( objectId, keyEntity, displayAttr, 
//                                      associationId, association, associatedEntity, associationDisplayAttr, 
//                                      constraint, color ) {
//            if( !this.relationConfig[ objectId ] ) {
//                this.relationConfig[ objectId ] = {entityName: keyEntity, associations:[], displayAttr: null, constraint: null, color: null };
//            }
//            
//            
//            if( association ) 
//                this.relationConfig[ objectId ].associations.push( {name: association, entity: associatedEntity, objectId: associationId } );
//            
//            if( constraint )
//                this.relationConfig[ objectId ].constraint = constraint;
//            if( color && !this.relationConfig[ keyEntity ].color ) 
//                this.relationConfig[ objectId ].color = color;
//            
//            if( displayAttr && !this.relationConfig[ keyEntity ].displayAttr ) 
//                this.relationConfig[ objectId ].displayAttr = displayAttr;
//            
//            
//            this.loaded[objectId] = 0;
//        },
            
        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            console.log(this.id + ".update");

            this._contextObj = obj;
            
            this.resetStatus();
            this._resetSubscriptions();
            this._updateRendering();

            callback();
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function() {},

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function() {},

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function(box) {},

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function() {
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
            this.resetStatus();
        },

        // Rerender the interface.
        _updateRendering: function() {
            this._loadData( this.entityMap[this.nodeEntity] );
        },

         _loadData: function ( config ) {

            //default fetch
            var xpath = '//' + config.entityName, filters = {};

            filters.sort = [[config.displayAttr, "ASC"]];
//                if (this.limit > 0) {
//                    filters.amount = this.limit;
//                }
            if (config.constraint) {
                xpath = xpath + config.constraint.replace('[%CurrentObject%]', this._contextObj);
            }
            mx.data.get({
                xpath: xpath,
                filter: filters,
                callback: lang.hitch(this, function (objs) {
                    this._fetchMicroflows(objs, config, null, this.nodeEntity );
                })
            });
        },

        _fetchMicroflows: function(objs, config, refObjId, associationId ) {
            if( refObjId != null ) {
                for( var i =0; i< objs.length;i++ ) {
                    console.log( 'adding edge: ' + refObjId + ' - ' + objs[i].getGUID());
                    this.edges._addItem( {from: refObjId, to: objs[i].getGUID()} );
                }
            }
            
            var loadingId = config.entityName + (refObjId != null? refObjId:'');
            
            //Only if the config 
            if( this.loaded[loadingId] == null || this.loaded[loadingId] <= 1 ) {
                this.loaded[loadingId] = 1;
            }
            var curEntityId = this.entityMap[associationId].entityName;
            var refConfig = this.relationConfig[curEntityId];

            if( refConfig && refConfig.associations && refConfig.associations.length > 0 ) {
                for( var associationDetails in refConfig.associations ) {
                    var config2 = refConfig.associations[associationDetails];
                    var assName = refConfig.associations[associationDetails].assocationName,
                        entityName = refConfig.associations[associationDetails].entityName,
                        nextAssociationId = refConfig.associations[associationDetails].id;

                    var relatedConfig = this.entityMap[nextAssociationId];

                    for( var objRef in objs ) {
                        var obj = objs[objRef];
                        var refLoadingId = entityName + obj.getGUID();
                        if( this.loaded[refLoadingId] == null || this.loaded[refLoadingId] <= 1 ) {
                            this.loaded[refLoadingId] = 1;
                            
                            this._addNode(obj, config );

                            //default fetch
                            var xpath = '//' + entityName + '[' + assName + '=\'' + obj.getGUID() + '\']' + ( relatedConfig.constraint != null ? relatedConfig.constraint.replace('[%CurrentObject%]', this._contextObj) : '') , filters = {};

                            filters.sort = [[relatedConfig.displayAttr, "ASC"]];
                            mx.data.get({
                                xpath: xpath,
                                filter: filters,
                                callback: lang.hitch(this, function (nextAssociationId, objConfig, refGuid, referencedObjs, ioArgs) {
                                    this._fetchMicroflows(referencedObjs, objConfig, refGuid, nextAssociationId);
                                }, nextAssociationId, relatedConfig, obj.getGUID())
                            });
                        }
                    }
                }
            }
            else {
                for( var objRef in objs ) {
                    this._addNode(objs[objRef], config );
                }
            }

            this.loaded[loadingId] = 2;
            
            
            if( this._allLoaded() ) {
                // provide the data in the vis format
                var data = {
                    nodes: this.nodes,
                    edges: this.edges
                };
                this._renderNetwork( data );
            }
        },
        
        _addNode: function( obj, config) {
            this.isLoaded = false;
            if( !this.nodes._getItem( obj.getGUID()) ) {
            	console.log( 'adding node: ' + obj.getGUID() + ' | label ' + obj.getAttribute(config.displayAttr) + ' | color: ' + config.color);
                this.nodes._addItem({
                    id: obj.getGUID(), 
                    label: obj.getAttribute(config.displayAttr), 
                    title: ( config.tooltipAttr != null ? obj.getAttribute(config.tooltipAttr) : '<b>' + obj.getAttribute(config.displayAttr) + '</b>'), 
                    color: config.color,
                    font: { size: 6 }, 
                    size: (config.nodeSize != null ? config.nodeSize : 10 )
                } );
            }
            
        },
        
        _allLoaded: function() {
            var allLoaded = true;
            for( var load in this.loaded ) {
                if( this.loaded[load] < 2 ) {
                    return false;
                }
            }
            
			
            return allLoaded;
        },
        
        resetStatus: function() {
            this.nodes = new vis.DataSet([]);
            this.edges = new vis.DataSet([]);
            this.loaded = [];
			this.isLoaded = false;
            
//            for (var config in this.entityMap ) {
//                this.loaded[config] = 0;
//            }
        },

        _renderNetwork: function(data) {
		
			if( this.isLoaded )
				return;
				
			this.isLoaded =true;
            var options = {
                layout: { randomSeed: 2 }, 
                
//				autoResize: true,
//				height: '100%',
                nodes: {
                    shape: 'dot',
                    scaling: {
                        min: 10,
                        max: 30,
                        //drawThreshold: 12,
                        //maxVisible: 20
                    },
                    font: {
                        size: 12,
                        face: 'Tahoma'
                    }
                },
                edges: {
                    color:{inherit:true},
                    width: 0.15,
                    smooth: {
                        type: 'discrete',
                        roundness: 0.25
                    }
                },
                interaction: {
                    hideEdgesOnDrag: false,
                    tooltipDelay: 200,
                    selectConnectedEdges: true
                },

				physics: {
					enabled: true,
                    "barnesHut": {
                        "gravitationalConstant": -44178,
                        "centralGravity": 0,
                        "springLength": 140,
                        "springConstant": 0.075,
                        "damping": 0.25,
                        "avoidOverlap": 0.92
                    },
                    "maxVelocity": 150,
                    "minVelocity": 10.07
//					repulsion: {
//						centralGravity: 0.2,
//						springLength: 200,
//						springConstant: 0.05,
//						nodeDistance: 100,
//						damping: 0.09
//					},
//					stabilization: {
//						enabled: false,
//						iterations: 100
//					},
//                    forceAtlas2Based: {
//                        gravitationalConstant: -50,
//                        centralGravity: 0.01,
//                        springConstant: 0.08,
//                        springLength: 100,
//                        damping: 0.4,
//                        avoidOverlap: 0
//                    }
				}
            };

            this.domNode.style.width=this.width;
            this.domNode.style.height=this.height;
            // initialize your network!
            var network = new vis.Network(this.domNode, data, options);   
            
//          network.on("click",neighbourhoodHighlight);

//			network.on("stabilizationProgress", function(params) {
//				this.doStabilizationStep(params);
//			});
//
//			network.once("stabilizationIterationsDone", function() {
//
//				var positionsSize = 0, key;
//				for (key in graph.positions) {
//					if (graph.positions.hasOwnProperty(key)) positionsSize++;
//				}
//
//				if (graph.styles.length > positionsSize){
//					// new positions must be calculated and send to server
//					network.storePositions();
//					updateRemotePositions(data.nodes._data,beerGraphServices);
//				}
//				this.doStabilizationDone();
//			});
        },
		
//		doStabilizationStep : function(params) {
//			var maxWidth = $('#border').width();
//			var minWidth = 20;
//			var widthFactor = params.iterations/params.total;
//			var width = Math.max(minWidth,maxWidth * widthFactor);
//
//			document.getElementById('bar').style.width = width + 'px';
//			document.getElementById('text').innerHTML = Math.round(widthFactor*100) + '%';
//		},
//
//		doStabilizationDone : function() {
//			document.getElementById('text').innerHTML = '100%';
//			document.getElementById('bar').style.width = $('#border').width();
//			document.getElementById('loadingBar').style.opacity = 0;
//			// really clean the dom element
//			setTimeout(function () {
//			document.getElementById('loadingBar').style.display = 'none'
//			}, 500);
//		},
        
        // Reset subscriptions.
        _resetSubscriptions: function() {
            // Release handles on previous object, if any.
            if (this._handles) {
                dojoArray.forEach(this._handles, function (handle) {
                    mx.data.unsubscribe(handle);
                });
                this._handles = [];
            }

            // When a mendix object exists create subscribtions. 
            if (this._contextObj) {
                var objectHandle = this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: lang.hitch(this, function(guid) {
                        this._updateRendering();
                    })
                });

                this._handles = [ objectHandle ];
            }
        },
        
//Start of random functions to help the widget be more userfriendly
        
        
/**
 * Add the connected nodes to the list of nodes we already have
 */
appendConnectedNodes: function(sourceNodes, allEdges) {
    var tempSourceNodes = [];
    // first we make a copy of the nodes so we do not extend the array we loop over.
    for (var i = 0; i < sourceNodes.length; i++) {
        tempSourceNodes.push(sourceNodes[i]);
    }

    for (var i = 0; i < tempSourceNodes.length; i++) {
        var nodeId = tempSourceNodes[i];
        if (sourceNodes.indexOf(nodeId) == -1) {
            sourceNodes.push(nodeId);
        }
        this.addUnique(this.getConnectedNodes(nodeId, allEdges),sourceNodes);
    }
    tempSourceNodes = null;
},
/**
 * Join two arrays without duplicates
 * @param fromArray
 * @param toArray
 */
addUnique: function(fromArray, toArray) {
    for (var i = 0; i < fromArray.length; i++) {
        if (toArray.indexOf(fromArray[i]) == -1) {
            toArray.push(fromArray[i]);
        }
    }
},

        
/**
 * Get a list of nodes that are connected to the supplied nodeId with edges.
 * @param nodeId
 * @returns {Array}
 */
getConnectedNodes: function(nodeId, allEdges) {
    var edgesArray = this.edges;
    var connectedNodes = [];

    for (var i = 0; i < edgesArray.length; i++) {
        var edge = edgesArray[i];
        if (edge.to == nodeId) {
            connectedNodes.push(edge.from);
        }
        else if (edge.from == nodeId) {
            connectedNodes.push(edge.to)
        }
    }
    return connectedNodes;
}
        
        
        
        
    });
});

require(["NetworkDiagram/widget/NetworkDiagram"], function() {
    "use strict";
});