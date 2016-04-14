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
    "NetworkDiagram/lib/vis",
    "dojo/text!NetworkDiagram/widget/template/NetworkDiagram.html"
], function(declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, lang, dojoText, dojoHtml, dojoEvent, _jQuery, vis, widgetTemplate) {
    "use strict";

    var $ = _jQuery.noConflict(true);
    
    // Declare widget's prototype.
    return declare("NetworkDiagram.widget.NetworkDiagram", [ _WidgetBase, _TemplatedMixin ], {
        
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,
        
        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _alertDiv: null,
        
		widht: "100%;",
        height: "",
        
        // prep the variable for nodes and lines
        nodes : null,
        allNodes : null,
        edges : null,
        
        relationConfig: null,
        entityMap: null,
        loaded: [],
		isLoaded: false,
        cacheBurst: null,
        cacheBurstValue: null,
        progressBar: false,
		highlightActive: false,
		network: null,
        
        domNodeNetworkMap: null,
        domNodeConfigure: null,
        
        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            this._handles = [];
            this.relationConfig = [];
            this.entityMap = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. 
        postCreate: function () {
            console.log(this.id + ".postCreate");
            this.resetStatus();
            
            this.domNodeNetworkMap = this.domNode.getElementsByClassName("networkdiagram-map")[0];
            this.domNodeConfigure = this.domNode.getElementsByClassName("networkdiagram-configure")[0];
            if( this.progressBar ) 
                this.domNodeNetworkMap.innerHTML = "<div id=\"graphContainer\"></div><div id=\"loadingBar\"><div class=\"row\"><div class=\"col-xs-12 text-center\"><img src=\"images/logo1_trans.gif\"></div></div><div class=\"row\"><div class=\"col-xs-12 text-center\"><div class=\"outerBorder\"><div id=\"text\">0%</div><div id=\"border\"><div id=\"bar\"></div></div></div></div></div>";


            for (var i=0; i<this.relationList.length; i++) {
                var relation = this.relationList[i];
                
                var association = [],
                    keyEntity='',assEntity='', color=null;
                
                if( relation.nodeEntity2 != null )
                    association = relation.nodeEntity2Ref.split('/');
                else
                    association = relation.nodeEntity2RefSet.split('/');
                
                    if( !this.relationConfig[ relation.nodeEntity1 ] ) {
                        this.relationConfig[ relation.nodeEntity1 ] = {entityName: relation.nodeEntity1, associations:[] };
                    }
                    this.relationConfig[relation.nodeEntity1].associations.push( {id: relation.reference, associationName: association[0], entityName: association[1], usage: ( relation.usage == 'Entity1uses2' ? 'from' : 'to' ) } );
                    
                
//                    if( !this.relationConfig[ association[1] ] ) {
//                        this.relationConfig[ association[1] ] = {entityName: association[1], associations:[] };
//                    }
//                    this.relationConfig[association[1]].associations.push( {id: relation.reference, associationName: association[0], entityName: relation.nodeEntity1, usage: ( relation.usage == 'Entity1uses2' ? 'from' : 'to' )  } );
            }
            
            for (var i=0; i<this.entityList.length; i++) {
                var entity = this.entityList[i];
                
                this.loaded[entity.nodeEntity] = 0;
                this.entityMap[entity.nodeEntity] = { entityName: entity.nodeEntity, 
                                                       displayAttr: entity.displayAttr, 
                                                       constraint: entity.constraint, 
                                                       color: entity.displayColor,
                                                       nodeSize: entity.nodeSize,
                                                       tooltipAttr: entity.tooltipAttr };
            }
            
            var data = {
                    nodes: this.nodes,
                    edges: this.edges
                };
				
				this._renderNetwork( data );
        },        
        resetStatus: function() {
            this.nodes = new vis.DataSet([]);
            this.edges = new vis.DataSet([]);
			
			for( var load in this.loaded ) {
                this.loaded[load] = 0;
			}
				
			this.isLoaded = false;
        },

        
        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function(obj, callback) {
            console.log(this.id + ".update");

            this._contextObj = obj;
            
            var newCacheBurstVal = Math.floor((Math.random() * 1000000));;
            
            if( this.cacheBurst !== null ) {
                newCacheBurstVal = obj.getAttribute( this.cacheBurst );
            }
            
            if( newCacheBurstVal != this.cacheBurstValue ) {
                this.cacheBurstValue = newCacheBurstVal;
                
                this.resetStatus();
                this._resetSubscriptions();
                this._updateRendering();
            }

            callback();
        },
        
        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function(box) {
            if( this.height == "" || this.height == null ) 
                this.domNodeNetworkMap.style.height=window.innerHeight + 'px';
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function() {
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
            this.resetStatus();
            this.relationConfig = [];
            this.entityMap = [];
        },

        // Rerender the interface.
        _updateRendering: function() {
            for( var entityData in this.entityMap ) {
                this._loadData( this.entityMap[entityData] );
            }
        },

         _loadData: function ( config ) {

            //default fetch
            var xpath = '//' + config.entityName, filters = {};

            filters.sort = [[config.displayAttr, "ASC"]];
            if (config.constraint) {
                xpath = xpath + config.constraint.replace('[%CurrentObject%]', this._contextObj);
            }
            mx.data.get({
                xpath: xpath,
                filter: filters,
                callback: lang.hitch(this, function (objs) {
                    this._fetchMicroflows(objs, config, null, config.entityName );
                })
            });
        },

        _fetchMicroflows: function(objs, config, refObjId, associationId ) {
            
            //If we are doing this fetch for a referenced object, we'll have to setup the edges
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
                    var assName = refConfig.associations[associationDetails].associationName,
                        entityName = refConfig.associations[associationDetails].entityName,
                        nextAssociationId = refConfig.associations[associationDetails].id,
                        usage = refConfig.associations[associationDetails].usage;
                    
					if( usage == 'to' )
						usage = {to:{scaleFactor:3} };
					else 
						usage = {from:{scaleFactor:3} };
					
                    var relatedConfig = this.entityMap[nextAssociationId];

                    for( var objRef in objs ) {
                        var obj = objs[objRef];
                        var refLoadingId = entityName + obj.getGUID();
                        
                        if( obj.hasAttribute( assName ) ) {
                            var refIdArr = obj.getReferences( assName );
                            for( var i =0; i< refIdArr.length;i++ ) {
                                console.log( 'adding edge: ' + refIdArr[i] + ' - ' + obj.getGUID());
                                this.edges._addItem( {from: refIdArr[i], to: obj.getGUID(), arrows: usage } );
                            }
                        }
                        //Add the object to the node configuration
                        this._addNode(obj, config );
//                        if( this.loaded[refLoadingId] == null || this.loaded[refLoadingId] <= 1 ) {
//                            this.loaded[refLoadingId] = 1;
//                            
//                            //Add the object to the node configuration
//                            this._addNode(obj, config );
//
//                            //built the xpath to retrieve the objects
//                            var xpath = '//' + entityName + '[' + assName + '=\'' + obj.getGUID() + '\']';
//                            if( relatedConfig.constraint != null ) {
//                                xpath += relatedConfig.constraint.replace('[%CurrentObject%]', this._contextObj);
//                            }
//                            
//                            var filters = {};
//                            filters.sort = [[relatedConfig.displayAttr, "ASC"]];
//                            mx.data.get({
//                                xpath: xpath,
//                                filter: filters,
//                                callback: lang.hitch(this, function (nextAssociationId, objConfig, refGuid, referencedObjs, ioArgs) {
//                                    this._fetchMicroflows(referencedObjs, objConfig, refGuid, nextAssociationId);
//                                }, nextAssociationId, relatedConfig, obj.getGUID())
//                            });
//                        }
                    }
                }
            }
            else {
                for( var objRef in objs ) {
                    //Add the object to the node configuration
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
				
				this.network.setData( data );
				
				// get a JSON object to be able to do the highlighting (on click)
				this.allNodes = this.nodes.get({returnType:"Object"});
            }
        },
        
        _addNode: function( obj, config) {
            this.isLoaded = false;
            if( !this.nodes._getItem( obj.getGUID()) ) {
                var nodeSize = (config.nodeSize != null ? ( isNaN(config.nodeSize) ? obj.getAttribute(config.nodeSize) : config.nodeSize ) : 10 );
            	console.log( 'adding node: ' + obj.getGUID() + ' | label ' + obj.getAttribute(config.displayAttr) + ' | color: ' + config.color + ' | size: ' + nodeSize);
                this.nodes._addItem({
                    id: obj.getGUID(), 
                    label: obj.getAttribute(config.displayAttr), 
                    title: ( config.tooltipAttr != null ? obj.getAttribute(config.tooltipAttr) : '<b>' + obj.getAttribute(config.displayAttr) + '</b>'), 
                    color: config.color,
                    value: nodeSize
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

        _renderNetwork: function(data) {
		
			if( this.isLoaded )
				return;
			this.isLoaded =true;
            
            
            var options = {
                layout: { 
					randomSeed: 2,
					improvedLayout: false
				},
//				autoResize: true,
//				height: '100%',
				configure: {
					filter:function (option, path) {
						if (path.indexOf('physics') !== -1) {
							return true;
						}
						if (path.indexOf('nodes') !== -1) {
							if ( path.indexOf('color') == -1 && 
								 path.indexOf('background') == -1 &&
								 option != 'color' && 
								 option != 'background' ) {
								return true;
							}
						}
						return false;
					},
					showButton: true,
                    container: this.domNodeConfigure
				},
				manipulation: {
					enabled: false,
					initiallyActive: false,
					deleteNode: true
				},
                nodes: {
                    shape: 'dot',
                    scaling: {
                        min: 10,
                        max: 30
                    },
                    font: {
                        face: 'Tahoma',
						size: 13
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
                    /*"hierarchicalRepulsion": {
                        "centralGravity": 0,
                        "springLength": 200,
                        "springConstant": 0.005,
                        "damping": 0.5,
						"nodeDistance": 300
                    },*/
					/*
                    "barnesHut": {
                        "gravitationalConstant": -44178,
                        "centralGravity": 0,
                        "springLength": 200,
                        "springConstant": 0.075,
                        "damping": 0.25,
                        "avoidOverlap": 0.92
                    },*/
					
					"forceAtlas2Based": {
						"gravitationalConstant": -4000,
						"centralGravity": 0.005,
						"springLength": 300,
						"springConstant": 0.08,
						"damping": 0.85,
						"avoidOverlap": 1
					},
					"solver": "forceAtlas2Based",
					
					
					"maxVelocity": 150,
					//"minVelocity": 10.07,
					"minVelocity": 40,
					"timestep": 0.2
				}
            };

            this.domNode.style.width=this.width;
            if( this.height == "" || this.height == null ) 
                this.domNode.style.height= window.innerHeight + 'px';
            else 
                this.domNode.style.height = this.height;
            
  
			var self = this;
            
            // initialize your network!
            this.network = new vis.Network( ( self.progressBar ? self.domNodeNetworkMap.childNodes[0] : self.domNodeNetworkMap ), data, options);

			
			this.network.setMxParam( self );
			this.network.on("click", self.neighbourhoodHighlight);
			this.network.on("doubleClick", self.executeMicroflow);
			
			
            if( this.progressBar ) {
    //          network.on("click",neighbourhoodHighlight);
                this.network.on("stabilizationProgress", function(params) {
                    var maxWidth = $('#border').width();
                    var minWidth = 20;
                    var widthFactor = params.iterations/params.total;
                    var width = Math.max(minWidth,maxWidth * widthFactor);

                    document.getElementById('bar').style.width = width + 'px';
                    document.getElementById('text').innerHTML = Math.round(widthFactor*100) + '%';
                });

                this.network.once("stabilizationIterationsDone", function() {

                    document.getElementById('text').innerHTML = '100%';
                    document.getElementById('bar').style.width = $('#border').width();
                    document.getElementById('loadingBar').style.opacity = 0;
                    // really clean the dom element
                    setTimeout(function () {
                    document.getElementById('loadingBar').style.display = 'none'
                    }, 500);
                });
            }
        },
		
        
        
        executeMicroflow: function(params) {
            var mxSelf = params.mxParam;
            
            //TODO configure a microflow, and execute here...
            
        },
        
        
        neighbourhoodHighlight: function(params) {
            var mxSelf = params.mxParam;
            // if something is selected:
            if (params.nodes.length > 0) {
              mxSelf.highlightActive = true;
              var i,j;
              var selectedNode = params.nodes[0];
              var degrees = 2;

              // mark all nodes as hard to read.
              for (var nodeId in mxSelf.allNodes) {
                if (mxSelf.allNodes[nodeId].oriColor == null ) 
                    mxSelf.allNodes[nodeId].oriColor = mxSelf.allNodes[nodeId].color;
                
                mxSelf.allNodes[nodeId].color = 'rgba(200,200,200,0.5)';
                if (mxSelf.allNodes[nodeId].hiddenLabel == null) {
                  mxSelf.allNodes[nodeId].hiddenLabel = mxSelf.allNodes[nodeId].label;
                  mxSelf.allNodes[nodeId].label = null;
                }
              }
              var connectedNodes = mxSelf.network.getConnectedNodes(selectedNode);
              var allConnectedNodes = [];

              // get the second degree nodes
              for (i = 1; i < degrees; i++) {
                for (j = 0; j < connectedNodes.length; j++) {
                  allConnectedNodes = allConnectedNodes.concat(mxSelf.network.getConnectedNodes(connectedNodes[j]));
                }
              }

              // all second degree nodes get a different color and their label back
              for (i = 0; i < allConnectedNodes.length; i++) {
                if (mxSelf.allNodes[allConnectedNodes[i]].oriColor === null ) 
                    mxSelf.allNodes[allConnectedNodes[i]].oriColor = mxSelf.allNodes[allConnectedNodes[i]].color;
                  
                mxSelf.allNodes[allConnectedNodes[i]].color = 'rgba(150,150,150,0.75)';
                if (mxSelf.allNodes[allConnectedNodes[i]].hiddenLabel !== null) {
                  mxSelf.allNodes[allConnectedNodes[i]].label = mxSelf.allNodes[allConnectedNodes[i]].hiddenLabel;
                  mxSelf.allNodes[allConnectedNodes[i]].hiddenLabel = null;
                }
              }

              // all first degree nodes get their own color and their label back
              for (i = 0; i < connectedNodes.length; i++) {
                mxSelf.allNodes[connectedNodes[i]].color = mxSelf.allNodes[connectedNodes[i]].oriColor;
                
                if (mxSelf.allNodes[connectedNodes[i]].hiddenLabel !== null) {
                  mxSelf.allNodes[connectedNodes[i]].label = mxSelf.allNodes[connectedNodes[i]].hiddenLabel;
                  mxSelf.allNodes[connectedNodes[i]].hiddenLabel = null;
                }
              }

              // the main node gets its own color and its label back.
              mxSelf.allNodes[selectedNode].color = mxSelf.allNodes[selectedNode].oriColor;
              if (mxSelf.allNodes[selectedNode].hiddenLabel !== null) {
                mxSelf.allNodes[selectedNode].label = mxSelf.allNodes[selectedNode].hiddenLabel;
                mxSelf.allNodes[selectedNode].hiddenLabel = null;
              }
            }
            else if (mxSelf.highlightActive === true) {
              // reset all nodes
              for (var nodeId in mxSelf.allNodes) {
                mxSelf.allNodes[nodeId].color = mxSelf.allNodes[nodeId].oriColor;
                if (mxSelf.allNodes[nodeId].hiddenLabel !== null) {
                  mxSelf.allNodes[nodeId].label = mxSelf.allNodes[nodeId].hiddenLabel;
                  mxSelf.allNodes[nodeId].hiddenLabel = null;
                }
              }
              mxSelf.highlightActive = false
            }

            // transform the object into an array
            var updateArray = [];
            for (nodeId in mxSelf.allNodes) {
              if (mxSelf.allNodes.hasOwnProperty(nodeId)) {
                updateArray.push(mxSelf.allNodes[nodeId]);
              }
            }
            mxSelf.nodes.update(updateArray);
        },
		        
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
                        this.update();
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