import React, { useState } from "react"
import { GoogleMap, LoadScript, Marker, MarkerClusterer, InfoWindow, InfoBox } from '@react-google-maps/api'

const MARKER_FILL_HEIGHT = 28.0

const getMarker = (pct, color, opacity = 1.0) => { //#Note: color can be rgb() or "red", "green" or #FF00FF
    if (!color) color = "#AA00FF"
    let height = Math.max(2, (pct || 0) * MARKER_FILL_HEIGHT / 100.0)
    const result = `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="32"><rect stroke="black" fill="black" opacity="${opacity}" width="10" height="32" rx="5" ry="3"/><rect fill="${color.replace("#", "%23")}" opacity="${opacity}" width="6" height="${height}" x="2" y="${2 + MARKER_FILL_HEIGHT - height}"/></svg>`
    return result
}

const AdariaGMap = (props) => {

    let [showDetailWindow, setShowDetailWindow] = useState(true)

    let bounds = new window.google.maps.LatLngBounds()

    for (const [acctId, { isVisible, position }] of Object.entries(props.data)) {
        if (typeof (isVisible) === 'undefined' || isVisible) {
            bounds.extend(position);
        }
    }

    return <><GoogleMap
        onLoad={map => {

            window.gmap = map;
            // Adding control
            map.controls[window.google.maps.ControlPosition.TOP_CENTER].push(
                document.getElementById('floating-panel'))

            map.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(
                document.getElementById('map-reset-center-zoom'))

            map.controls[window.google.maps.ControlPosition.TOP_LEFT].push(
                document.getElementById('map-route-select'))

            map.controls[window.google.maps.ControlPosition.BOTTOM_CENTER].push(
                document.getElementById('map-machine-details'))

            map.fitBounds(bounds);
        }}

        options={{
            zoomControl: true,
            mapTypeControl: false,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: true
        }}

        mapContainerStyle={{ height: 400 }}
        {...props}>
        {/* <InfoBox><div style={{ fontSize: 16, fontColor: `#08233B` }}>
          Hello, World!
        </div></InfoBox> */}
        <Marker position={{ lat: 43.836802, lng: -79.503661 }}
            icon="https://maps.google.com/mapfiles/kml/pal3/icon56.png"
        />
        <MarkerClusterer
            minimumClusterSize={5} // default is 2
            maxZoom={9}
            gridSize={30} //default is 60
            ignoreHidden
        >
            {(clusterer) => Object.entries(props.data).map(([acctId, accountInfo], idx) => {
                const progress_idx = Math.floor(accountInfo.healthScore / (100.0 / 12))
                const mData = props.machineData[acctId]
                let markerColor = null
                for (let m of mData || []) {
                    if (props.selectedAcct == acctId) {
                        markerColor = "#4caf50"
                        break
                    }
                    
                    for (let [color, mg] of Object.entries(props.machineGroups)) {
                        if (m.Id in mg) {
                            markerColor = color
                            break
                        }
                        if (markerColor) break
                    }
                }
                return <Marker
                    title={accountInfo.Account}
                    key={`marker-${idx}`}
                    position={accountInfo.position}
                    label={{
                        color: "#DDD",
                        fontSize: '8px',
                        text: '' + (accountInfo.numMachines || '?'),
                    }}
                    icon={{
                        // Apparently GMaps is better using png than svg
                        // https://cloud.google.com/blog/products/maps-platform/google-maps-platform-best-practices-optimization-and-performance-tips
                        // this has a lot of good stuff:
                        // https://sites.google.com/site/gmapsdevelopment/
                        // http://kml4earth.appspot.com/icons.html
                        //url: PROGRESS_BAR_PNG, // size is 466x145
                        url: getMarker(accountInfo.healthScore, markerColor, (!('isVisible' in accountInfo) || accountInfo.isVisible) ? 1.0 : 0.2),

                        // The display size of the sprite or image. When using sprites, you must 
                        //specify the sprite size. If the size is not provided, it will be set 
                        //when the image loads.
                        //size: new window.google.maps.Size(36, 36),

                        //The position of the image within a sprite, if any. By default, the origin 
                        // is located at the top left corner of the image (0, 0).
                        //origin: new window.google.maps.Point(PROGRESS_X_IDX[progress_idx], PROGRESS_Y_IDX[progress_idx]),

                        // The size of the entire image after scaling, if any. Use this property to 
                        // stretch/shrink an image or a sprite.

                        //scaledSize: new window.google.maps.Size(233, 72.5),

                        //anchor: The position at which to anchor an image in correspondence to the 
                        // location of the marker on the map. By default, the anchor is located along 
                        // the center point of the bottom of the image.
                        anchor: new window.google.maps.Point(10, 0),

                    }}
                    onClick={(e) => {
                        parseInt(acctId) === props.selectedAcct ? props.updateSelectedAcct(null) : props.updateSelectedAcct(parseInt(acctId))
                    }}
                    clusterer={clusterer}
                >
                </Marker>
            }
            )}
        </MarkerClusterer>
    </GoogleMap>
        <div id='map-reset-center-zoom'
            style={{ backgroundColor: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 10, width: 40, height: 40 }}
            onClick={() => window.gmap.fitBounds(bounds)}>
            <img style={{ width: 18, }} src='https://s3.us-east-2.amazonaws.com/upload-icon/uploads/icons/png/17998375811574330942-32.png' />
        </div>
        <div id='map-machine-details' style={{ display: !!props.selectedAcct? "flex": "none", width: "80%", minHeight: 0, maxHeight: "40%", overflowY: 'auto', backgroundColor: 'white', padding: 20 }}>
            <button 
                onClick={() => 
                    // setShowDetailWindow(!showDetailWindow)
                    props.updateSelectedAcct(null)
                }
                style={{ position: "absolute", right: 5, top: 0, border: 0 }}>
                {showDetailWindow?
                    <img style={{ width: 10 }} src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2218%22%20height%3D%2218%22%20viewBox%3D%220%200%2018%2018%22%3E%0A%20%20%3Cpath%20fill%3D%22%23666%22%20d%3D%22M0%2C7h18v4H0V7z%22%2F%3E%0A%3C%2Fsvg%3E%0A" />
                    :
                    <img style={{width: 10}} src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2218%22%20height%3D%2218%22%20viewBox%3D%220%200%2018%2018%22%3E%0A%20%20%3Cpolygon%20fill%3D%22%23666%22%20points%3D%2218%2C7%2011%2C7%2011%2C0%207%2C0%207%2C7%200%2C7%200%2C11%207%2C11%207%2C18%2011%2C18%2011%2C11%2018%2C11%22%2F%3E%0A%3C%2Fsvg%3E%0A"/>
                }
                
            </button>
            {showDetailWindow && props.selectedAcct ? [[props.selectedAcct, props.data[props.selectedAcct]]].map(([acctId, accountInfo]) => {
                const mData = props.machineData[acctId]

                return <div key={`machine-details-${acctId}`} className="container">
                    <div className="columns">
                        <div className="column col-mr-auto">
                            <h6>{accountInfo.Account} ({accountInfo.AccountId})</h6>
                            <div ><b># Machines:</b> {accountInfo.numMachines} <b># Soldout:</b> {accountInfo.SoldoutItems} {" "}
                                <b>Fill</b>: {Math.round(accountInfo.min_fill_pct)}%  <b>To Pick:</b> {accountInfo.ItemsToPick} {" "}
                                <b>Open?:</b> <span style={{ color: accountInfo.IsAccountOpen ? "black" : "red" }}>{accountInfo.IsAccountOpen ? "Y" : "N"}</span>
                            </div>
                        </div>
                        <button className="column col-2"
                            onClick={() => {
                                let newSelected = { ...props.machineGroups[props.activeMachineGroup] }
                                mData.forEach(m => newSelected[m.Id] = m.AccountId)
                                props.updateMachineGroups({...props.machineGroups, [props.activeMachineGroup]: newSelected})
                                props.updateSelectedAcct(null)
                            }}
                            style={{
                                backgroundColor: props.activeMachineGroup,
                                color: 'white',
                                border: 'none',
                                padding: '15px 20px',
                                textAlign: 'center',
                                display: 'inline-block'
                            }}>Select All</button>
                        <button className="column col-2"
                            onClick={() => {
                                let newSelected = { ...props.machineGroups[props.activeMachineGroup] }
                                mData.forEach(m => { if (m.Id in newSelected) delete newSelected[m.Id] })
                                props.updateMachineGroups({...props.machineGroups, [props.activeMachineGroup]: newSelected})
                                props.updateSelectedAcct(null)
                            }}
                            style={{
                                backgroundColor: 'red',
                                color: 'white',
                                border: 'none',
                                padding: '15px 20px',
                                textAlign: 'center',
                                display: 'inline-block'
                            }}>Remove All</button>
                    </div>
                    <table className='table' style={{ fontSize: "0.5rem", fontWeight: "bold", padding: "0.1rem, 0.05rem" }}>
                        <thead>
                            <tr>
                                <th>Asset</th>
                                <th>Location</th>
                                <th>Model</th>
                                <th>Route</th>
                                <th>Fill %</th>
                                <th>Soldout Items / Lanes</th>
                                <th>Pick</th>
                                <th>Sales (24hr/7d)</th>
                                <th>Sales</th>
                                <th>Days since Visit</th>
                                <th>Add</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mData.map((d, idx) => {
                                const isAdd = !(d.Id in props.machineGroups[props.activeMachineGroup])
                                return (
                                    <tr key={`marker-machine-${d.Id}`} className={idx % 2 === 0 ? "active" : ""}>
                                        <td>{d.Asset}</td>
                                        <td>{d.Location}</td>
                                        <td>{d.Model}</td>
                                        <td>{d.Route.replace("Route", "")}</td>
                                        <td style={{ color: d['Fill %'] < 30 ? 'red' : 'black' }}>
                                            {Math.round(d['Fill %'])}%
                                                    <div style={{ height: 5, backgroundColor: 'black' }}>
                                                <div style={{ height: '100%', width: `${Math.min(100, Math.max(5, Math.round(d['Fill %'])))}%`, backgroundColor: d['Fill %'] > 60 ? 'green' : (d['Fill %'] > 30 ? 'yellow' : 'red') }}></div>
                                            </div></td>
                                        <td style={{ color: d.Model.toLowerCase().indexOf('drink') > -1 ? (d.SoldoutItems > 0 ? 'red' : 'black') : (d.SoldoutItems > 3 ? 'red' : (d.SoldoutItems > 0 ? '#a3940b' : 'black')) }}>{d.SoldoutItems}/{d.EmptyLanes}</td>
                                        <td>{d.ItemsToPick}</td>
                                        <td>{d.Last24HoursSales}/{d.Last7DaysSales}</td>
                                        <td>{Math.round(d.Sales * 100) / 100}</td>
                                        <td>{d.DaysSinceLastVisit}</td>
                                        <td><button
                                            onClick={() => {
                                                let newSelected = { ...props.machineGroups[props.activeMachineGroup]}
                                                if (isAdd)
                                                    newSelected[d.Id] = d.AccountId
                                                else
                                                    delete newSelected[d.Id]
                                                    props.updateMachineGroups({...props.machineGroups, [props.activeMachineGroup]: newSelected})
                                            }}
                                            style={{
                                                backgroundColor: isAdd ? props.activeMachineGroup : 'red',
                                                border: 'none',
                                                padding: '10px 12px',
                                                color: 'white',
                                                textAlign: 'center',
                                                display: 'inline-block'
                                            }}>{isAdd ? 'Add' : 'Remove'}</button></td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            }) : false}
        </div>
    </>
}


const withAdariaGMaps = GMap => (props) => {
    return <LoadScript
        id="script-loader"
        googleMapsApiKey="AIzaSyCltHEoGA-81o8mN7dhqDiU7yqkHCAMpn8"
        {...props}
    >
        <GMap
            id='adaria-map'
            {...props}
        />
    </LoadScript>
}


export default withAdariaGMaps(AdariaGMap)