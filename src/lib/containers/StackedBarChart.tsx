import { library } from '@fortawesome/fontawesome-svg-core'
import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import * as PropTypes from 'prop-types'
import * as React from 'react'
// ignore because this is rollup requiring imports be named a certain way
// tslint:disable-next-line
import ReactMeasure from "react-measure"
// ignore because this is rollup requiring imports be named a certain way
// tslint:disable-next-line
import ReactTooltip from "react-tooltip"
import { getColorPallette } from './ColorGradient'
import { QueryWrapperChildProps } from './QueryWrapper'

library.add(faAngleLeft)
library.add(faAngleRight)

export const PREVIOUS_ITEM_CLICK = 'left click'
export const NEXT_CLICK = 'right click'

type Rect = {
  height: number
  width: number
  top: number
  left: number
  right: number
  bottom: number
}

type MeasureRect = {
  bounds: Rect
}

export type StackedBarChartState = {
  facetValueOccurence: number
  chartSelectionFacetValue: string
  selectedFacets: {}
  dimensions: MeasureRect
  chartSelectionIndex: number
}

export type StackedBarChartProps = {
  loadingScreen: any
  synapseId: string
  unitDescription: string
}

type Info = {
  value: string
  count: number
  index: number
}

/**
 * Make a simple stacked bar chart
 *
 * @class StackedBarChart
 * @extends {React.Component}
 */
