import * as React from 'react'
import { Dropdown } from 'react-bootstrap'
import { ElementWithTooltip } from '../../widgets/ElementWithTooltip'
import { SelectColumn } from '../../../utils/synapseTypes/'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import ColumnsSvg from '../../../assets/icons/columns'
import ColumnsDarkThemeSvg from '../../../assets/icons/columnsDarkTheme'
import { unCamelCase } from '../../../utils/functions/unCamelCase'
import { useState } from 'react'

type ColumnSelectionProps = {
  headers?: SelectColumn[]
  isColumnSelected: string[]
  /* 
      The dropdown state is held in SynapseTable because the EllipsisDropdown has
      an option to open the dropdown, 'show columns'
    */
  show: boolean
  toggleColumnSelection: (name: string) => void
  darkTheme?: boolean
}

const tooltipColumnSelectionId = 'addAndRemoveColumns'

export const ColumnSelection: React.FunctionComponent<ColumnSelectionProps> = (
  props: ColumnSelectionProps,
) => {
  const { headers, isColumnSelected, toggleColumnSelection, darkTheme } = props

  const [show, setShow] = useState(false)
  const onDropdownClick = (
    _show: boolean,
    _event: React.SyntheticEvent<Dropdown<'div'>, Event>,
    metadata: any,
  ) => {
    // Any click event for the Dropdown will close the dropdown (assuming its open), so we have
    // to handle the onToggle event and manually manage the dropdown open state. If metadata
    // is defined the event occuring is inside the dropdown which we then want to keep open, otherwise
    // we close it.
    if (metadata.source) {
      setShow(true)
    } else {
      setShow(false)
    }
  }
  return (
    <Dropdown
      as="span"
      onToggle={(show: boolean, event: any, metadata: any) =>
        onDropdownClick(show, event, metadata)
      }
      show={show}
    >
      <ElementWithTooltip
        idForToolTip={tooltipColumnSelectionId}
        tooltipText={'Add / Remove Columns'}
        image={{
          svgImg: darkTheme ? ColumnsDarkThemeSvg : ColumnsSvg,
          altText: 'columns selection',
        }}
        darkTheme={darkTheme}
      ></ElementWithTooltip>

      {/* There's a known issue if the number of dropdown items is very large, ~30+, the dropdown
          will unexpectedly render with the list going upwards instead of downwards.
        */}
      <Dropdown.Menu
        className="SRC-primary-color-hover-dropdown"
        alignRight={true}
      >
        {headers?.map((header, index) => {
          const { name } = header
          const isCurrentColumnSelected = isColumnSelected.includes(name)
          const iconStyle: React.CSSProperties = {
            width: '11px',
            marginRight: '10px',
            visibility: isCurrentColumnSelected ? undefined : 'hidden',
          }
          const maybeShowPrimaryColor = isCurrentColumnSelected
            ? 'SRC-primary-text-color'
            : ''
          return (
            <Dropdown.Item
              // @ts-ignore
              onClick={() => toggleColumnSelection(name)}
              key={name}
            >
              <FontAwesomeIcon
                style={iconStyle}
                className={maybeShowPrimaryColor}
                icon="check"
              />
              {unCamelCase(name)}
            </Dropdown.Item>
          )
        })}
      </Dropdown.Menu>
    </Dropdown>
  )
}
