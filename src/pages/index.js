//get data from Vendsys and then run the following in linux:
// csvtool namedcol Id,RouteId,Route,AccountId,Account,Address,City,State,Location,Last24HoursSales,Last7DaysSales,"Fill %",Sales,SoldoutItems,EmptyLanes,ItemsToPick,DaysSinceLastVisit,IsAccountOpen /mnt/c/temp/routeplanner.csv -u "|" | sort | uniq > src/dataNeeded.csv
import React, { useState, useEffect } from "react"

import CSVReader from "react-csv-reader";
import Layout from "../components/layout"
import pick from 'lodash/pick'

import AdariaGMap from '../components/adaria-gmap'
import latlong from '../components/location-latlong'
import accounts from '../components/account-info'

import './index.css'


const MACHINE_FIELDS_TO_RETAIN = 'Id,AccountId,Account,Location,LocationId,Last24HoursSales,Last7DaysSales,Fill %,Sales,SoldoutItems,EmptyLanes,IsAccountOpen,ItemsToPick,DaysSinceLastVisit'.split(',')
const papaparseOptions = {
  header: true,
  dynamicTyping: true,
  skipEmptyLines: true,
  // transformHeader: header => header.toLowerCase().replace(/\W/g, "_")
};

const IndexPage = (props) => {
  let [accountData, updateAccountData] = useState({})
  let [machineData, updateMachineData] = useState({})
  useEffect(() => {
    // combine account info and location-latlong
    updateAccountData(Object.entries(latlong).reduce((accumulator, [acctId, pos]) => {
      accumulator[acctId] = {
        ...accounts[acctId],
        position: pos
      }
      return accumulator
    }, {}))
  }, [])

  const handleRouting = routeData => {
    const result = {}
    for (let machine of routeData) {
      let mInfo = pick(machine, MACHINE_FIELDS_TO_RETAIN)
      mInfo.SalesRate = 0.2 * (mInfo.Last24HoursSales || 0) + (mInfo.Last7DaysSales || 0)/7.0 + 0.5 * (mInfo.Sales || 0) / 0.3 * (mInfo.DaysSinceLastVisit || 1.0)
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
        accum.min_fill_pct = Math.min(val['Fill %'])
        accum.ItemsToPick += val.ItemsToPick || 0
        accum.SoldoutItems += val.SoldoutItems || 0
        accum.EmptyLanes += val.EmptyLanes || 0
        accum.SalesRate += val.SalesRate || 0
        maxSalesRate = Math.max(val.SalesRate || 0, maxSalesRate)
        return accum
      }, {min_fill_pct:100, ItemsToPick: 0, SoldoutItems: 0, EmptyLanes: 0, SalesRate: 0}))
      acctData.numMachines = accountMachines.length
      acctData.healthScore = acctData.min_fill_pct
      newAccountData[acctId] = acctData
    }
    Object.values(newAccountData).forEach(d => d.healthScore = Math.max(0, d.healthScore - 20 * (d.SalesRate * 1.0 / d.numMachines / maxSalesRate)))

    updateMachineData(result)
    updateAccountData(newAccountData)
    if (missingAccounts) alert(`Missing the following account info:\n${missingAccounts.join('\n')}`)
  };

  return (
    <Layout>
      <div style={{
        textAlign: 'center',
        padding: 15,
        margin: '10px auto'
      }}>
        <CSVReader
          cssClass="react-csv-input"
          label="Select CSV exported from Vendsys"
          onFileLoaded={handleRouting}
          parserOptions={papaparseOptions}
        />
      </div>
      <AdariaGMap defaultZoom={14} defaultCenter={{ lat: 43.836802, lng: -79.503661 }} data={accountData} machineData={machineData}/>
    </Layout>
  )
}

export default IndexPage
