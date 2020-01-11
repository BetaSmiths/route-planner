//get data from Vendsys and then run the following in linux:
// csvtool namedcol Id,RouteId,Route,AccountId,Account,Address,City,State,Location,Last24HoursSales,Last7DaysSales,"Fill %",Sales,SoldoutItems,EmptyLanes,ItemsToPick,DaysSinceLastVisit,IsAccountOpen /mnt/c/temp/routeplanner.csv -u "|" | sort | uniq > src/dataNeeded.csv
import React, { useState, useEffect, memo, useRef } from "react"

import CSVReader from "react-csv-reader";
import Layout from "../components/layout"
import pick from 'lodash/pick'
import flatten from 'lodash/flatten'
import ReactToPrint from 'react-to-print';

import AdariaGMap from '../components/adaria-gmap'
import latlong from '../components/location-latlong'
import accounts from '../components/account-info'

import './index.css'


const MACHINE_FIELDS_TO_RETAIN = 'Id,AccountId,Account,Model,Asset,Location,LocationId,Route,RouteId,Last24HoursSales,Last7DaysSales,Fill %,Sales,SoldoutItems,EmptyLanes,IsAccountOpen,ItemsToPick,DaysSinceLastVisit'.split(',')
const papaparseOptions = {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  // transformHeader: header => header.toLowerCase().replace(/\W/g, "_")
};


