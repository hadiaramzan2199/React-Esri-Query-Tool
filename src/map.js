//***************************************** IMPORTS *******************************************
import React, { useEffect, useRef, useState } from 'react';
import { loadModules } from 'esri-loader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes, faLayerGroup, faInfoCircle } from '@fortawesome/free-solid-svg-icons';

const Map = () => {
  //***************************************** USE REFS *******************************************
  const mapRef = useRef(null);
  const viewRef = useRef(null);
  const legendRef = useRef(null);
  const highlightGraphicsLayerRef = useRef(null);
  //***************************************** USE STATES *******************************************
  const [mapLoaded, setMapLoaded] = useState(false);
  const [layerVisibility, setLayerVisibility] = useState({zoneLayerVisible: true, metroLayerVisible: true, layer0Visible: true, layer2Visible: true,});
  const [zoneLayer, setZoneLayer] = useState(null);
  const [metroLayer, setMetroLayer] = useState(null);
  const [layer0, setLayer0] = useState(null);
  const [layer2, setLayer2] = useState(null);
  const [queryConditions, setQueryConditions] = useState({siteName: '', sectionName: '', zoneName: ''});
  const [queryResults, setQueryResults] = useState({zoneData: [], siteData: [], sectionData: [],});
  const [menuOpen, setMenuOpen] = useState(false);
  const [zoneCheckboxChecked, setZoneCheckboxChecked] = useState(false);
  const [metroCheckboxChecked, setMetroCheckboxChecked] = useState(false);
  const [metroSitesCheckboxChecked, setMetroSitesCheckboxChecked] = useState(false);
  const [metroRoutesCheckboxChecked, setMetroRoutesCheckboxChecked] = useState(false);
  const [highlightGraphicsLayer] = useState(null);
  const [activeTab, setActiveTab] = useState('zone'); 
  const [currentPage, setCurrentPage] = useState(1); 
  const rowsPerPage = 5; 
  const [showAttributeTable, setShowAttributeTable] = useState(true);
  const [legend, setLegend] = useState(null);
  const zoneOptions = ["Central", "South", "North"];
  const siteOptions = ["Ghouri Town Phase.5A", "Askari-14 New", "IBA-II", "ISLAMABAD (IBA-I) Exchange", "Taxila", "Wah (Lala Rukh)", "CDDT Building H-09", "Jhelum Central", "Kala Dev", "Sangoi", "Chakwal", "Shadi Khan", "Murree", "ISLAMABAD F-8 Exchange", "RAWALPINDI(IBA-II) Exchange", "Westridge Exchange", "I-10 Exchange", "Rawalpindi Cantt", "Rawalpindi City", "F-11 Exchange", "F-7 Exchange"];
  const sectionOptions = ["F-11 to F-8", "I-I0 to CDDT", "IBA-1 - F8", "IBA-1 - Zeropoint", "Humak - Bahria", "Sihala - Chaklala", "Bahria - Chaklala", "IBA-II - CHAKLALA", "Rawalpindi City-Chaklala", "Rawalpindi Cantt-DHA", "I-10 - Khyaban-e-sir syed", "Chaklala-Gulraiz", "Gulraiz-Bahria Town", "Korang-Bahria Town", "Korang-Lohi Bheer", "Sawan Garden-Korang", "Shaheenabad-Tarlai", "Westridge-Tarnol", "Shaheen - IBA II", "Westrige - Rawalpindi Cantt"];
  

  //***************************************** BASE MAP VIEW & LOADING FEATURE LAYERS *******************************************
  useEffect(() => {
    loadModules(['esri/WebMap', 'esri/views/MapView', 'esri/layers/FeatureLayer']).then(([WebMap, MapView, FeatureLayer]) => {
      const map = new WebMap({
        basemap: 'osm',
      });

      viewRef.current = new MapView({
        container: mapRef.current,
        map: map,
        center: [69, 30.5],
        zoom: 6,
      });

      loadLayers(map, FeatureLayer);

      setMapLoaded(true);

      return () => {
        if (viewRef.current) {
          viewRef.current.container = null;
        }
        if (zoneLayer && metroLayer) {
          map.removeMany([zoneLayer, metroLayer]);
        }
        if (highlightGraphicsLayer) {
          map.remove(highlightGraphicsLayer);
        }
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //***************************************** LEGEND *******************************************
  useEffect(() => {
    if (mapLoaded && viewRef.current) {
      loadModules(['esri/widgets/Legend']).then(([Legend]) => {
        const legendWidget = new Legend({
          view: viewRef.current,
        });
        setLegend(legendWidget);
      });
    }
  }, [mapLoaded]);

  //***************************************** CHANGING THE LAYER VISIBILITIES + LEGEND *******************************************
  useEffect(() => {
    if (legend) {
      const layersToUpdate = [];

      if (zoneLayer) {
        zoneLayer.visible = layerVisibility.zoneLayerVisible;
        layersToUpdate.push(zoneLayer);
      }

      if (metroLayer) {
        metroLayer.visible = layerVisibility.metroLayerVisible;
        layersToUpdate.push(metroLayer);
      }

      if (layer0) {
        layer0.visible = layerVisibility.layer0Visible && layerVisibility.metroLayerVisible;
        layersToUpdate.push(layer0);
      }

      if (layer2) {
        layer2.visible = layerVisibility.layer2Visible && layerVisibility.metroLayerVisible;
        layersToUpdate.push(layer2);
      }

      if (layersToUpdate.length > 0) {
        legend.layerInfos = layersToUpdate.map((layer) => ({
          layer,
          title: layer.title,
        }));
      }
    }
  }, [legend, layerVisibility, zoneLayer, metroLayer, layer0, layer2]);

  //***************************************** ADDING LEGEND RED TO LEGEND CONTAINER *******************************************
  useEffect(() => {
    if (legend && legendRef.current) {
      legend.container = legendRef.current;
    }
  }, [legend]);

  //***************************************** AUTOMATICALLY CHECK THE CHILD LAYERS *******************************************
  useEffect(() => {
    if (metroCheckboxChecked) {
      setMetroSitesCheckboxChecked(true);
      setMetroRoutesCheckboxChecked(true);
    } else {
      setMetroSitesCheckboxChecked(false);
      setMetroRoutesCheckboxChecked(false);
    }
  }, [metroCheckboxChecked]);

  //***************************************** CLEAN UP highlightGraphicsLayer WHEN COMPONENTS UNMOUNT ****************
  useEffect(() => {
    return () => {
      if (highlightGraphicsLayerRef.current) {
        highlightGraphicsLayerRef.current.removeAll();
        viewRef.current.map.remove(highlightGraphicsLayerRef.current);
      }
    };
  }, []);

  //***************************************** CREATING FEATURE LAYERS *******************************************
  const loadLayers = (map, FeatureLayer) => {
    const zoneLayer = new FeatureLayer({
      url: 'https://gisportal.ptcl.net.pk/arcgis/rest/services/PTCL/Zone/MapServer',
      visible: layerVisibility.zoneLayerVisible,
    });

    const metroLayer = new FeatureLayer({
      url: 'https://gisportal.ptcl.net.pk/arcgis/rest/services/PTCL/IT_Metro_Fiber_Cut/MapServer',
      visible: layerVisibility.metroLayerVisible,
    });

    const layer0 = new FeatureLayer({
      url: 'https://gisportal.ptcl.net.pk/arcgis/rest/services/PTCL/IT_Metro_Fiber_Cut/MapServer/0',
      visible: layerVisibility.layer0Visible && layerVisibility.metroLayerVisible,
      relationshipId: 0, // Set the relationshipId to 0 for layer0
      parent: metroLayer,
    });

    const layer2 = new FeatureLayer({
      url: 'https://gisportal.ptcl.net.pk/arcgis/rest/services/PTCL/IT_Metro_Fiber_Cut/MapServer/2',
      visible: layerVisibility.layer2Visible && layerVisibility.metroLayerVisible,
      relationshipId: 0, // Set the relationshipId to 0 for layer2
      parent: metroLayer,
    });

    map.addMany([zoneLayer, metroLayer, layer0, layer2]);
    setZoneLayer(zoneLayer);
    setMetroLayer(metroLayer);
    setLayer0(layer0);
    setLayer2(layer2);
  };

  //***************************************** LAYERS TOGGLES *******************************************
  const handleLayerToggle = (layerName) => {
    setLayerVisibility((prevState) => {
      if (layerName === 'metroLayerVisible') {
        const metroVisible = !prevState.metroLayerVisible;
        return {
          ...prevState,
          metroLayerVisible: metroVisible,
          layer0Visible: metroVisible ? prevState.layer0Visible : false,
          layer2Visible: metroVisible ? prevState.layer2Visible : false,
        };
      }
      return {
        ...prevState,
        [layerName]: !prevState[layerName],
      };
    });
  };

  //***************************************** QUERY SEARCH MENU TOGGLE*******************************************
  const handleMenuToggle = () => {
    setMenuOpen((prevOpen) => !prevOpen);
  };

  //***************************************** HANDLING QUERY CONDITIONS*******************************************
  const handleQueryConditionsChange = (event) => {
    const { name, value } = event.target;
    setQueryConditions((prevConditions) => ({
      ...prevConditions,
      [name]: value,
    }));
  };

  //***************************************** HANDLING TAB CHANGES IN ATTRIBUTE TABLE *******************************************
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1); 
  };

  //***************************************** CREATING & HANDLING QUERY FUNCTIONALITIES + FEATURES HIGHLIGHTING**************************
  const handleRunQuery = () => {
    if (viewRef.current && menuOpen) {
      loadModules(['esri/tasks/QueryTask', 'esri/tasks/support/Query', 'esri/Graphic', 'esri/symbols/SimpleMarkerSymbol', 'esri/symbols/SimpleLineSymbol', 'esri/layers/GraphicsLayer',
      ]).then(([QueryTask, Query, Graphic, SimpleMarkerSymbol, SimpleLineSymbol, GraphicsLayer]) => {
        const queryTasks = [];
        const activeTabs = []; 

        if (menuOpen) {
          const queryConfigs = [
            {
              name: 'zone',
              url: 'https://gisportal.ptcl.net.pk/arcgis/rest/services/PTCL/Zone/MapServer/0',
              where: `ZONE_NAME = '${queryConditions.zoneName}'`,
              isChecked: zoneCheckboxChecked,
            },
            {
              name: 'site',
              url: 'https://gisportal.ptcl.net.pk/arcgis/rest/services/PTCL/IT_Metro_Fiber_Cut/MapServer/0',
              where: `SITE_NA = '${queryConditions.siteName}'`,
              isChecked: metroCheckboxChecked && metroSitesCheckboxChecked,
            },
            {
              name: 'section',
              url: 'https://gisportal.ptcl.net.pk/arcgis/rest/services/PTCL/IT_Metro_Fiber_Cut/MapServer/2',
              where: `SECTION_NA = '${queryConditions.sectionName}'`,
              isChecked: metroCheckboxChecked && metroRoutesCheckboxChecked,
            },
          ];
          queryConfigs.forEach((config) => {
            const { name, url, where, isChecked } = config;
            if (isChecked) {
              activeTabs.push(name);
              const queryTask = new QueryTask({ url });
              const query = new Query({ where, returnGeometry: true, outFields: ['*'] });
              queryTasks.push(queryTask.execute(query));
            }
          });
        }

        Promise.all(queryTasks)
          .then((results) => {
            const features = results.flatMap((result) => result.features);

            let highlightGraphicsLayer;

            if (!highlightGraphicsLayerRef.current) {
              highlightGraphicsLayer = new GraphicsLayer();
              if (viewRef.current && viewRef.current.map) {
                viewRef.current.map.add(highlightGraphicsLayer);
                highlightGraphicsLayerRef.current = highlightGraphicsLayer;
              } else {
                console.error('View or Map is not initialized properly.');
              }
            } else {
              highlightGraphicsLayer = highlightGraphicsLayerRef.current;
              highlightGraphicsLayer.removeAll(); 
            }

            
            features.forEach((feature, index) => {
              let symbol;
              if (feature.geometry.type === 'polygon') {
                symbol = new SimpleLineSymbol({
                  color: index === 0 ? [255, 0, 0] : [0, 255, 255], 
                  width: 2,
                });
              }  else if (feature.geometry.type === 'point') {
                symbol = new SimpleMarkerSymbol({
                  color: index === 1 ? [0, 255, 0, 1] : [255, 0, 255, 1], 
                  size: 10,
                });
              } else if (feature.geometry.type === 'polyline') {
                symbol = new SimpleLineSymbol({
                  color: [255, 255, 0, 1],
                  width: 2,
                });
              }

              if (symbol) {
                const highlightGraphic = new Graphic({
                  geometry: feature.geometry,
                  symbol: symbol,
                });
                if (highlightGraphicsLayer) {
                  highlightGraphicsLayer.add(highlightGraphic);
                } else {
                  console.error('Highlight Graphics Layer is not set.');
                }
              }
            });
          
            if (activeTabs.includes('zone')) {
              handleSetActiveTab('zone');
            } else if (activeTabs.includes('site')) {
              handleSetActiveTab('site');
            } else if (activeTabs.includes('section')) {
              handleSetActiveTab('section');
            }

            setQueryResults({
              zoneData: features.filter((feature) => feature.geometry.type === 'polygon'),
              siteData: features.filter((feature) => feature.geometry.type === 'point'),
              sectionData: features.filter((feature) => feature.geometry.type === 'polyline'),
            });
            setShowAttributeTable(true);
            setCurrentPage(1); 
          })
          .catch((error) => {
            console.error('Query failed:', error);
          });
      });
    }
  };

  //***************************************** CLOSE ATTRIBUTE TABLE ****************
  const handleCloseAttributeTable = () => {
    setShowAttributeTable(false);
    setQueryConditions({
      zoneName: '',
      siteName: '',
      sectionName: '',
    });

    if (highlightGraphicsLayerRef.current) {
      highlightGraphicsLayerRef.current.removeAll();
    }

    if (viewRef.current) {
      viewRef.current.goTo({
        center: [69, 30.5],
        zoom: 6, 
      });
    }
  };

  //***************************************** HANDLING ACTIVE TABS *******************************************
  const handleSetActiveTab = (tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };
  
  //***************************************** FILTERING OUT COLUMNS WITH VALUES, REMOVING NULL COLUMNS *******************************************
  const filterColumnsWithEntries = (data) => {
    if (!data || data.length === 0) {
      return []; 
    }

  const allColumns = Object.keys(data[0].attributes);
  const columnsWithEntries = allColumns.filter((column) =>
    data.some((result) => result.attributes[column] !== null && result.attributes[column] !== '')
  );
  return columnsWithEntries;
  };

  //***************************************** PAGINATED QUERY RESULTS *******************************************
  const getPaginatedQueryResults = (data) => {
    const indexOfLastResult = currentPage * rowsPerPage;
    const indexOfFirstResult = indexOfLastResult - rowsPerPage;
    return data.slice(indexOfFirstResult, indexOfLastResult);
  };

  //***************************************** ZOOM EXTENT FUNCTIONALITY WHEN ROW IN ATTRIBUTE TABLE IS CLICKED *******************************************
  const zoomToFeatureExtent = (geometry) => {
    if (viewRef.current && geometry) {
      viewRef.current.goTo(geometry);
    }
  };

  //***************************************** RENDERING OF ATTRIBUTE TABLE *******************************************
  const renderAttributeTable = (data) => {
    const paginatedQueryResults = getPaginatedQueryResults(data);

    if (!data || data.length === 0 || paginatedQueryResults.length === 0) {
      return null;
    }

    const columns = filterColumnsWithEntries(data);

    return (
      <div style={{position: 'absolute', bottom: '10px', left: '250px', background: 'white', padding: '10px', boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)', zIndex: 1, height: '260px',  overflowY: 'auto',  width: '400px', fontSize: '13px',}}
  >
        {/* Tab Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        {zoneCheckboxChecked && (
          <button
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'zone' ? '#A5D8DD' : '#ddaaa5',
              color: 'black',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
            }}
            onClick={() => handleTabChange('zone')}
          >
            Zone
          </button>
        )}

        {metroCheckboxChecked && metroSitesCheckboxChecked && (
          <button
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'site' ? '#A5D8DD' : '#ddaaa5',
              color: 'black',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
            }}
            onClick={() => handleTabChange('site')}
          >
            Site
          </button>
        )}

        {metroCheckboxChecked && metroRoutesCheckboxChecked && (
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '4px',
              backgroundColor: activeTab === 'section' ? '#A5D8DD' : '#ddaaa5',
              color: 'black',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
            }}
            onClick={() => handleTabChange('section')}
          >
            Section
          </button>
        )}
      </div>
      <br />

      {/* Close button */}
      <button
        style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          background: '#A5D8DD',
          border: 'none',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={handleCloseAttributeTable}
      >
        <span style={{ fontSize: '12px' }}>&times;</span>
      </button>

        {/* Attribute Table */}
        {showAttributeTable && (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} style={{ border: '1px solid black', padding: '5px' }}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedQueryResults.map((result, index) => (
              <tr
                key={index}
                style={{ cursor: 'pointer' }} 
                onClick={() => zoomToFeatureExtent(result.geometry)} 
              >
                {columns.map((column) => (
                  <td key={column} style={{ border: '1px solid black', padding: '5px' }}>
                    {result.attributes[column]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage((prevPage) => prevPage - 1)}>
            Prev
          </button>
          <span style={{ margin: '0 10px' }}>{`Page ${currentPage} of ${Math.ceil(data.length / rowsPerPage)}`}</span>
          <button
            disabled={currentPage === Math.ceil(data.length / rowsPerPage)}
            onClick={() => setCurrentPage((prevPage) => prevPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  //***************************************** RENDERING OF ATTRIBUTE TABLE *******************************************
  const renderTabContent = () => {
    if (!queryResults) {
      return null;
    }

    let activeData;
    switch (activeTab) {
      case 'zone':
        activeData = queryResults.zoneData || [];
        break;
      case 'site':
        activeData = queryResults.siteData || [];
        break;
      case 'section':
        activeData = queryResults.sectionData || [];
        break;
      default:
        activeData = [];
    }

    return (
      <div>
        {/* Render attribute table based on activeTab */}
        {activeData.length > 0 ? renderAttributeTable(activeData) : null}
      </div>
    );
  };

  //***************************************** JSX *******************************************
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
            
      <style>
        {`
          .toggle-menu-icon {
            position: fixed;
            width: 20px;
            left: 230px;
            top: 15px;
            background-color: #ddaaa5;
            padding: 10px;
            z-index: 2;
            cursor: pointer;
          }

          .toggle-menu {
            position: absolute;
            top: 15px;
            left: 280px;
            width: 200px;
            padding: 10px;
            background-color: #A5D8DD;
            z-index: 2;
          }

          .custom-dropdown {
            padding: 5px;
            font-size: 14px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: #fff;
            width: 180px;
            margin-bottom: 10px;
          }

          .custom-checkbox {
            position: relative;
            padding-left: 30px;
            cursor: pointer;
            font-size: 16px;
            user-select: none;
          }
          
          .custom-checkbox input {
            position: absolute;
            opacity: 0;
            cursor: pointer;
          }
          
          .checkmark {
            position: absolute;
            top: 2px; 
            left: 0;
            height: 15px;
            width: 15px; 
            border: 2px solid #c8756d;
            border-radius: 30%;
            transition: background-color 0.3s, border-color 0.3s;
          }
          
          .custom-checkbox input:checked ~ .checkmark {
            border-color: #c8756d; 
          }
          
          .checkmark::after {
            content: '';
            position: absolute;
            display: none;
          }
          
          .custom-checkbox input:checked ~ .checkmark::after {
            display: block;
            left: 8px; 
            bottom: 7px; 
            width: 4px;
            height: 10px;
            border: solid white;
            border-width: 0 5px 5px 0;
            transform: rotate(40deg);
          }
        `}
      </style>

      {menuOpen && (
        <div className="toggle-menu">
          <div>
            <h3>Available Layers</h3>
            <div style={{paddingBottom: '5px'}}>
              <label className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={zoneCheckboxChecked}
                  onChange={() => setZoneCheckboxChecked(!zoneCheckboxChecked)}
                />
                <span className="checkmark"></span>
                Zones Layer
              </label>
            </div>
            <div>
            <label className="custom-checkbox">
            <input
              type="checkbox"
              checked={metroCheckboxChecked}
              onChange={() => setMetroCheckboxChecked(!metroCheckboxChecked)}
            />
              <span className="checkmark"></span>
              IT Metro Fiber Layer
              </label>
            <div style={{ marginLeft: '20px' }}>
              <div style={{paddingBottom: '5px', paddingTop: '5px'}}>
              <label className="custom-checkbox">
              <input
                  type="checkbox"
                  checked={metroSitesCheckboxChecked}
                  onChange={() => setMetroSitesCheckboxChecked(!metroSitesCheckboxChecked)}
                />
              <span className="checkmark"></span>
              All Metro Sites
              </label>
              </div>
              <div>
              <label className="custom-checkbox">
              <input
                  type="checkbox"
                  checked={metroRoutesCheckboxChecked}
                  onChange={() => setMetroRoutesCheckboxChecked(!metroRoutesCheckboxChecked)}
                />
              <span className="checkmark"></span>
              All Metro Routes
              </label>
              </div>
            </div>
          </div>
            <div style={{ overflow: 'auto', maxHeight: '1000px' }}>
              <div style={{ padding: '5px', backgroundColor: '#A5D8DD' }}>
              <h3>Search</h3>
              {zoneCheckboxChecked && (
                <div>
                  <label>Zone Name:</label>
                  <br />
                  <select
                    name="zoneName"
                    value={queryConditions.zoneName}
                    onChange={handleQueryConditionsChange}
                    className="custom-dropdown"
                  >
                    <option value="">Select Zone</option>
                    {zoneOptions.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {metroSitesCheckboxChecked && (
                <div>
                  <label>Site Name:</label>
                  <br />
                  <select
                    name="siteName"
                    value={queryConditions.siteName}
                    onChange={handleQueryConditionsChange}
                    className="custom-dropdown"
                  >
                    <option value="">Select Site</option>
                    {siteOptions.map((site) => (
                      <option key={site} value={site}>
                        {site}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {metroRoutesCheckboxChecked && (
                <div>
                  <label>Route Name:</label>
                  <br />
                  <select
                    name="sectionName"
                    value={queryConditions.sectionName}
                    onChange={handleQueryConditionsChange}
                    className="custom-dropdown"
                  >
                    <option value="">Select Route</option>
                    {sectionOptions.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
              )}
                
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  style={{
                    marginRight: '10px',
                    padding: '8px 16px',
                    borderRadius: '4px',
                    backgroundColor: '#c8756d',
                    color: 'white',
                    border: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={handleRunQuery}
                >
                  Search
                </button>
              </div>

              </div>
            </div>
          </div>
        </div>
      )}

      <div className="toggle-menu-icon" onClick={handleMenuToggle}>
        <FontAwesomeIcon icon={menuOpen ? faTimes : faSearch}/>
      </div>

      <div style={{ width: '200px', padding: '10px', backgroundColor: '#A5D8DD' }}>
        <div style={{paddingBottom: '5px'}}>
        <h3>
            <FontAwesomeIcon icon={faLayerGroup} /> Feature Layers
          </h3>
          <label className="custom-checkbox">
          <input
            type="checkbox"
            checked={layerVisibility.zoneLayerVisible}
            onChange={() => handleLayerToggle('zoneLayerVisible')}
          />
                <span className="checkmark"></span>
                Zones Layer
              </label>
        </div>
        <div >
        <label className="custom-checkbox">
        <input
            type="checkbox"
            checked={layerVisibility.metroLayerVisible}
            onChange={() => handleLayerToggle('metroLayerVisible')}
          />
                <span className="checkmark"></span>
                IT Metro Fiber Layer
              </label>
          
          <div style={{ marginLeft: '20px' }}>
            <div style={{paddingBottom: '5px', paddingTop: '5px'}}>
            <label className="custom-checkbox">
            <input
                type="checkbox"
                checked={layerVisibility.layer0Visible}
                onChange={() => handleLayerToggle('layer0Visible')}
              />
                <span className="checkmark"></span>
                All Metro Sites
              </label>
            </div>
            <div>
            <label className="custom-checkbox">
            <input
                type="checkbox"
                checked={layerVisibility.layer2Visible}
                onChange={() => handleLayerToggle('layer2Visible')}
              />
                <span className="checkmark"></span>
                All Metro Routes
              </label>
              
              
            </div>
          </div>
        </div>                                                                                                                                                                                                                                            <br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br>
        {legend && (
        <div
          style={{
            top: '20px',
            right: '20px',
            backgroundColor: '#ddaaa5',
            padding: '10px',
            borderRadius: '5px',
            boxShadow: '0 0 5px rgba(0, 0, 0, 0.2)',
            zIndex: 2,
            fontSize: '12px',
          }}
        >
          <h3>
          <FontAwesomeIcon icon={faInfoCircle} /> Legend
        </h3>
          <div ref={legendRef} style={{ height: '200px', overflow: 'auto' }} />
        </div>
      )}
      </div>

      <div ref={mapRef} style={{ flex: 1 }} />
      {mapLoaded && queryResults && showAttributeTable && renderTabContent()}
    </div>
  );
};

export default Map;





