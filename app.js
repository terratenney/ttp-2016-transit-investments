function makeMap() {

	var skobblerUrl1 = 'http://tiles{s}-73ef414d6fe7d2b466d3d6cb0a1eb744.skobblermaps.com/TileService/tiles/2.0/01021111200/0/{z}/{x}/{y}.png20';
	var streets = L.tileLayer(skobblerUrl1, {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
		detectRetina:true,
		maxZoom: 19,
		maxNativeZoom: 18,
		subdomains: '1234'
	});

	var buildings = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
		detectRetina:true,
		maxZoom: 20,
		maxNativeZoom: 19
	});
	

	var satellite = L.tileLayer('https://api.tiles.mapbox.com/v4/mapbox.streets-satellite/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoic3RldmV2YW5jZSIsImEiOiJqRVdYSnFjIn0.cmW3_zqwZpvcwPYc_C2SPQ', {
		attribution: '<a href="http://mapbox.com">Mapbox</a>',
		detectRetina:false,
		maxZoom: 20,
		maxNativeZoom: 19
	});
	
	

	// initialize the map on the "map" div with a given center and zoom
	map = L.map('map', {
	    center: [41.89, -87.62],
	    zoom: 10,
	    maxZoom: 18,
	    zoomControl: false // turning off the auto location of the zoom control (to the right)
	});
	icons = createIcons();
	
	bounds = map.getBounds();
	
	// putting the zoom to the right
	L.control.zoom({
	     position:'topright'
	}).addTo(map);
	
	// Make some empty layers that will be filled later
	geojsonLayers = [];
	layerGroups = ["lines", "stations"];
	layerGroups["lines"] = new L.featureGroup();
	layerGroups["stations"] = new L.featureGroup();
//	stations_future = new L.featureGroup();
//	stations_existing = new L.MarkerClusterGroup();

	// Add those layers to the map (even though they're empty)
	layerGroups["lines"].addTo(map);
	layerGroups["stations"].addTo(map);
//	stations_future.addTo(map);
//	stations_existing.addTo(map);
	


	// Add a search box
	searchCtrl = L.control.fuseSearch({
		threshold: 0.3,
		maxResultLength: 10,
		showInvisibleFeatures: true,
		placeholder: "Search names and regions",
		showResultFct: function(feature, container) {
	        props = feature.properties;
	        var name = L.DomUtil.create('b', null, container);
	        name.innerHTML = props.name || props.Name;
	        
	        var region = props.region || props.Region;
	        container.appendChild(L.DomUtil.create('br', null, container));
	        container.appendChild(document.createTextNode(region));
	    }
	});
	searchCtrl.addTo(map);
	
	var otherLayers = {};
	
	// add the base layer maps
	var baseMaps = {"Streets": streets, "Buildings": buildings, "Satellite": satellite};
	streets.addTo(map); // load streets by default
	
	// create a layer switcher
	control = L.control.layers(baseMaps, otherLayers, {collapsed: false, autoZIndex: true}).addTo(map);
	
	// Adjust the map size
	resizeMap();
	$(window).on("resize", resizeMap);
	
	
}

function processLayers(layers) {
	count = layers.length;
	iteration = 0;
	$.each(layers, function(i, v) {
		addGeoJsonLayer(v.file, v.layerId, v.name, v.type, v.status, v.zoomRange);
		iteration++;
		
		// Do something when we're done processing the layers
		if(iteration == count) {
			setTimeout(function() {
				searchCtrl.initiateFuse(["name", "Name", "Mode1", "Region", "Mode"]);
				map.fire("zoomend"); // fire a zoomend so the layers that need to turn on depending on the zoom level will be toggled
			}, 100); // this won't work unless there's a short delay
			
		} else {
			// do something in the mean time?
		}
	});
}

function selectKeyCity() {
	var html = "<p>Zoom to a region";
	select = "<select id='key_city_select' onchange=\"zoomToCity('key_city_select');\"><option>Choose a region</option>";
	
	$.each(cities, function(i, v) {
		select += "<option data-latitude='" + v.lat + "' data-longitude='" + v.lng + "'>" + v.name + "</option>";
	});
	
	select += "</select>";
	html += select + "</p>";
	
	$("#key_city").html(html);
}

function zoomToCity(id) {
	lat = $('#' + id).find(':selected').data('latitude');
	lng = $('#' + id).find(':selected').data('longitude');
	map.setView([lat, lng], 11);
}

function zoomHere(lat, lng, zoom) {
	map.setView([lat, lng], zoom);
}

