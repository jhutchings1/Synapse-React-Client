// ALINA WIP TODO:
// - bar chart
// - filter
// - show 9 labels on expanded facet
import * as React from 'react'
import Plotly from 'plotly.js-basic-dist'
import * as PlotlyTyped from 'plotly.js'
import createPlotlyComponent from 'react-plotly.js/factory'
import { SizeMe } from 'react-sizeme'
import { Dropdown } from 'react-bootstrap'
import {
  faChartBar,
  faExpandAlt,
  faCompressAlt,
  faTimes,
} from '@fortawesome/free-solid-svg-icons'
import FacetFilter from '../../table/table-top/FacetFilter'

import { QueryWrapperChildProps } from '../../../containers/QueryWrapper'
import {
  FacetColumnResultValues,
  FacetColumnResultValueCount,
  ColumnType,
} from '../../../utils/synapseTypes'
import getColorPallette from '../../../containers/ColorGradient'

import { unCamelCase } from '../../../utils/functions/unCamelCase'
import {
  getStoredEntityHeaders,
  getStoredUserProfiles,
} from '../../../utils/functions/getDataFromFromStorage'
import { useEffect, useState } from 'react'
import { ElementWithTooltip } from '../../../containers/widgets/ElementWithTooltip'

const Plot = createPlotlyComponent(Plotly)

export type FacetNavPanelOwnProps = {
  applyChanges: Function
  index: number
  loadingScreen?: React.FunctionComponent | JSX.Element
  facetToPlot: FacetColumnResultValues
  onHide: Function
  onExpand?: Function
  onCollapse?: Function
}

const maxLabelLength: number = 19
const maxLegendLength: number = 30

type FacetNavPanelProps = FacetNavPanelOwnProps & QueryWrapperChildProps

type PlotType = 'PIE' | 'BAR'

const layout: Partial<PlotlyTyped.Layout> = {
  showlegend: false,
  annotations: [],
  margin: { l: 0, r: 0, b: 0, t: 0, pad: 0 },
  yaxis: {
    visible: false,
    showgrid: false,
  },
  xaxis: {
    visible: false,
    showgrid: false,
  },
}

// https://github.com/plotly/plotly.js/blob/fa51e33d3e1f8ca0c029b3029f3d006a5205c8f3/src/lib/index.js#L1173
const formatPercent = (ratio: number, n: number) => {
  n = n || 0
  let str =
    (Math.round(100 * ratio * Math.pow(10, n)) * Math.pow(0.1, n)).toFixed(n) +
    '%'
  for (let i = 0; i < n; i++) {
    if (str.indexOf('.') !== -1) {
      str = str.replace('0%', '%')
      str = str.replace('.%', '%')
    }
  }
  return str
}

export type GraphData = {
  data: PlotlyTyped.Data[]
  labels: FacetWithLabel[]
  colors: string[]
}

export function truncate(str: string | undefined, n: number) {
  if (!str) {
    return str
  }
  const trimmedStr: string = str.trim()
  return trimmedStr.length > n ? trimmedStr.substr(0, n - 1) + '…' : str
}

function extractPlotDataArray(
  facetToPlot: FacetColumnResultValues,
  columnType: ColumnType | undefined,
  index: number,
  plotType: PlotType,
  facetAliases: {} | undefined,
) {
  const { colorPalette } = getColorPallette(
    index,
    facetToPlot.facetValues.length,
  )

  const getLabels = (
    facetValues: FacetColumnResultValueCount[],
    truncateFlag: boolean,
    columnType?: ColumnType,
  ) => {
    return facetValues.map(facetValue => ({
      label: getLabel(facetValue, truncateFlag, columnType),
      count: facetValue.count,
    }))
  }

  const getLabel = (
    facetValue: FacetColumnResultValueCount,
    truncateFlag: boolean,
    columnType?: ColumnType,
  ): string => {
    if (facetValue.value === 'org.sagebionetworks.UNDEFINED_NULL_NOTSET') {
      return 'Unannotated'
    }

    if (columnType === 'ENTITYID') {
      const lookup = getStoredEntityHeaders()
      let value = lookup.find(item => item.id === facetValue.value)?.name
      if (truncateFlag) {
        value = truncate(value, maxLabelLength)
      }
      return value || facetValue.value
    }

    if (columnType === 'USERID') {
      const lookup = getStoredUserProfiles()
      let value = lookup.find(item => item.ownerId === facetValue.value)
        ?.userName
      if (truncateFlag) {
        value = truncate(value, maxLabelLength)
      }
      return value || facetValue.value
    }
    const value = facetValue.value
    return truncateFlag ? truncate(value, maxLabelLength)! : value
  }

  const labels = getLabels(facetToPlot.facetValues, false, columnType)
  const text = getLabels(facetToPlot.facetValues, true, columnType).map(
    el => el.label,
  )

  const singleChartData: PlotlyTyped.Data = {
    values:
      plotType === 'PIE'
        ? facetToPlot.facetValues.map(facet => facet.count)
        : undefined,
    labels: labels.map(el => el.label),
    text,
    x:
      plotType === 'BAR'
        ? facetToPlot.facetValues.map(facet =>
          getLabel(facet, false, columnType),
        )
        : undefined,
    y:
      plotType === 'BAR'
        ? facetToPlot.facetValues.map(facet => facet.count)
        : undefined,
    // @ts-ignore
    facetEnumerationValues: facetToPlot.facetValues.map(
      facetValue => facetValue.value,
    ),
    name: facetToPlot.columnName,
    hovertemplate:
      plotType === 'PIE'
        ? '<b>%{text}</b><br>' + '%{value} (%{percent})<br>' + '<extra></extra>'
        : '<b>%{text}: </b><br>' + '%{value} <br>' + '<extra></extra>',
    textinfo: 'none',
    type: plotType === 'PIE' ? 'pie' : 'bar',
    // @ts-ignore
    marker: {
      colors: plotType === 'PIE' ? colorPalette : undefined,
      color: plotType === 'BAR' ? colorPalette : undefined,
      line: {
        width: facetToPlot.facetValues.map(facetValue =>
          facetValue.isSelected ? 1 : 0,
        ),
      },
    },
    pull:
      plotType === 'PIE'
        ? facetToPlot.facetValues.map(facetValue =>
          facetValue.isSelected ? 0.04 : 0,
        )
        : undefined,
  }

  const result = {
    data: [singleChartData],
    labels,
    colors:
      plotType === 'PIE'
        ? (singleChartData.marker?.colors as string[])
        : (singleChartData.marker?.color as string[]),
  }
  return result
}

