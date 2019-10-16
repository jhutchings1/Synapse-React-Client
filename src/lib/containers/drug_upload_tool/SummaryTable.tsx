import * as React from 'react'

import { UiSchema } from 'react-jsonschema-form'
import { SummaryFormat, Step, FormSchema } from './types'
import _ from 'lodash'

export interface SummaryTableProps {
  isWizard?: boolean
  formData: any
  callbackFn?: Function
  steps: Step[]
  schema: FormSchema
  uiSchema: UiSchema
}


function findLabel(key: string, schema: any, uiSchema: UiSchema): string {
  const regex1 = /\[\d+\]\./g
  const regex3 = /\.(\d)+/g

  key = key.replace(regex3, '[$1]')

  const propArr = key.split('.')
  // some things require labels in schema (e.g. checkboxes) so this is preferred
  const labelFromSchema = `${propArr.join('.properties.')}.title`
  //can be overriden by label in UI
  const labelFromUi = `${key}.ui:title`
  //for array fields we need to change the property e.g.
  //  ld50.experiments[0].species_other should look like 'ld50.experiments.items.species_other'
  let arrayLabelFromSchema = labelFromSchema.replace(regex1, '.items.')
  let arrayLabelFromUiSchema = labelFromUi.replace(regex1, '.items.')
  const indexMatch = labelFromSchema.match(regex1)
  let index = _.first(indexMatch)

  if (index) {
    index = index.substring(1, index.length - 2)
    index = !isNaN(parseInt(index)) ? parseInt(index) + 1 + '' : ''
  }

  let label =
    _.get(uiSchema, labelFromUi) ||
    _.get(schema.properties, labelFromSchema) ||
    _.get(uiSchema, arrayLabelFromUiSchema) ||
    _.get(schema.properties, arrayLabelFromSchema) ||
    `${ arrayLabelFromSchema}`
  return `${index ? '[' + index + '] ' : ''}${label}`
}

export function getFlatData(
  formData: any,
  steps: Step[],
  schema: FormSchema,
  uiSchema: UiSchema,
): SummaryFormat[] {
  //takes nested json and converts it into flattened item list

  function flatten(
    object: any,
    flattenedObject: any,
    prefix: string,
  ): string[] {
    const separator = '.'
    Object.keys(object).forEach(key => {
      if (object[key] === null) {
        flattenedObject[prefix + key] = ''
      } else if (
        //if the value is a proper array
        _.isArray(object[key]) &&
        !_.isString(object[key]) 
      ) {
        for (let i in object[key]) {
          if (
            _.isArray(object[key][i]) ||
            (_.isObject(object[key]) && !_.isString(object[key][i]))
          ) {
            flatten(
              object[key][i],
              flattenedObject,
              `${prefix}${key}[${i}]${separator}`,
            )
          } else {
            let prevVal = flattenedObject[`${prefix}${key}`]
            prevVal = prevVal ? prevVal + ', ' : ''
            flattenedObject[`${prefix}${key}`] = prevVal + object[key][i]
          }
        }
      } else if (_.isObject(object[key]) && !_.isDate(object[key])) {
        flatten(object[key], flattenedObject, `${prefix}${key}${separator}`)
      } else {
        flattenedObject[prefix + key] = object[key]
      }
    })
    return flattenedObject
  }

  const flatData = flatten(_.cloneDeep(formData), [], '')
  const flatFormData = _.keys(flatData)
    .map(key => {
      let val = flatData[key]
      if (flatData[key] === false) {
        val = 'false'
      }
      if (flatData[key] === true) {
        val = 'true'
      }
      const boundary = key.indexOf('.')
      return {
        screen: _.find(steps, { id: key.substring(0, boundary) }),
        label: findLabel(key, schema, uiSchema),
        value: val,
      }
    })
    .filter(item => item.label !== 'included') //included is the property we generate to help with validation of optional forms

  const result = flatFormData
    .filter(item => item.screen && typeof item.value !== 'undefined')
    .map(item => {
      return {
        label: item.label,
        value: item.value,
        screen: item.screen!,
      }
    })
    .sort((a, b) => a.screen.order - b.screen.order)

  return result
}

export default function SummaryTable(props: SummaryTableProps): JSX.Element {
  let flatFormData: SummaryFormat[] = []

  flatFormData = getFlatData(
    _.cloneDeep(props.formData),
    props.steps,
    props.schema,
    props.uiSchema,
  )

  let prevScreenId = ''
  const table = (
    <>
      <table className="table summary-table-header">
        <thead>
          <tr>
            <th>Step</th>
            <th>Label</th>
            <th>Value</th>
          </tr>
        </thead>
      </table>

      <div className="scroll-area table-body">
        <table className="table summary-table">
          <tbody>
            {flatFormData.map((line: SummaryFormat, i: number) => {
              return (
                <tr key={i + line.screen.id + line.label}>
                  <td>
                    {prevScreenId !== line.screen.id &&
                      (prevScreenId = line.screen.id) && (
                        <span>{line.screen.title}</span>
                      )}
                  </td>
                  <td>{line.label}</td>
                  
                  <td>{line.value}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )

  return (
    <>
      <h4> Your Data </h4>
      <div className="panel panel-default padding-full wrap">
        <div className="summary scroll-area">{table}</div>
      </div>
    </>
  )
}
