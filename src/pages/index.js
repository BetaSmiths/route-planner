//get data from Vendsys and then run the following in linux:
// csvtool namedcol Id,RouteId,Route,AccountId,Account,Address,City,State,Location,Last24HoursSales,Last7DaysSales,"Fill %",Sales,SoldoutItems,EmptyLanes,ItemsToPick,DaysSinceLastVisit,IsAccountOpen /mnt/c/temp/routeplanner.csv -u "|" | sort | uniq > src/dataNeeded.csv
import React, { useState, useEffect } from "react"

import CSVReader from "react-csv-reader";
import Layout from "../components/layout"
import pick from 'lodash/pick'
import flatten from 'lodash/flatten'

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
  let [machineGroups, updateMachineGroups] = useState({ 'default': 'blue' })
  let [selectedRoute, updateSelectedRoute] = useState(0)
  let [routes, updateRoutes] = useState({})
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
    // const newAcctData = {}
    // Object.entries(accountData).forEach(([acctId, acctInfo]) => {
    //   newAcctData[acctId] = {...acctInfo, isVisible: (newRouteId === 0) || (newRouteId in (acctInfo.routes))}
    // })
    handleRouting(flatten(Object.values(machineData)), newRouteId, false)
    updateSelectedRoute(newRouteId)
    // updateAccountData(newAcctData)
  }

  return (
    <Layout className="container">
      <div className="columns" style={{
        textAlign: 'center',
        padding: 5,
        margin: '10px auto'
      }}>
        <CSVReader
          cssClass="react-csv-input"
          onFileLoaded={handleRouting}
          parserOptions={papaparseOptions}
        />
        <div className="column col-3 col-ml-auto">
          <select
            id='map-route-select'
            value={selectedRoute} onChange={changeRoute}>
            <option key="route-select-0" value={0}>All</option>
            {Object.entries(routes).map(([routeId, routeName], idx) => <option key={`route-select-${idx}`} value={routeId}>{routeName}</option>)}
          </select></div>

      </div>

      <div id="floating-panel" style={{backgroundColor: 'white', padding: 10}}>{Object.keys(selectedMachines).length} machines in {new Set(Object.values(selectedMachines)).size} locations selected</div>
      <AdariaGMap
        defaultZoom={14}
        defaultCenter={{ lat: 43.836802, lng: -79.503661 }}
        data={accountData}
        machineData={machineData}
        selectedMachines={selectedMachines}
        updateSelectedMachines={updateSelectedMachines}
        machineGroups={machineGroups}
        updateMachineGroups={updateMachineGroups}
      />
    </Layout>
  )
}

export default IndexPage