const applyFacetFilter = (
  event: PlotlyTyped.PlotMouseEvent,
  allFacetValues: FacetColumnResultValues,
  callbackApplyFn: Function,
) => {
  if (event.points && event.points[0]) {
    const plotPointData: any = event.points[0]
    const facetValueClickedValue =
      plotPointData.data.facetEnumerationValues[plotPointData.pointNumber]
    const facetValueClicked = allFacetValues.facetValues.find(
      facet => facet.value === facetValueClickedValue,
    )
    callbackApplyFn(
      allFacetValues,
      facetValueClicked,
      !facetValueClicked!.isSelected,
    )
  }
}

const applyDropdownFilter = (
  evt: React.ChangeEvent<HTMLInputElement>,
  allFacetValues: FacetColumnResultValues,
  callbackApplyFn: Function,
) => {
  if (evt.target.value) {
    const facetValueClicked = allFacetValues.facetValues.find(
      facet => facet.value === evt.target.value,
    )
    callbackApplyFn(allFacetValues, facetValueClicked, evt.target.checked)
  }
}

const getPlotStyle = (
  parentWidth: number | null,
  plotType: PlotType,
): { width: string; height: string } => {
  const quotient = plotType === 'BAR' ? 0.8 : 0.6
  const width = parentWidth ? parentWidth * quotient : 200
  const height = plotType === 'PIE' ? width : width / 3

  return {
    width: `${width}px`,
    height: `${height}px`,
  }
}

type FacetWithLabel = {
  label: string
  count: number
}

const renderLegend = (
  labels: FacetWithLabel[] | undefined,
  colors: string[] = [],
  isExpanded: boolean,
): JSX.Element => {
  if (!labels) {
    return <></>
  }
  const numLegendItems = isExpanded
    ? Math.min(labels.length, 9)
    : Math.min(labels.length, 3)
  if (numLegendItems === 0) {
    return <></>
  }
  const totalCount = labels.reduce(
    (curValue, curFacet) => curValue + curFacet.count,
    0,
  )
  return (
    <div
      className={`FacetNavPanel__body__legend${isExpanded ? '--expanded' : ''}`}
    >
      {labels.slice(0, numLegendItems).map((facetValue, index) => {
        const percent = formatPercent(facetValue.count / totalCount, 1)
        const label = `(${percent}) ${facetValue.label}`
        const labelDisplay = truncate(label, maxLegendLength)
        return (
          <div
            className="FacetNavPanel__body__legend__row"
            key={`legendLabel_${index}`}
          >
            <div style={{ backgroundColor: colors[index] }}></div>
            <label>{labelDisplay}</label>
          </div>
        )
      })}
    </div>
  )
}

const getClassNameForPlotDiv = (isExpanded: boolean, plotType: PlotType) => {
  if (!isExpanded) {
    return 'FacetNavPanel__body__plot'
  }
  return `FacetNavPanel__body__plot--expanded${
    plotType === 'BAR' ? 'Bar' : 'Pie'
    }`
}

