import * as React from 'react'
import FacetNavPanel from './FacetNavPanel'
import { applyChangesToValuesColumn } from '../query-filter/QueryFilter'
import { QueryWrapperChildProps } from '../../QueryWrapper'
import {
  FacetColumnResultValues,
  FacetColumnResultValueCount,
  FacetColumnRequest,
  FacetColumnResult,
  QueryResultBundle,
} from '../../../utils/synapseTypes'
import { useState, useEffect } from 'react'
import * as _ from 'lodash'

export type FacetNavOwnProps = {
  applyChanges: Function
  loadingScreen?: React.FunctionComponent | JSX.Element
  facetsToPlot?: string[] | undefined
}

type UiFacetState = {
  name: string
  isHidden: boolean
  isExpanded: boolean
  index?: number
}

type ExpandedFacet = {
  facet: FacetColumnResult
  index: number
}

type FacetNavProps = FacetNavOwnProps & QueryWrapperChildProps

type ShowMoreState = 'MORE' | 'LESS' | 'NONE'

const FacetNav: React.FunctionComponent<FacetNavProps> = ({
  data,
  getLastQueryRequest,
  isLoadingNewData,
  loadingScreen,
  isLoading,
  executeQueryRequest,
  asyncJobStatus,
  facetsToPlot,
}: FacetNavProps): JSX.Element => {
  const [facetUiStateArray, setFacetUiStateArray] = useState<UiFacetState[]>([])
  const [expandedFacets, setExpandedFacets] = useState<ExpandedFacet[]>([])
  const [isFirstTime, setIsFirstTime] = useState(true)

  const request = getLastQueryRequest!()
  const getFacets = (data: QueryResultBundle | undefined): FacetColumnResult[] =>  {
    const result = data?.facets?.filter(
      item =>
        item.facetType === 'enumeration' &&
        (!facetsToPlot?.length || facetsToPlot.indexOf(item.columnName) > -1)
    )
    if (!result) {
      return []
    } else {
      return result
    }

  }

  useEffect(() => {
    let result = data?.facets?.filter(
      item =>
        item.facetType === 'enumeration' &&
        (!facetsToPlot?.length || facetsToPlot.indexOf(item.columnName) > -1),
    )
    if (!result) {
      console.log('no data')
      return
    }
    if (isFirstTime) {
      setFacetUiStateArray(
        result.map((item, index) => ({
          name: item.columnName,
          isHidden: index < 4 ? false : true,
          isExpanded: false,
        })),
      )
      setIsFirstTime(false)
    }
  }, [data])

  // when 'show more/less' is clicked
  const showMore = (shouldShowMore: boolean) => {
    if (shouldShowMore) {
      setFacetUiStateArray(facetUiStateArray =>
        facetUiStateArray.map(item => {
          return { ...item, isHidden: false }
        }),
      )
    } else {
      setFacetUiStateArray(facetUiStateArray =>
        facetUiStateArray.map((item, index) =>
          index >= 4 ? { ...item, isHidden: true } : { ...item },
        ),
      )
    }
  }

  // what needs to happen after the filters are adjusted from the plot
  const applyChangesFromQueryFilter = (facets: FacetColumnRequest[]) => {
    request.query.selectedFacets = facets
    executeQueryRequest!(request)
  }

  // don't show expanded or hidden facets
  const isFacetHiddenInGrid = (columnName: string) => {
    const itemHidden = facetUiStateArray.find(
      item =>
        item.name === columnName &&
        (item.isHidden === true || item.isExpanded === true),
    )
    const result = itemHidden !== undefined
    return result
  }

  const getShowMoreState = (): ShowMoreState => {
    if (facetUiStateArray.length <= 4) {
      return 'NONE'
    }
    if (
      facetUiStateArray.find(item => item.isHidden === true) ||
      getFacets(data).length < facetUiStateArray.length
    ) {
      return 'MORE'
    }
    return 'LESS'
  }

  // hides expanded facet under 'show more'
  const hideExpandedFacet = (facet: FacetColumnResult, index: number) => {
    setFacetUiStateArray(facetUiStateArray =>
      facetUiStateArray.map(item =>
        item.name === facet.columnName
          ? { ...item, isExpanded: false, isHidden: true }
          : item,
      ),
    )
    setExpandedFacets(expandedFacets =>
      expandedFacets.filter(item => item.facet.columnName != facet.columnName),
    )
  }

  //expands to collapses a facet
  const toggleExpandFacet = (
    facet: FacetColumnResult,
    index: number,
    doExpand: boolean,
  ) => {
    setUiPropertyForFacet(facet.columnName, 'isExpanded', doExpand)
    if (doExpand) {
      setExpandedFacets([...expandedFacets, { facet, index }])
    } else {
      setExpandedFacets(
        expandedFacets.filter(
          item => item.facet.columnName != facet.columnName,
        ),
      )
    }
  }

  // hides facet graph
  const hideFacetInGrid = (columnName: string) => {
    setUiPropertyForFacet(columnName, 'isHidden', true)
  }

  const setUiPropertyForFacet = (
    columnName: string,
    propName: 'isHidden' | 'isExpanded',
    value: boolean,
  ) => {

    setFacetUiStateArray(facetUiStateArray =>
      facetUiStateArray.map(item =>
        item.name === columnName ? { ...item, [propName]: value } : item,
      ),
    )
  }

  if (isLoadingNewData || !data) {
    return (
      <div className="SRC-loadingContainer SRC-centerContentColumn">
        {loadingScreen}
        {asyncJobStatus?.progressMessage && <div>{asyncJobStatus.progressMessage} </div>}
      </div>
    )
  } else {
    return (
      <div className="FacetNav">
        <div className="FacetNav__expanded">
          {expandedFacets.map(item => (
            <div key={`facetPanel_${item.index}`}>
              <FacetNavPanel
                index={item.index}
                data={data}
                onHide={() => hideExpandedFacet(item.facet, item.index)}
                onCollapse={() =>
                  toggleExpandFacet(item.facet, item.index, false)
                }
                facetToPlot={item.facet as FacetColumnResultValues}
                applyChanges={(
                  facet: FacetColumnResultValues,
                  value: FacetColumnResultValueCount,
                ) =>
                  applyChangesToValuesColumn(
                    request,
                    facet,
                    applyChangesFromQueryFilter,
                    value.value,
                    !value.isSelected,
                  )
                }
              ></FacetNavPanel>
            </div>
          ))}
        </div>
        <div className="FacetNav__row">
          {getFacets(data).map((item, index) => (
            <div
              className="col-sm-12 col-md-6"
              style={{
                display: isFacetHiddenInGrid(item.columnName) ? 'none' : 'block',
              }}
              key={`facetPanel_${index}`}
            >
              <FacetNavPanel
              isLoading={isLoading}
                index={index}
                data={data}
                onHide={() => hideFacetInGrid(item.columnName)}
                onExpand={() => toggleExpandFacet(item, index, true)}
                facetToPlot={item as FacetColumnResultValues}
                applyChanges={(
                  facet: FacetColumnResultValues,
                  value: FacetColumnResultValueCount | undefined,
                  isSelected: boolean
                ) =>
                  applyChangesToValuesColumn(
                    request,
                    facet,
                    applyChangesFromQueryFilter,
                    value?.value,
                    isSelected,
                  )
                }
              ></FacetNavPanel>
            </div>
          ))}
        </div>
        <div>
          {getShowMoreState() !== 'NONE' && (
            <button
              className="btn btn-primary FacetNav__showMore"
              onClick={() => showMore(getShowMoreState() === 'MORE')}
            >
              {getShowMoreState() === 'LESS' ? 'Show Less' : 'Show More'}
            </button>
          )}
        </div>
      </div>
    )
  }
}

export default FacetNav