const IndexPage = (props) => {
  let [accountData, updateAccountData] = useState({})
  let [machineData, updateMachineData] = useState({})
  let [selectedMachines, updateSelectedMachines] = useState({})
  let [machineGroups, updateMachineGroups] = useState({ '#1D4C5C': {}, '#027316': {}, '#7738ff': {}, '#DBC017': {}, '#69635f': {}, '#98646a': {} })
  let [activeMachineGroup, setActiveMachineGroup] = useState('#1D4C5C')
  let [selectedRoute, updateSelectedRoute] = useState(0)
  let [routes, updateRoutes] = useState({})
  let [selectedAcct, updateSelectedAcct] = useState()
  let [showAccountSearch, setShowAccountSearch] = useState(false)
  let [showRouteDetails, setShowRouteDetails] = useState(false)
  let [accountSearchResult, setAccountSearchResult] = useState(Object.values(accounts).slice(0, 20))
  let routesRef = useRef()
  useEffect(() => {
    // combine account info and location-latlong
    updateAccountData(Object.entries(latlong).reduce((accumulator, [acctId, pos]) => {
      accumulator[acctId] = {
        ...accounts[acctId],
        position: pos
      }
      return accumulator
    }, {}))
    updateRoutes(Object.values(accounts).reduce((accumulator, acctInfo) => {
      accumulator[acctInfo.RouteId] = acctInfo.Route
      return accumulator
    }, {}))
  }, [])


  const sortMachines = (dictMachines) => {
    // dictMachines is a reverse dictionary of machineId: accountId
    return Object.entries(dictMachines).sort((a, b) => a[1] - b[1])
  }


  const handleRouting = (routeData, newRouteId = null, showAlert = true) => {
    if (newRouteId === null) {
      newRouteId = selectedRoute
    }
    const result = {}
    for (let machine of routeData) {
      let mInfo = pick(machine, MACHINE_FIELDS_TO_RETAIN)
      mInfo.SalesRate = 0.2 * (mInfo.Last24HoursSales || 0) + (mInfo.Last7DaysSales || 0) / 7.0 + 0.5 * (mInfo.Sales || 0) / 0.3 * (mInfo.DaysSinceLastVisit || 1.0)
      let isDrinkMachine = (mInfo.Model || '').toLowerCase().indexOf('drink') > -1
      mInfo.healthScore = Math.max(0, mInfo['Fill %'] - (isDrinkMachine ? 20 : 5) * mInfo.EmptyLanes)
      if (machine.AccountId in result) {
        result[machine.AccountId].push(mInfo)
      } else {
        result[machine.AccountId] = [mInfo]
      }
    }
    const missingAccounts = []
    const newAccountData = {} // If we don't want to ignore accounts with no machines... Object.assign({}, accountData)
    let maxSalesRate = 0
    for (let [acctId, accountMachines] of Object.entries(result)) {
      if (!(acctId in accountData)) {
        missingAccounts.push(`${acctId} - ${accountMachines[0].Account} (# Machines: ${accountMachines.length})`)
        continue
      }

      let acctData = Object.assign(accountData[acctId], accountMachines.reduce((accum, val) => {
        let machineInRoute = (newRouteId === 0) || (newRouteId === val.RouteId)
        if (machineInRoute) {
          accum.numMachines += 1
          if (val.Model.toLowerCase().indexOf('hot beverage') === -1) {
            accum.min_fill_pct = Math.min(accum.min_fill_pct, val['Fill %'])
            accum.healthScore = Math.min(accum.healthScore, val.healthScore)
          }
          accum.ItemsToPick += val.ItemsToPick || 0
          accum.SoldoutItems += val.SoldoutItems || 0
          accum.EmptyLanes += val.EmptyLanes || 0
          accum.SalesRate += val.SalesRate || 0
          accum.IsAccountOpen = val.IsAccountOpen
          maxSalesRate = Math.max(val.SalesRate || 0, maxSalesRate)
          accum.routes[val.RouteId] = (accum.routes[val.RouteId] || 0) + 1
          accum.isVisible = true
        }
        return accum
      }, { isVisible: false, numMachines: 0, healthScore: 100, min_fill_pct: 100, ItemsToPick: 0, SoldoutItems: 0, EmptyLanes: 0, SalesRate: 0, routes: {} }))
      newAccountData[acctId] = acctData
    }

    updateMachineData(result)
    updateAccountData(newAccountData)
    if (showAlert && missingAccounts) alert(`Missing the following account info:\n${missingAccounts.join('\n')}`)
  };

  const changeRoute = (e) => {
    const newRouteId = parseInt(e.target.value)
    handleRouting(flatten(Object.values(machineData)), newRouteId, false)
    updateSelectedRoute(newRouteId)
  }

  const searchAccount = (searchText) => {
    setAccountSearchResult(Object.values(accountData).filter(acct => acct.Account.toLowerCase().indexOf(searchText.toLowerCase()) > -1).slice(0, 20))
  }

  let selectedAcctInfo = accountData[selectedAcct]

  return (
    <Layout className="container" >
      {Object.keys(machineData).length === 0 ?
        <div className="columns" style={{
          textAlign: 'center',
          padding: 5,
          margin: '10px auto'
        }}>
          <CSVReader
            cssClass="react-csv-input"
            onFileLoaded={(data, fileName) => handleRouting(data)}
            parserOptions={papaparseOptions}
          /></div> :
        <>
          <AdariaGMap
            defaultZoom={14}
            defaultCenter={{ lat: 43.836802, lng: -79.503661 }}
            data={accountData}
            machineData={machineData}
            selectedMachines={selectedMachines}
            updateSelectedMachines={updateSelectedMachines}
            machineGroups={machineGroups}
            updateMachineGroups={updateMachineGroups}
            selectedAcctInfo={selectedAcctInfo}
            selectedAcct={selectedAcct}
            activeMachineGroup={activeMachineGroup}
            updateSelectedAcct={updateSelectedAcct}
          />

          <ReactToPrint
            trigger={() => <a href="#">Print routes</a>}
            content={() => routesRef.current}
            pageStyle={{paddingTop:60, paddingLeft: 50, paddingRight:50}}
          />
          {/* Components to be pulled in for the map on different occassions */}
          <div style={{ display: "none" }}>

            <div id="floating-panel" style={{ width: 300, paddingTop: 5,}}>
              <div className="container" style={{backgroundColor: activeMachineGroup,color: 'white', cursor:'default'}}>
                <div className="columns" style={{ textAlign: "center", paddingBottom: 5 }}>
                  <div className="column p-centered" style={{ marginBottom: 0 }}>
                    <h1 style={{ marginBottom: 0 }}>{Object.keys(machineGroups[activeMachineGroup]).length}</h1> machines
                  </div>
                  <div className="divider-vert" />
                  <div className="column p-centered">
                    <h1 style={{ marginBottom: 0 }}>{new Set(Object.values(machineGroups[activeMachineGroup])).size}</h1> locations
              </div>
                </div>
                <div className="columns" style={{ textAlign: "center", backgroundColor: 'white', display: 'flex', borderTop: '1px solid white' }}>
                  {Object.keys(machineGroups).map((color, idx) => <div key={`machine-group-chooser-${idx}`} style={{ backgroundColor: color, flex: 1, paddingTop: 5, paddingBottom: 5 }} onClick={() => setActiveMachineGroup(color)}>{Object.keys(machineGroups[color]).length}</div>)}
                </div>
              </div>
              <div style={{ backgroundColor:'white', maxHeight: 300, width: 600, display: showRouteDetails ? 'flex' : 'none' }}>
                <div ref={routesRef} className='container'>
                  {Object.values(machineGroups).map((machines, idx) => <>
                    <h3 key={`routes-print-acct-${idx}`} style={{ pageBreakBefore: "always" }}>Group {idx + 1}</h3>
                    <table key={`routes-print-table-${idx}`} className='table table-striped table-hover' style={{ fontSize: "0.5rem", fontWeight: "bold", padding: "0.1rem, 0.05rem" }}>
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Location</th>
                          <th>Model</th>
                          <th>Route</th>
                          <th>Soldout Items / Lanes</th>
                          <th>Pick</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortMachines(machines).map(([m, a]) => {
                          let mInfo = machineData[a].find(el => m == el.Id)
                          console.log('machine info', m, mInfo)
                          return <tr key={`routes-print-machine-${m}`}>
                            <td key={`routes-print-machine-${m}-acct`}>{mInfo.Account}</td>
                            <td key={`routes-print-machine-${m}-loc`}>{mInfo.Location}</td>
                            <td key={`routes-print-machine-${m}-model`}>{mInfo.Model}</td>
                            <td key={`routes-print-machine-${m}-route`}>{mInfo.Route}</td>
                            <td key={`routes-print-machine-${m}-soldout`}>{mInfo.SoldoutItems}/{mInfo.EmptyLanes}</td>
                            <td key={`routes-print-machine-${m}-pick`}>{mInfo.ItemsToPick}</td>
                          </tr>
                        })}</tbody></table>
                  </>)}
                </div>
              </div>
            </div>
            <div className="container" id='map-route-select' style={{ maxWidth: "30%", marginTop: 10, marginLeft: 20 }}>
              <div className="columns">
                <select className="col-auto"
                  value={selectedRoute} onChange={changeRoute}>
                  <option key="route-select-0" value={0}>All</option>
                  {Object.entries(routes).map(([routeId, routeName], idx) => <option key={`route-select-${idx}`} value={routeId}>{routeName}</option>)}
                </select>
                <img style={{ marginLeft: 5 }} src={showAccountSearch ? "https://s3.us-east-2.amazonaws.com/upload-icon/uploads/icons/png/2100495141541068756-16.png" : "https://s3.us-east-2.amazonaws.com/upload-icon/uploads/icons/png/13416400251535694869-16.png"}
                  onClick={() => setShowAccountSearch(!showAccountSearch)}
                />
              </div>

              {!showAccountSearch && selectedAcct ? <div id='map-account-summary' style={{ padding: 5, marginTop: 10, backgroundColor: "white" }}>
                <h6>{selectedAcctInfo.Account} ({selectedAcctInfo.AccountId})</h6>
                <div>{selectedAcctInfo.Address}, {selectedAcctInfo.City}, {selectedAcctInfo.State}</div>
                <div><b># Machines:</b> {selectedAcctInfo.numMachines} <b># Soldout:</b> {selectedAcctInfo.SoldoutItems} {" "}
                  <b>Fill</b>: {Math.round(selectedAcctInfo.min_fill_pct)}%  <b>To Pick:</b> {selectedAcctInfo.ItemsToPick} {" "}
                  <b>Open?:</b> <span style={{ color: selectedAcctInfo.IsAccountOpen ? "black" : "red" }}>{selectedAcctInfo.IsAccountOpen ? "Y" : "N"}</span>
                </div></div> : false}

              {showAccountSearch ?
                <div className="columns" style={{ backgroundColor: 'white', overflowY: 'auto', marginTop: 10 }}>
                  <input style={{ width: "100%" }} type="text" onChange={(e) => { searchAccount(e.target.value) }}></input>
                  <div style={{ cursor: "default", padding: 10 }}>
                    {accountSearchResult.map(acct => {
                      return <div onClick={() => { window.gmap.setCenter(acct.position); updateSelectedAcct(acct.AccountId) }}>{acct.Account}</div>
                    })}
                  </div></div>
                : false
              }
            </div>
          </div>
        </>}
    </Layout>
  )
}

export default memo(IndexPage)