function addGeoJsonLayer(file, layerId, name, type, status, zoomRange) {
	
	/*
	* A generic function that simply adds our GeoJSON file to the map
	* and fits the map bounds (the viewport) to the extents of the GeoJSON features (zooms in or out
	* to show all the features);
	* parameter:zoomRange is an array [13,99] that tells the highest and lowest zoom levels this layer can be shown at
	*/
		
	console.log("adding GeoJSON file '" + file + "' with layerId '" + layerId + "'");
	$.getJSON(file, function() {
		//console.log( "success" );
	})
	.done(function(data) {
		geojsonLayers[layerId] = L.geoJson(data, {
			onEachFeature: function(feature, layer) { onEachFeature(feature, layer, type, status) },
			zoomRange: zoomRange,
			type: type,
			status: status,
			layerId: layerId
		});
		//geojsonDatas.push(data);
		layerBounds = geojsonLayers[layerId].getBounds();
		bounds.extend(layerBounds);
		
		// Index the features for searching
		if(status != "existing") {
			searchCtrl.indexFeaturesMultipleLayers(data.features, ['Name', 'name', 'region', 'Mode1', 'Region', 'Mode']);
		}
		
		// Only show this layer at certain zoom levels
		if(zoomRange != undefined) {
			map.on("zoomend", function() {
				toggleLayer();
			});
		} else {
			console.log("Layer doesn't have zoomRange, so we're adding a layerId '" + layerId + "' of type '" + type + "' now");
			layerGroups[type].addLayer(geojsonLayers[layerId]);
		}
		
		// Add the layer to our layer switcher
		//count = data.features.length;
		//control.addOverlay(geojsonLayers[layerId], name + " (" + count + ")");
	})
	.fail(function() {
		alert("Couldn't load your GeoJSON file; Is it where you said it is?")
	})
	.always(function() {

	});
}

function toggleLayer() {
	// Check to see if we're within range
	zoom = map.getZoom();
	//console.log("toggleLayer fired at zoom " + zoom);
	$.each(layers, function(i, v) {
		if(v.zoomRange != undefined) {
			//console.log(v);
			var max = Math.max.apply(Math, v.zoomRange);
			var min = Math.min.apply(Math, v.zoomRange);
			
			if(zoom >= min && zoom <= max) {
				// current zoom is within the range
				//console.log("toggleLayer trying to add " +v.layerId + " of type " + v.type);
				if(layerGroups[v.type] != undefined) {
					layerGroups[v.type].addLayer(geojsonLayers[v.layerId]);
				}
			} else {
				if(layerGroups[v.type] != undefined && layerGroups[v.type].hasLayer(geojsonLayers[v.layerId])) {
					layerGroups[v.type].removeLayer(geojsonLayers[v.layerId]);
				}
			}
		}
	});
}

function resizeMap() {
	
	/*
	* Resizes the map to fit the full height
	* It should be paired with a window.resize event so that it'll be resized
	* anytime the user resizes the window
	*/
	
	console.log("Window has been resized so let's resize the map to match");
	
	setTimeout(function() {
		height = $("body").outerHeight();
		$("#map").height( height );
		map.invalidateSize();
		
		return height;
	}, 100); // I don't know why we have to wait 100 ms before we can get the new height
	
}

function createIcons() {
	icons = [];
	icons["stations_existing"] = L.AwesomeMarkers.icon({
		icon: 'subway',
		prefix: 'fa',
		markerColor: 'lightblue'
		// existing station
	});
	
	icons["stations"] = L.AwesomeMarkers.icon({
		icon: 'subway',
		prefix: 'fa',
		markerColor: 'red'
		// non-existing station
	});

	return icons;
}

