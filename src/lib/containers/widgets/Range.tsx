import React, { useState } from 'react'
import moment from 'moment'

type ControlType = 'number' | 'date'

export type RangeValues = {
  min?: string
  max?: string
}

export type RangeProps = {
  type: ControlType
  initialValues?: RangeValues
  className?: string
  errorText?: string
  onChange: Function
}

export const Range: React.FunctionComponent<RangeProps> = (
  props: RangeProps,
) => {
  const errorText = 'Min value should be less then max value'
  const [error, setError] = useState(false)
  const [values, setValues] = useState(() =>
    props.type === 'number' && props.initialValues
      ? props.initialValues
      : (props.initialValues && {
          min: moment(props.initialValues.min).format('YYYY-MM-DD'),
          max: moment(props.initialValues.max).format('YYYY-MM-DD'),
        }) || {
          min: undefined,
          max: undefined,
        },
  )

  const className = props.className ? `range ${props.className}` : `range`

  const isValid = (
    { min, max }: RangeValues,

    type: ControlType = 'number',
  ) => {
    if (
      min === null ||
      min === undefined ||
      max === null ||
      max === undefined
    ) {
      setError(false)
      return true
    }

    if (type === 'number') {
      if (Number(min) > Number(max)) {
        setError(true)
        return false
      }
    }
    if (Date.parse(min) > Date.parse(max)) {
      setError(true)
      return false
    }
    setError(false)
    return true
  }

  const handleAppyChanges = (
    values: RangeValues,
    callBackFn: Function,
    type: ControlType = 'number',
  ) => {
    if (isValid(values, type)) {
      callBackFn(values)
    }
  }

  return (
    <div className={className} style={{ display: 'flex', flexWrap: 'wrap' }}>
      <div style={{ marginRight: '10px' }}>
        <input
          key="range_min"
          type={props.type}
          value={values.min}
          onChange={({ target }: React.ChangeEvent<HTMLInputElement>) =>
            setValues({ min: target.value, max: values.max })
          }
        />
        <div>to</div>
        <input
          key="range_max"
          type={props.type}
          value={values.max}
          onChange={({ target }: React.ChangeEvent<HTMLInputElement>) =>
            setValues({ min: values.min, max: target.value })
          }
        />
      </div>
      <button
        className="btn btn-link SRC-noPadding"
        onClick={() => handleAppyChanges(values, props.onChange, props.type)}
      >
        Apply
      </button>
      {error && (
        <div className="SRC-danger-color">{props.errorText || errorText}</div>
      )}
    </div>
  )
}
