import React, { useState } from "react"
import { GoogleMap, LoadScript, Marker, MarkerClusterer, InfoWindow } from '@react-google-maps/api'


const PROGRESS_BAR_PNG = "https://i.ibb.co/tcMgPY4/progress-bar.png"
const PROGRESS_X_IDX = [
    0, 38.83, 77.66, 116.50, 155.33, 194.16,
    0, 38.83, 77.66, 116.50, 155.33, 194.16,
]
const PROGRESS_Y_IDX = [
    0, 0, 0, 0, 0, 0,
    38, 38, 38, 38, 38, 38
]

const AdariaGMap = (props) => {

    let bounds = new window.google.maps.LatLngBounds()

    for (const [acctId, { position: latlong }] of Object.entries(props.data)) {
        bounds.extend(latlong);
    }

    let [selectedAcct, setSelectedAcct] = useState()

    return <GoogleMap
        onLoad={map => {
            map.fitBounds(bounds);
            window.gmap = map;
        }}
        mapContainerStyle={{ height: 400 }}
        {...props}>
        <Marker position={{ lat: 43.836802, lng: -79.503661 }} icon="https://maps.google.com/mapfiles/kml/pal3/icon56.png" />
        <MarkerClusterer
            minimumClusterSize={5} // default is 2
            maxZoom={9}
            gridSize={30} //default is 60
        >
            {(clusterer) => Object.entries(props.data).map(([acctId, accountInfo], idx) => {
                const progress_idx = Math.floor(accountInfo.healthScore / (100.0 / 12))
                const mData = props.machineData[acctId]
                return <Marker
                    // label={{text: "[Company Name]", color: 'red'}}

                    title={accountInfo.Account}
                    key={`marker-${idx}`}
                    position={accountInfo.position}
                    label={{
                        color: "rgb(39, 170, 225)",
                        text: `${accountInfo.numMachines}`
                    }}
                    icon={{
                        // Apparently GMaps is better using png than svg
                        // https://cloud.google.com/blog/products/maps-platform/google-maps-platform-best-practices-optimization-and-performance-tips
                        // this has a lot of good stuff:
                        // https://sites.google.com/site/gmapsdevelopment/
                        // http://kml4earth.appspot.com/icons.html
                        url: PROGRESS_BAR_PNG, // size is 466x145

                        // The display size of the sprite or image. When using sprites, you must 
                        //specify the sprite size. If the size is not provided, it will be set 
                        //when the image loads.
                        size: new window.google.maps.Size(36, 36),

                        //The position of the image within a sprite, if any. By default, the origin 
                        // is located at the top left corner of the image (0, 0).
                        origin: new window.google.maps.Point(PROGRESS_X_IDX[progress_idx], PROGRESS_Y_IDX[progress_idx]),

                        // The size of the entire image after scaling, if any. Use this property to 
                        // stretch/shrink an image or a sprite.

                        scaledSize: new window.google.maps.Size(233, 72.5),

                        //anchor: The position at which to anchor an image in correspondence to the 
                        // location of the marker on the map. By default, the anchor is located along 
                        // the center point of the bottom of the image.
                        // anchor: new window.google.maps.Point(39+18, 38),
                    }}
                    onClick={(e) => {
                        setSelectedAcct(acctId)
                    }}
                    clusterer={clusterer}
                >
                    {(selectedAcct === acctId) && <InfoWindow
                        position={accountInfo.position}
                        onCloseClick={() => setSelectedAcct(null)}
                        key={`acctInfo-${idx}`}
                    >
                        <div>
                            <h5>{accountInfo.Account} ({accountInfo.AccountId})</h5>
                            <div>{accountInfo.Address}, {accountInfo.City}, {accountInfo.State}</div>
                            <div>Route: {accountInfo.Route} ({accountInfo.RouteId})</div>
                            <div><b># Machines:</b> {accountInfo.numMachines} <b># Soldout:</b> {accountInfo.SoldoutItems} {" "}
                                <b>Fill</b>: {Math.round(accountInfo.min_fill_pct)}%  <b>To Pick:</b> {accountInfo.ItemsToPick} </div>
                            <table className='table'>
                                <thead>
                                    <tr>
                                        {/* Id,AccountId,Account,Location,LocationId,Last24HoursSales,Last7DaysSales,Fill %,Sales,SoldoutItems,EmptyLanes,IsAccountOpen,ItemsToPick,DaysSinceLastVisit */}
                                        <th>Id</th>
                                        <th>Location</th>
                                        <th>Fill %</th>
                                        <th>Soldout</th>
                                        <th># Empty</th>
                                        <th>Acct Open</th>
                                        <th>Pick</th>
                                        <th>Sales (24hr)</th>
                                        <th>Sales (7d)</th>
                                        <th>Sales</th>
                                        <th>Days since Visit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mData.map(d => (
                                        <tr key={`marker-machine-${d.Id}`} className="active">
                                            <td>{d.Id}</td>
                                            <td>{d.Location}</td>
                                            <td>{Math.round(d['Fill %'])}%</td>
                                            <td>{d.SoldoutItems}</td>
                                            <td>{d.EmptyLanes}</td>
                                            <td>{d.IsAccountOpen?"T":"F"}</td>
                                            <td>{d.ItemsToPick}</td>
                                            <td>{d.Last24HoursSales}</td>
                                            <td>{d.Last7DaysSales}</td>
                                            <td>{d.Sales}</td>
                                            <td>{d.DaysSinceLastVisit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </InfoWindow>}
                </Marker>
            }
            )}
        </MarkerClusterer>
    </GoogleMap>
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