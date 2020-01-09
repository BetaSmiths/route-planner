import React, { useState } from "react"
import { GoogleMap, LoadScript, Marker, MarkerClusterer, InfoWindow, InfoBox } from '@react-google-maps/api'

const MARKER_FILL_HEIGHT = 28.0

const getMarker = (pct, color = "#FF00FF", opacity = 1.0) => { //#Note: color can be rgb() or "red", "green" or #FF00FF
    let height = Math.max(2, (pct || 0) * MARKER_FILL_HEIGHT / 100.0)
    const result = `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="10" height="32"><rect stroke="black" fill="black" opacity="${opacity}" width="10" height="32" rx="5" ry="3"/><rect fill="${color.replace("#", "%23")}" opacity="${opacity}" width="6" height="${height}" x="2" y="${2 + MARKER_FILL_HEIGHT - height}"/></svg>`
    return result
}

const AdariaGMap = (props) => {

    let bounds = new window.google.maps.LatLngBounds()

    for (const [acctId, { isVisible, position }] of Object.entries(props.data)) {
        if (typeof (isVisible) === 'undefined' || isVisible)
            bounds.extend(position);
    }

    let [selectedAcct, setSelectedAcct] = useState()


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
                let markerColor = props.machineGroups.default
                for (let m of mData || []) {
                    if (m.Id in props.selectedMachines) {
                        markerColor = '#a3940b'
                        break
                    }
                    if ('group' in m) {
                        markerColor = props.machineGroups[m.group] || props.machineGroups.default
                        break
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
                        setSelectedAcct(acctId)
                    }}
                    clusterer={clusterer}
                >
                    {(selectedAcct === acctId && mData) && <InfoWindow
                        position={accountInfo.position}
                        onCloseClick={() => setSelectedAcct(null)}
                        key={`acctInfo-${idx}`}
                    >
                        <div style={{ width: "100%", height: "100%", maxHeight: "600px" }}>
                            <h5>{accountInfo.Account} ({accountInfo.AccountId})</h5>
                            <div>{accountInfo.Address}, {accountInfo.City}, {accountInfo.State}</div>
                            <div>Main Route: {accountInfo.Route} ({accountInfo.RouteId})</div>
                            <div><b># Machines:</b> {accountInfo.numMachines} <b># Soldout:</b> {accountInfo.SoldoutItems} {" "}
                                <b>Fill</b>: {Math.round(accountInfo.min_fill_pct)}%  <b>To Pick:</b> {accountInfo.ItemsToPick} {" "}
                                <b>Open?:</b> <span style={{ color: accountInfo.IsAccountOpen ? "black" : "red" }}>{accountInfo.IsAccountOpen ? "Y" : "N"}</span>
                            </div>
                            <button
                                onClick={() => {
                                    let newSelected = { ...props.selectedMachines }
                                    mData.forEach(m => newSelected[m.Id] = m.AccountId)
                                    props.updateSelectedMachines(newSelected)
                                    setSelectedAcct(null)
                                }}
                                style={{
                                    backgroundColor: '#4CAF50',
                                    border: 'none',
                                    padding: '15px 20px',
                                    textAlign: 'center',
                                    display: 'inline-block'
                                }}>Select All</button>
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
                                        <th>Sales (24hr)</th>
                                        <th>Sales (7d)</th>
                                        <th>Sales</th>
                                        <th>Days since Visit</th>
                                        <th>Add</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mData.map((d, idx) => {
                                        const isAdd = !(d.Id in props.selectedMachines)
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
                                                <td>{d.Last24HoursSales}</td>
                                                <td>{d.Last7DaysSales}</td>
                                                <td>{Math.round(d.Sales * 100) / 100}</td>
                                                <td>{d.DaysSinceLastVisit}</td>
                                                <td><button
                                                    onClick={() => {
                                                        let newSelected = { ...props.selectedMachines }
                                                        if (isAdd)
                                                            newSelected[d.Id] = d.AccountId
                                                        else
                                                            delete newSelected[d.Id]
                                                        props.updateSelectedMachines(newSelected)
                                                    }}
                                                    style={{
                                                        backgroundColor: isAdd ? '#4CAF50' : 'red',
                                                        border: 'none',
                                                        padding: '10px 12px',
                                                        textAlign: 'center',
                                                        display: 'inline-block'
                                                    }}>{isAdd ? 'Add' : 'Remove'}</button></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </InfoWindow>}
                </Marker>
            }
            )}
        </MarkerClusterer>
    </GoogleMap>
        <div id='map-reset-center-zoom'
            style={{ backgroundColor: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 10, width: 40, height: 40 }}
            onClick={() => window.gmap.fitBounds(bounds)}>
            <img style={{ width: 18, }} src='data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18"><path d="M17.659,9.597h-1.224c-0.199-3.235-2.797-5.833-6.032-6.033V2.341c0-0.222-0.182-0.403-0.403-0.403S9.597,2.119,9.597,2.341v1.223c-3.235,0.2-5.833,2.798-6.033,6.033H2.341c-0.222,0-0.403,0.182-0.403,0.403s0.182,0.403,0.403,0.403h1.223c0.2,3.235,2.798,5.833,6.033,6.032v1.224c0,0.222,0.182,0.403,0.403,0.403s0.403-0.182,0.403-0.403v-1.224c3.235-0.199,5.833-2.797,6.032-6.032h1.224c0.222,0,0.403-0.182,0.403-0.403S17.881,9.597,17.659,9.597 M14.435,10.403h1.193c-0.198,2.791-2.434,5.026-5.225,5.225v-1.193c0-0.222-0.182-0.403-0.403-0.403s-0.403,0.182-0.403,0.403v1.193c-2.792-0.198-5.027-2.434-5.224-5.225h1.193c0.222,0,0.403-0.182,0.403-0.403S5.787,9.597,5.565,9.597H4.373C4.57,6.805,6.805,4.57,9.597,4.373v1.193c0,0.222,0.182,0.403,0.403,0.403s0.403-0.182,0.403-0.403V4.373c2.791,0.197,5.026,2.433,5.225,5.224h-1.193c-0.222,0-0.403,0.182-0.403,0.403S14.213,10.403,14.435,10.403"></path></svg>' />
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