export default class StackedBarChart extends
    React.Component<StackedBarChartProps & QueryWrapperChildProps, StackedBarChartState> {

  public static propTypes = {
    loadingScreen: PropTypes.element,
    synapseId: PropTypes.string,
    unitDescription: PropTypes.string
  }

  constructor(props: StackedBarChartProps & QueryWrapperChildProps) {
    super(props)
    this.handleHover = this.handleHover.bind(this)
    this.handleExit = this.handleExit.bind(this)
    this.handleClick = this.handleClick.bind(this)
    this.handleArrowClick = this.handleArrowClick.bind(this)
    this.getTextForChartSelection = this.getTextForChartSelection.bind(this)
    this.onMeasureResize = this.onMeasureResize.bind(this)
    this.rgba2rgb = this.rgba2rgb.bind(this)
    // the text currently under the cursor
    this.state = {
      // the dimensions of the bar chart itself
      dimensions: { bounds: { height: 1, width: 1, top: 0, left: 0, right: 0, bottom: 0 } },
      // the text of the current slice
      chartSelectionFacetValue: '',
      // the count of this facet value occurence
      facetValueOccurence: 0,
      chartSelectionIndex: -1,
      selectedFacets: {}
    }
    this.extractPropsData = this.extractPropsData.bind(this)
  }

  public componentDidUpdate(prevProps: any) {
    if (prevProps.filter !== this.props.filter || prevProps.isLoadingNewData !== this.props.isLoadingNewData) {
      this.setState({
        chartSelectionFacetValue: '',
        facetValueOccurence: 0,
        chartSelectionIndex: -1
      })
    }
  }

  /**
   * Updates the hover text and update the view
   *
   * @memberof StackedBarChart
   */
  public handleHover(event: React.MouseEvent<SVGRectElement>) {
    // add box shadow
    event.currentTarget.style.boxShadow = '25px 20px'
  }

  /**
   * Update the hover text and the view
   *
   * @param {*} event
   * @memberof StackedBarChart
   */
  public handleExit(event: React.MouseEvent<SVGRectElement>) {
    // remove box shadow
    event.currentTarget.style.boxShadow = ''
  }

  /**
   * Handle column click event
   */
  public handleClick = (dict: Info) => (_event: React.MouseEvent<SVGElement>) => {
    // https://medium.freecodecamp.org/reactjs-pass-parameters-to-event-handlers-ca1f5c422b9
    this.setState({
      chartSelectionFacetValue: dict.value,
      facetValueOccurence: dict.count,
      chartSelectionIndex: dict.index
    })
  }

  public handleArrowClick = (direction: string) => (_event: React.MouseEvent) => {
    let { chartSelectionIndex } = this.state
    if (chartSelectionIndex === -1) {
      chartSelectionIndex = 0
    }
    let dict: any = this.extractPropsData(this.props.data)
    const length = Object.keys(dict).length
    if (direction === PREVIOUS_ITEM_CLICK) {
      chartSelectionIndex -= 1
      // if its at zero then we want to wrap around to the end
      chartSelectionIndex = chartSelectionIndex < 0 ? length - 1 : chartSelectionIndex
    } else {
      chartSelectionIndex += 1
    }
    chartSelectionIndex = chartSelectionIndex % length

    dict = dict[chartSelectionIndex]
    this.setState({
      chartSelectionIndex,
      chartSelectionFacetValue: dict.value,
      facetValueOccurence: dict.count
    })
  }

  public getTextForChartSelection(xData: any) {
    const { chartSelectionIndex, chartSelectionFacetValue } = this.state
    const { facetAliases = {}, filter } = this.props
    const facetValueDisplay = chartSelectionIndex === -1 ? (xData[0] && xData[0].value) : chartSelectionFacetValue
    const filterDisplay = facetAliases[filter!] || filter
    return (
      <span>
        <span className="SRC-text-title SRC-filter-display">
          {filterDisplay}
        </span> :
        <span className="SRC-facet-view SRC-text-title">
          {' '}
          {facetValueDisplay === 'org.sagebionetworks.UNDEFINED_NULL_NOTSET' ? 'unannotated' : facetValueDisplay}
        </span>
      </span>
    )
  }

  public getFileCount(xData: any) {
    if (this.state.chartSelectionIndex === -1) {
      const hoverTextCount = xData[0] && xData[0].count
      return hoverTextCount
    }
    return this.state.facetValueOccurence
  }

  public rgba2rgb(background: number[], color: number[]) {
    const alpha = color[3]
    return [
      Math.floor((1 - alpha) * background[0] + alpha * color[0] + 0.5),
      Math.floor((1 - alpha) * background[1] + alpha * color[1] + 0.5),
      Math.floor((1 - alpha) * background[2] + alpha * color[2] + 0.5)
    ]
  }

  public render() {
    const {
      data,
      isLoadingNewData,
      loadingScreen,
      rgbIndex,
      isChecked,
      filter,
      unitDescription
    } = this.props
    // while loading
    if (isLoadingNewData) {
      return loadingScreen || <div/>
    }
    const xData = this.extractPropsData(data)
    let total: number = 0
    const width: number = this.state.dimensions.bounds!.width
    // sum up the counts of data
    for (const key in xData) {
      if (xData.hasOwnProperty(key)) {
        total += xData[key].count
      }
    }
    const { colorPalette, textColors } = getColorPallette(rgbIndex!, xData.length)
    const originalColor = colorPalette[0]
    return (
      <div className="container-fluid">
        <div className="row SRC-center-text">
          <button
            className="btn btn-default btn-sm SRC-floatRight"
            onClick={this.handleArrowClick(NEXT_CLICK)}
          >
            <FontAwesomeIcon
              style={{ fontSize: '11px' }}
              className="SRC-primary-text-color"
              icon="angle-right"
            />
          </button>
          <button
            className="btn btn-default btn-sm SRC-floatRight"
            onClick={this.handleArrowClick(PREVIOUS_ITEM_CLICK)}
          >
            <FontAwesomeIcon
              style={{ fontSize: '11px' }}
              className="SRC-primary-text-color"
              icon="angle-left"
            />
          </button>
        </div>
        {/* TODO: Refactor the chart into its own component */}
        <div className="row SRC-bar-border SRC-bar-marginTop SRC-bar-border-top">
          <ReactMeasure
            bounds={true}
            // tslint:disable-next-line
            onResize={(contentRect: any) => {
              this.setState({ dimensions: contentRect })
            }}
          >
            {({ measureRef }) => (
              <div className="SRC-flex" ref={measureRef}>
                {xData.map((obj, index) => {
                  const initRender: boolean = this.state.chartSelectionIndex === -1 && index === 0
                  const textColor: string = textColors[index]
                  const rgbColor: string = colorPalette[index]
                  let rectStyle: any
                  const check = isChecked![index] === undefined || isChecked![index]
                  if (check) {
                    rectStyle = {
                      fill: rgbColor
                    }
                  } else {
                    rectStyle = {
                      fill: '#C4C4C4'
                    }
                  }
                  const svgHeight = 80
                  const svgWidth = obj.count / total * width
                  const style: any = {}
                  if (this.state.chartSelectionIndex === index || initRender) {
                    style.filter = 'drop-shadow(5px 5px 5px rgba(0,0,0,0.5))'
                  }
                  const label: string = `${filter}: ${obj.value}  - ${obj.count} ${unitDescription}`
                  // there was one bug where a new line character was in the obj.value, making data-for
                  // break because its a special character, below we remove that
                  const tooltipId = obj.value.replace(/(\r\n|\n|\r)/gm, '')
                  // basic heuristic to calculate the number of pixels needed to show the value on the bar chart
                  const value = obj.count as number
                  const numCharsInValue = value.toString().length * 4.5 // represents width of a character

                  return (
                    // each svg represents one of the bars
                    // will need to change this to be responsive
                    <React.Fragment key={label}>
                      <span data-for={tooltipId} data-tip={label}>
                        <svg
                          className="SRC-hoverBox"
                          height={svgHeight + 15}
                          width={svgWidth}
                          style={style}
                          onClick={this.handleClick({ ...obj, index })}
                        >
                          <rect
                            onMouseEnter={this.handleHover}
                            onMouseLeave={this.handleExit}
                            height={svgHeight}
                            width={svgWidth}
                            className="SRC-chart-rect-style"
                            // can't remove inline style due to dynamic fill
                            style={rectStyle}
                          />
                          {/* tslint:disable-next-line */}
                          {index < 3 && svgWidth > numCharsInValue &&
                            <text
                              textAnchor="middle"
                              className="SRC-text-title"
                              fontFamily={'bold sans-serif'}
                              fill={textColor}
                              x={'50%'}
                              y={'50%'}
                            >
                              {obj.count}
                            </text>}
                          {
                            (this.state.chartSelectionIndex === index || initRender) &&
                              (
                                <text
                                  fill={originalColor}
                                  x={0}
                                  y={svgHeight + 15}
                                  className="SRC-text-shadow SRC-text-large"
                                >
                                  {'\u25BE'}
                                </text>
                              )
                          }
                        </svg>
                      </span>
                      <ReactTooltip delayShow={1000} id={tooltipId} />
                    </React.Fragment>)
                })}
              </div>)}
          </ReactMeasure>
        </div>
        <div className="row SRC-bar-border SRC-bar-border-bottom">
          <p className="SRC-noMargin SRC-padding-chart SRC-text-title">
            <strong>{this.getTextForChartSelection(xData)}</strong>
          </p>
          <p id="fileCount" className="SRC-noMargin SRC-padding-chart SRC-text-chart">
            {this.getFileCount(xData)} {unitDescription}
          </p>
        </div>
      </div>
    )
  }
  public extractPropsData(data: any) {
    const xData: any[] = []
    const { filter } = this.props
    // pull out the data corresponding to the filter in question
    data.facets.forEach(
      (item: any) => {
        if (item.facetType === 'enumeration' && item.columnName === filter) {
          item.facetValues.forEach(
            (facetValue: any) => {
              if (item.columnName) {
                xData.push({ columnName: item.columnName, ...facetValue })
              }
            }
          )
        }
      }
    )
    // sort the data so that the largest bars are at the front
    xData.sort((a, b) => {
      return b.count - a.count
    })
    return xData
  }

  public onMeasureResize(contentRect: any) {
    this.setState({ dimensions: contentRect })
  }
}