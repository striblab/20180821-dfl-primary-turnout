import {select, selectAll, event} from 'd3-selection';
import {geoPath} from 'd3-geo';
import {format} from 'd3-format';
import * as topojson from "topojson";
import {annotation, annotationLabel,annotationCalloutCircle} from "d3-svg-annotation";
import map from '../sources/mn-precincts-basemap.json';
import data_raw from '../sources/mn-turnout-by-party-2018.json';

var annotation_data = [
  {
    type: annotationLabel,
    note: {
        label: "Duluth anchors the Eighth Congressional District, one of several districts where a competitive primary may have helped drive high Democratic turnout.",
        wrap: 170,
        lineType:'none',
        align: 'left'
    },
    color: "black",
    y: 435,
    x: 430,
    dy: 15,
    dx: 15
  },
  {
    type: annotationCalloutCircle,
    note: {
        label: "The DFL saw its turnout advantage extend to many rural precincts in western Minnesota, including several in Kittson County.",
        wrap: 130,
        lineType:'none',
        align: 'middle'
    },
    color: "black",
    //settings for the subject, in this case the circle radius
    subject: {
      radius: 20
    },
    y: 195,
    x: 40,
    dy: -35,
    dx: 30
  },
  {
    type: annotationCalloutCircle,
    note: {
        label: "DFL voters turned out at higher rates than Republicans throughout a ring of suburban precincts, including these in Dakota County, many of which voted for Donald Trump in 2016.",
        wrap: 150,
        lineType:'vertical'
    },
    color: "black",
    //settings for the subject, in this case the circle radius
    subject: {
      radius: 10
    },
    y: 670,
    x: 360,
    dy: -10,
    dx: 50
  },]

class StribPrecinctMap {

  constructor(target) {
    this.target = target;
    this.svg = select(this.target);
    this.path = geoPath();
    this.m = map;
  }
  
  _renderState() {
    var self = this;
      
    self.svg.append("g")
      .selectAll("path")
      .data(topojson.feature(map, this.m.objects.state).features)
      .enter().append("path")
        .attr("d", self.path)
        .attr("class", "map-state-boundary");    
  }

  _renderCounties() {
    var self = this;
      
    self.svg.append("g")
      .selectAll("path")
      .data(topojson.feature(map, this.m.objects.counties).features)
      .enter().append("path")
        .attr("d", self.path)
        .attr("class", "map-county-boundary");
  }
  
  _renderCities(tiers) {
    var self = this;
    
    self.svg.append("g")
      .selectAll("circle")
        .data(topojson.feature(map, this.m.objects.cities).features.filter(
          d => tiers.includes(d.properties.TIER)
        ))
        .enter().append("circle")
          .attr("cx", function (d) {
            return d.geometry.coordinates[0];
          })
          .attr("cy", function (d) {
            return d.geometry.coordinates[1];
          })
          .attr("r", function (d) {
            if (d.properties.TIER == 1) {
              return '5px';
            } else if (d.properties.TIER == 2) {
              return '3px';
            } else {
              return '2px';
            }
          })
          .attr("class", function (d) {
            var tier = d.properties.TIER;
            if (tier == 1) {
              return 'map-city-point-large';
            } else if (tier == 2) {
              return 'map-city-point-medium';
            } else if (tier == 3 || tier == 4) {
              return 'map-city-point-small';
            }
          });

    this.svg.append("g")
      .selectAll("text")
      .data(topojson.feature(map, this.m.objects.cities).features.filter(
        d => tiers.includes(d.properties.TIER)
      ))
      .enter().append("text")
        .attr("dx", function (d) {
          return d.geometry.coordinates[0] + parseInt(d.properties.DX);
        })
        .attr("dy", function (d) {
          return d.geometry.coordinates[1] + parseInt(d.properties.DY);
        })
        .text(function (d) { return d.properties.NAME; })
        .attr('text-anchor', function (d) {
          return d.properties.ANCHOR;
        })
        .attr("class", function (d) {
          var tier = d.properties.TIER;
          if (tier == 1) {
            return 'map-city-label-large';
          } else if (tier == 2) {
            return 'map-city-label-medium';
          } else if (tier == 3 || tier == 4) {
            return 'map-city-label-small';
          }
        });
  }
  