const FacetNavPanel: React.FunctionComponent<FacetNavPanelProps> = ({
  onHide,
  onExpand,
  onCollapse,
  applyChanges,
  isLoadingNewData,
  loadingScreen,
  index,
  facetToPlot,
  data,
  isLoading,
  facetAliases,
}: FacetNavPanelProps): JSX.Element => {
  const [plotData, setPlotData] = useState<GraphData>()
  const [isExpanded, setIsExpanded] = useState(false)
  const [plotType, setPlotType] = useState<PlotType>('PIE')

  const getColumnType = (): ColumnType | undefined =>
    data?.columnModels?.find(
      columnModel => columnModel.name === facetToPlot.columnName,
    )?.columnType as ColumnType

  useEffect(() => {
    if (!facetToPlot) {
      return
    } else {
      const plotData = extractPlotDataArray(
        facetToPlot,
        getColumnType(),
        index,
        'PIE',
        facetAliases,
      )
      setPlotData(plotData)
    }
  }, [facetToPlot, data])

  useEffect(() => {
    setIsExpanded(onCollapse !== undefined)
  }, [onCollapse])

  const changePlotType = (plotType: PlotType) => {
    if (plotType === 'BAR') {
      setPlotData(
        extractPlotDataArray(
          facetToPlot,
          getColumnType(),
          index,
          'BAR',
          facetAliases,
        ),
      )
    } else {
      setPlotData(
        extractPlotDataArray(
          facetToPlot,
          getColumnType(),
          index,
          'PIE',
          facetAliases,
        ),
      )
    }
    setPlotType(plotType)
  }

  /* rendering functions */
  const renderChartSelectionToggle = (): JSX.Element => (
    <Dropdown>
      <Dropdown.Toggle variant="light" id="plot-selector">
        <ElementWithTooltip
                idForToolTip="toggleChart"
                tooltipText="Toggle chart type"
                key="toggleChart"
                image={faChartBar}
                className="SRC-primary-color"
                darkTheme={true}
              />
      </Dropdown.Toggle>
      <Dropdown.Menu className="chart-tools">
        <Dropdown.Item as="button" onClick={() => changePlotType('BAR')}>
          Bar Chart
        </Dropdown.Item>
        <Dropdown.Item as="button" onClick={() => changePlotType('PIE')}>
          Pie Chart
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  )

  
  const renderFacetFilter = (): JSX.Element => (
    <FacetFilter
      lastFacetSelection={{
        columnName: '',
        facetValue: '',
        selector: '',
      }}
      isLoading={!!isLoading}
      className=""
      colorOnExpanded="#000"
      applyChanges={(_: any) => (
        evt: React.ChangeEvent<HTMLInputElement>,
      ) => applyDropdownFilter(evt, facetToPlot, applyChanges)}
      isAllFilterSelectedForFacet={
        facetToPlot.facetValues.filter(item => item.isSelected)
          .length === 0
      }
      facetColumnResult={facetToPlot}
    />
  ) 

  if (isLoadingNewData || !facetToPlot) {
    return (
      <div className="SRC-loadingContainer SRC-centerContentColumn">
        {loadingScreen}
      </div>
    )
  } else {
    return (
      <div className={`FacetNavPanel${isExpanded ? '--expanded' : ''}`}>
        <div className="FacetNavPanel__title">
          <span className="FacetNavPanel__title__name">
            {unCamelCase(facetToPlot.columnName, facetAliases)}
          </span>
          {isLoading && (
            <span style={{ marginLeft: '2px' }} className={'spinner'} />
          )}
          <div className="FacetNavPanel__title__tools">

            {isExpanded && renderChartSelectionToggle()}

            {renderFacetFilter()}

            {!isExpanded && (
              <ElementWithTooltip
                idForToolTip="expandGraph"
                tooltipText="Expand to large graph"
                key="expandGraph"
                image={faExpandAlt}
                callbackFn={() => onExpand!(index)}
                className="SRC-primary-color"
                darkTheme={true}
              />
            )}

            {isExpanded && (
              <ElementWithTooltip
                idForToolTip="collapseGraph"
                tooltipText="Collapse to small graph"
                key="collapseGraph"
                image={faCompressAlt}
                callbackFn={() => onCollapse!(index)}
                className="SRC-primary-color"
                darkTheme={true}
              />
            )}

            <ElementWithTooltip
              idForToolTip="hideGraph"
              tooltipText="Hide graph under Show More"
              key="hideGraph"
              image={faTimes}
              callbackFn={() => onHide(index)}
              className="SRC-primary-color"
              darkTheme={true}
            />

          </div>
        </div>

        <div className={`FacetNavPanel__body${isExpanded ? '--expanded' : ''}`}>
          <SizeMe monitorHeight>
            {({ size }) => (
              <div className={getClassNameForPlotDiv(isExpanded, plotType)}>
                <Plot
                  layout={layout}
                  data={plotData?.data ?? []}
                  style={getPlotStyle(size.width, plotType)}
                  config={{ displayModeBar: false, responsive: true }}
                  useResizeHandler={true}
                  onClick={evt =>
                    applyFacetFilter(evt, facetToPlot, applyChanges)
                  }
                ></Plot>
              </div>
            )}
          </SizeMe>
          {renderLegend(plotData?.labels, plotData?.colors, isExpanded)}
        </div>
      </div>
    )
  }
}

export default FacetNavPanel
