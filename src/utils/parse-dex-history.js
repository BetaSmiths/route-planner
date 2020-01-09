const Papa = require('papaparse')
const fs = require('fs');
const moment = require('moment')

const file = fs.readFileSync('/mnt/c/temp/routeDex.csv', 'utf-8');
const data = Papa.parse(file, { delimiter: ',', quoteChar: '"', header: true, dynamicTyping: true })

const collects = data.data.filter(r => r.Type && r.Type.toLowerCase().indexOf('collect') > -1)

const groupedCollects = {} // assetId: [collect (date desc)]

for (let collect of collects) {
  collect.d = moment(collect.Date)
  if (collect.AssetId in groupedCollects) {
    groupedCollects[collect.AssetId].push(collect)
  } else {
    groupedCollects[collect.AssetId] = [collect]
  }
}

const assetAttrs = {}
for (let [assetId, dexes] of Object.entries(groupedCollects)) {
  //dexes.sort((a,b) => a.d.toISOString() - b.d.toISOString())
  assetAttrs[assetId] = dexes.reduce((accum, val) => {
    if (val.d > accum.latestDate) {
      accum.latestDate = val.d
    }
    if (val.d < accum.earliestDate) {
      accum.sum += accum.earliestVal
      accum.earliestDate = val.d
      accum.earliestVal = val.Sales
    } else {
      accum.sum += val.Sales
    }
    accum.numVisits += 1

    return accum
  }, { earliestDate: moment(), earliestVal: 0, sum: 0, latestDate: moment(0), numVisits: 0 })
}

Object.entries(assetAttrs).forEach(([assetId, x]) => {
  x.assetId = assetId
  x.dexDays = x.latestDate.diff(x.earliestDate, 'days')
  x.avgSales = Math.floor(x.sum * 10.0 / x.dexDays) / 10.0
  x.visitPeriod = Math.floor(x.dexDays * 2.0 / x.numVisits) / 2.0 // 0.5 increments
})

fs.writeFileSync('/mnt/c/temp/assetSales.csv', Papa.unparse(Object.values(assetAttrs)))