function onEachFeature(feature, layer, type, status) {
	
	/*
	* This function will be called for each feature in your GeoJSON file
	* and this is where you should customize whether there should be a popup on features
	* and how features should be styled
	*/
	
	if(feature.properties) {
		
		p = feature.properties;
		
		// Set popup content
		content = "<p class='feature-heading'>" + p.Name + "</p>";
		content += "<p class='feature-text'>" + showFeatureProperties(p) + "</p>";
		
		lat = feature.geometry.coordinates[1];
		lng = feature.geometry.coordinates[0];
		content += "<button onclick=\"zoomHere(" + lat + "," + lng + ",14);\">Zoom in</button>";
		
		// Set popup options
		popupOptions = {maxWidth: 280, minWidth: 150}
		popup = L.popup(popupOptions, layer);
		popup.setContent(content);
		layer.bindPopup(popup);
		
		// Add the layer objecet to the feature itself so the Fuse search can deal with it
		feature.layer = layer;
		
		// Change the icons for stations
		if(type == "stations" || type == "stations_existing") {
			layer.setIcon(icons[type]);
		}
		
		// Change the styling for lines
		if(type == "lines") {
			// set some default styles for lines
			var style = {};
			style.weight = 6;
			style.lineCap = 'round';
			
			mode = p.Mode || p.Mode1;
			switch(mode) {
				case "Bus Rapid Transit":
				case "BRT":
					style.color = "#b2182b";
				break;
				
				default:
					style.color = "#2166ac";
				break;	
			}
			
			switch(status) {
				case "funded":
				case "new_starts":
						style.dashArray = [1, 9];
						style.weight = 7;
						break;
		
				case "planned":
						style.dashArray = [2,10];
						break;
				
				case "renovating":
						style.weight = 4;
						style.color = "#88B4E0";
						break;
				
				case "future":
						style.weight = 4;
						style.dashArray = [5,8,1,8];
						style.lineCap = 'square';
						break;
								
				case "existing":
						style.weight = 2.5;
						style.lineCap = 'round';
						style.color = "#494949";
						
						switch(mode) {
							case "Commuter Rail":
							case "Streetcar":
							style.color = "#8E8E8E";
							style.weight = 2;
							style.dashArray = [1,2];
							style.lineCap = 'round';
							break;
							}
						
						break;
								
				case "under_construction":
				
				break;
			}
			layer.setStyle(style);
		}
    }
}

function showFeatureProperties(properties) {
	// Don't show these properties ever:
	var noshow = ["Name", "Routes", "timestamp", "begin", "end", "altitudeMode", "tessellate", "extrude", "visibility", "drawOrder", "icon", "description"];
	
	html = "<dl class=''>"; // use <dl> for a simple data list
	
	// Iterate through each of the features and craft together a popup
	$.each(properties, function(i,v) {
		if(!in_array(i, noshow) && v != undefined && v != "") {
			
			// Display certain properties differently
			switch(i) {
				
			/*	case "Name":
				case "Routes":
					i = "";
					v = "";
				break; */
			
				case "Cost_USD":
				case "Estimated_Cost":
				case "Estimated_":
					i = "<b>Estimated cost (USD)</b>: ";
					v = "$" + number_format(v); // display a number with thousands separators
				break;
				
				case "Cost_per_Mi_":
				case "Cost_per_M":
					i = "<b>Cost per mile</b>: ";
					v = "$" + number_format(v); // display a number with thousands separators
				break;
				
				case "Expected_Daily_Ridership":
				case "Expected_D":
					i = "<b>Estimated weekday riders</b>: ";
					v = number_format(v); // display a number with thousands separators
				break;
				
				case "Project_Website":
				case "Website":
				case "Project_We":
				case "Web":
					i = "";
					v = "<a href='" + v + "' target='_blank'>Project website</a>";
				break;
				
				case "Project_status":
				case "Project_st":
					i = "<b>Status</b>: ";
				break;
				
				case "Travel_Time_Min_":
				case "Travel_Tim":
					i = "<b>Travel time</b>: ";
					v = v + " min.";
				break;
				
				case "Federal_funding_status":
					i = "<b>Federal status</b>: ";
				break;
				
				case "Mode":
				case "Mode1":
					i = "<b>Type</b>: ";
				break;
				
				case "Avg__Speed":
					i = "<b>Average speed</b>: ";
					v = v + " mph";
				break;
				
				
				case "Construction_Start":
				case "Constructi":
				case "Construct":
					i = "<b>Construction</b>: ";
				break;
				
				case "Completion_Date":
					i = "<b>Completion date</b>: ";
				break;
				
				case "Direct_Federal_Support":
					i = "<b>Direct federal support</b>: ";
				break;
				
				case "Direct_Fed_Share":
				case "Direct_Fed":
				case "Direct_F_1":
								case "Direct_Fed__Share":
					i = "<b>Direct federal funding share</b>: ";
				break;
				
				case "Miles":
				case "Mi_":
					i = "<b>Length</b>: ";
					v = v + " mi."
				break;
				
				default:
					i = "<b>" + i + "</b>: ";
					v = v;
				break;
			}

			html += "<br />" + i + "" + v + "";
		}
	});
	
	html += "</dl>";
	
	return html;
	
}