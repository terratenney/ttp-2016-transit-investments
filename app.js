function makeMap() {

	var skobblerUrl1 = 'http://tiles{s}-73ef414d6fe7d2b466d3d6cb0a1eb744.skobblermaps.com/TileService/tiles/2.0/01021111200/0/{z}/{x}/{y}.png20';
	var streets = L.tileLayer(skobblerUrl1, {
		attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
		detectRetina:true,
		maxZoom: 19,
		maxNativeZoom: 18,
		subdomains: '1234'
	});
	
	
	var cities = {
    "losangeles": {
        "lat": 34,
       "lng": -118
    },
    "seattle": {
        "lat": 47.6,
       "lng": -122.3
    },
     "sanfrancisco": {
        "lat": 37.6,
       "lng": -122.2
    },
     "denver": {
        "lat": 39.8,
       "lng": -105
    },
     "toronto": {
        "lat": 43.7,
       "lng": -79.4
    },
     "newyork": {
        "lat": 40.7,
       "lng": -74
    },
     "mexico": {
        "lat": 19.4,
       "lng": -99.1
    },
};
	
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
	lines = new L.featureGroup();
	stations = new L.featureGroup();
//	stations_future = new L.featureGroup();
//	stations_existing = new L.MarkerClusterGroup();
	lines.addTo(map);
	stations.addTo(map);
//	stations_future.addTo(map);
//	stations_existing.addTo(map);
	
	geojsonLayers = [];

	// Add a search control
/*
	var search_options = {
		layer: layer, 
		initial: false, 
		position:'bottomleft', 
		propertyLoc: features.geometry.coordinates
	}
	var controlSearch = new L.Control.Search(search_options);
	map.addControl( controlSearch );
*/
	
	var otherLayers = {};
	
	// add the base layer maps
	var baseMaps = {"Streets": streets, "Building Names": buildings, "Satellite": satellite};
	streets.addTo(map); // load streets by default
	
	// create a layer switcher
	control = L.control.layers(baseMaps, otherLayers, {collapsed: false, autoZIndex: true}).addTo(map);
	
	// Adjust the map size
	resizeMap();
	$(window).on("resize", resizeMap);
}

function processLayers(layers) {
	$.each(layers, function(i, v) {
		addGeoJsonLayer(v.file, v.layerId, v.name, v.type, v.status, v.zoomRange);
	});
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
		
		//data = data;		
		
		geojsonLayers[layerId] = L.geoJson(data, {
			onEachFeature: function(feature, layer) { onEachFeature(feature, layer, type, status) }
		});
		layerBounds = geojsonLayers[layerId].getBounds();
		bounds.extend(layerBounds);
		//map.fitBounds(bounds);
		
		count = data.features.length;
		
		// Add the data to our GeoJSON layer
		//geojsonLayers[layerId].addData(data);
		
		// Only show this layer at certain zoom levels
		if(zoomRange != undefined) {
			//console.log(layerId + " has a zoomRange of " + zoomRange);
			map.on("zoomend", function() {
				toggleLayer(layerId, type, zoomRange);
			});
		} else {
			switch(type) {
				case "lines":
					lines.addLayer(geojsonLayers[layerId]);
				break;
				
				case "stations":
					stations.addLayer(geojsonLayers[layerId]);
				break;
				
			/*	case "stations_future":
					stations_future.addLayer(geojsonLayers[layerId]);
				break;
				
				case "stations_existing":
					stations_existing.addLayer(geojsonLayers[layerId]);
				break; */
			}
		}
		
		// Add the layer to our layer switcher
		//control.addOverlay(geojsonLayers[layerId], name + " (" + count + ")");
	})
	.fail(function() {
		alert("Couldn't load your GeoJSON file; Is it where you said it is?")
	})
	.always(function() {

	});
	
}

function toggleLayer(layerId, type, zoomRange) {

	var max = Math.max.apply(Math, zoomRange);
	var min = Math.min.apply(Math, zoomRange);
	
	// Check to see if we're within range
	zoom = map.getZoom();
	//console.log("Current zoom: " + zoom + "; min: " + min + "; max: " + max);
	if(zoom >= min && zoom <= max) {
		//console.log("Adding layer " + layerId);
		switch(type) {
			case "lines":
				lines.addLayer(geojsonLayers[layerId]);
			break;
			
			case "stations":
				stations.addLayer(geojsonLayers[layerId]);
			break;
			
		/*	case "stations_future":
				stations_future.addLayer(geojsonLayers[layerId]);
			break;
			
			case "stations_existing":
				stations_existing.addLayer(geojsonLayers[layerId]);
			break; */
		}
	} else {
		//console.log("Removing layer " + layerId);
		switch(type) {
			case "lines":
				lines.removeLayer(geojsonLayers[layerId]);
			break;
			
			case "stations":
				stations.removeLayer(geojsonLayers[layerId]);
			break;
			
		/*	case "stations_future":
				stations_future.removeLayer(geojsonLayers[layerId]);
			break;
			
			case "stations_existing":
				stations_existing.removeLayer(geojsonLayers[layerId]);
			break; */
		}
	}
}

function resizeMap() {
	
	/*
	* Resizes the map to fit the full height
	* It should be paired with a window.resize event so that it'll be resized
	* anytime the user resizes the window
	*/
	
	//console.log("Window has been resized so let's resize the map to match");
	
	height = $("body").outerHeight();
	$("#map").height( height );
	map.invalidateSize();
	
	return height;
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
	
/*	icons["stations_future"] = L.AwesomeMarkers.icon({
		icon: 'stop-circle-o',
		prefix: 'fa',
		markerColor: 'red'
		// future station
	});
 */	
	return icons;
}

function onEachFeature(feature, layer, type, status) {
	
	/*
	* This function will be called for each feature in your GeoJSON file
	* and this is where you should customize whether there should be a popup on features
	* and how features should be styled
	*/
	
	var style = {};
	if(feature.properties) {
		
		p = feature.properties;
		//console.log(p);
		
		//link = "<a href='" + p.Website + "'>Website</a>";
		link = "";
		content = "<b><font color=ff0000 size=3 face='Open Sans', sans-serif>" + p.Name + "</font></b>";
		content += "<font size=2 face='Open Sans', sans-serif>" + showFeatureProperties(p) + "</font>";
		popupOptions = {minWidth: 180}
		popupOptions = {maxWidth: 220}
		popup = L.popup(popupOptions, layer);
		popup.setContent(content);
		layer.bindPopup(popup);
		
		if(type == "stations" || type == "stations_existing") {
			layer.setIcon(icons[type]);
		}
		
		if(type == "lines") {
			style.weight = 6;
			style.lineCap = 'round';
			
			switch(p.Mode) {
				case "Bus Rapid Transit":
					style.color = "#b2182b";
				break;
				
				default:
					style.color = "#2166ac";
				break;	
			}
			
			switch(p.Mode1) {
				case "Bus Rapid Transit":
					style.color = "#b2182b";
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
						style.color = "#4F4F4F";
						break;
								
				case "under_construction":
				
				break;
			}
			
			

	/*
			switch(layerId) {
				case "projects_funded_lines":
					style = {
						weight: 10,
						color: "#000",
						opacity: 0.3,
					}
				break;
				
				case "Y":
				
				break;
			}
	*/
	
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