  _renderPrecincts() {
    var self = this;

    const SQMI_CONST = 0.00000038610;
    const data = new Map(data_raw.map(d => [d.id, 
          {'majority': d.majority,
           'total': d.total,
           'd': d.d,
           'r': d.r,
           'winner2016': d.winner2016}]));
  
    this.svg.append("g")
      .selectAll("path")
      .data(topojson.feature(map, map.objects.precincts).features)
      .enter().append("path")
        .attr("d", self.path)
        .attr("class", function(d) {
          var c = "map-precinct-boundary"
          var lookup = data.get(format("06")(d.properties.COUNTYCODE + d.properties.PCTCODE));
     
          // Calculate more R, D, or about even
          var pctdiff = ((lookup.d - lookup.r) / lookup.r) * 100;
     
          // Color red or blue
          if (pctdiff < 5 && pctdiff > -5) {
            c += ' same2018';
          } else if (lookup.majority == 'd' ) {
            c += ' d2018';
          } else if (lookup.majority == 'r') {
            c += ' r2018';
          } else {
            c += ' all2018';
          }

          if (lookup.winner2016 == 'trump') {
            c += ' trump2016';
          } else if (lookup.winner2016 == 'clinton' ) {
            c += ' clinton2016';
          } else {
            c += ' all2016';
          }

          return c;
        })
        .attr("style", function(d) {
          var lookup = data.get(format("06")(d.properties.COUNTYCODE + d.properties.PCTCODE));
     
          // Do density calculations
          var voters = lookup.total;
          var area_sqmi = d.properties.Shape_Area * SQMI_CONST;
          var voters_sqmi = voters / area_sqmi ;
        
          // Opacity based on density
          if (voters_sqmi >= 500) {
            return 'fill-opacity: 1.0';
          } else if (voters_sqmi < 500  && voters_sqmi >= 100) {
            return 'fill-opacity: 0.75';
          } else if (voters_sqmi < 100 && voters_sqmi >= 25) {
            return 'fill-opacity: 0.5';
          } else if (voters_sqmi < 25 && voters_sqmi >= 10) {
            return 'fill-opacity: 0.25';
          } else {
            return 'fill-opacity: 0.1';
          }
        })
        .on("mouseover", function(d) {
          var lookup = data.get(format("06")(d.properties.COUNTYCODE + d.properties.PCTCODE));
                 
          // Set position
          select("#tooltip")
           .style("left", (event.pageX + 20) + "px")   
           .style("top", (event.pageY + -60) + "px");
     
          // Set text
          select('#tooltip').select(".winner2016").text('2016 winner: ' + lookup.winner2016.replace(/^\w/, c => c.toUpperCase()));
          select('#tooltip').select("#title").text(d.properties.PCTNAME);
          select('#tooltip').select("#votes-d").text(lookup.d.toLocaleString());
          select('#tooltip').select("#votes-r").text(lookup.r.toLocaleString());

          // Unhide
          select("#tooltip").classed("hidden", false);
        })          
        .on("mouseout", function(d) {
          // Hide
          select("#tooltip").classed("hidden", true);
        })
  }

  _renderRoads() {
    var self = this;
      
    self.svg.append("g")
      .selectAll("path")
      .data(topojson.feature(map, this.m.objects.roads).features)
      .enter().append("path")
        .attr("d", self.path)
        .attr("class",  function(d) {
          if (d.properties.RTTYP == 'I') {
            return "map-interstate-boundary";
          } else {
            return "map-road-boundary";
          }
        });
  } 

  _renderAnnotations() {
    const makeAnnotations = annotation()
      .type(annotationLabel)
      .annotations(annotation_data);

    this.svg.append("g")
      .attr("class", "annotation-group")
      .call(makeAnnotations);
  } 

  filter_map(state2018, state2016) {
      selectAll(".annotation-group")
        .style('display', 'none'); 

    // TRUMP
    if (state2018 == 'dfl' && state2016 == 'trump') {
      selectAll(".map-precinct-boundary")
        .classed('unfill', true);
      selectAll(".map-precinct-boundary.trump2016.d2018")
        .classed('unfill', false);
    } else if (state2018 == 'gop' && state2016 == 'trump') {
      selectAll(".map-precinct-boundary")
        .classed('unfill', true);
      selectAll(".map-precinct-boundary.trump2016.r2018")
        .classed('unfill', false);
    } else if (state2018 == 'all2018' && state2016 == 'trump') {
      selectAll(".map-precinct-boundary")
        .classed('unfill', true);
      selectAll(".map-precinct-boundary.trump2016")
        .classed('unfill', false);

    // CLINTON
    } else if (state2018 == 'dfl' && state2016 == 'clinton') {
      selectAll(".map-precinct-boundary")
        .classed('unfill', true);
      selectAll(".map-precinct-boundary.clinton2016.d2018")
        .classed('unfill', false);
    } else if (state2018 == 'gop' && state2016 == 'clinton') {
      selectAll(".map-precinct-boundary")
        .classed('unfill', true);
      selectAll(".map-precinct-boundary.clinton2016.r2018")
        .classed('unfill', false);
    } else if (state2018 == 'all2018' && state2016 == 'clinton') {
      selectAll(".map-precinct-boundary")
        .classed('unfill', true);
      selectAll(".map-precinct-boundary.clinton2016")
        .classed('unfill', false);

    // ALL 2016
    } else if (state2018 == 'dfl' && state2016 == 'all2016') {
      selectAll(".map-precinct-boundary")
        .classed('unfill', true);
      selectAll(".map-precinct-boundary.d2018")
        .classed('unfill', false);
    } else if (state2018 == 'gop' && state2016 == 'all2016') {
      selectAll(".map-precinct-boundary")
        .classed('unfill', true);
      selectAll(".map-precinct-boundary.r2018")
        .classed('unfill', false);

    // ALL 2018
    } else if (state2018 == 'all2018' && state2016 == 'trump') {
      selectAll(".map-precinct-boundary")
        .classed('unfill', true);
      selectAll(".map-precinct-boundary.trump2016")
        .classed('unfill', false);
    } else if (state2018 == 'all2018' && state2016 == 'clinton') {
      selectAll(".map-precinct-boundary")
        .classed('unfill', true);
      selectAll(".map-precinct-boundary.clinton2016")
        .classed('unfill', false);

    // ALL
    } else {
      selectAll(".annotation-group")
        .style('display', 'initial');  

      selectAll(".map-precinct-boundary")
        .classed('unfill', false);      
    }
  }

  render(cities=[1, 2, 3, 4]) {
    var self = this;
          
    self._renderState();
    self._renderPrecincts();
    self._renderCounties();
    self._renderRoads();
    self._renderCities(cities);
    self._renderAnnotations();
  }
}

export { StribPrecinctMap as default }